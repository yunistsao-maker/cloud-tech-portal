import { App, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { GithubDeployStack } from "../lib/github-deploy-stack";
import { bedrockResources, PortalStack } from "../lib/portal-stack";

describe("GithubDeployStack", () => {
  const env = { account: "111122223333", region: "ap-northeast-1" };
  const make = (existingOidcProviderArn?: string) =>
    Template.fromStack(new GithubDeployStack(new App(), "Gh", { env, repo: "owner/repo", environment: "production", existingOidcProviderArn }));

  it("trusts only the production environment of the one repo", () => {
    const t = make();
    t.resourceCountIs("AWS::IAM::OIDCProvider", 1);
    t.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                "token.actions.githubusercontent.com:sub": "repo:owner/repo:environment:production",
              },
            },
          }),
        ],
      },
    });
  });

  it("can only assume the CDK bootstrap roles", () => {
    const t = make();
    const policies = Object.values(t.findResources("AWS::IAM::Policy"));
    const stmts = policies.flatMap((p) => (p as { Properties: { PolicyDocument: { Statement: { Action: string[]; Resource: unknown }[] } } }).Properties.PolicyDocument.Statement);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]!.Action).toEqual(["sts:AssumeRole", "sts:TagSession"]);
    const res = JSON.stringify(stmts[0]!.Resource);
    expect(res).toContain(":iam::111122223333:role/cdk-hnb659fds-deploy-role-111122223333-ap-northeast-1");
    expect(res).not.toContain("*");
  });

  it("matches immutable subjects when given the subject repo", () => {
    const t = Template.fromStack(
      new GithubDeployStack(new App(), "Gh", { env, repo: "owner/repo", subjectRepo: "owner@1/repo@2", environment: "production" }),
    );
    t.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Condition: { StringEquals: Match.objectLike({ "token.actions.githubusercontent.com:sub": "repo:owner@1/repo@2:environment:production" }) },
          }),
        ],
      },
    });
  });

  it("reuses an existing OIDC provider when given one", () => {
    make("arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com").resourceCountIs("AWS::IAM::OIDCProvider", 0);
  });
});

const synth = () => {
  const app = new App();
  const stack = new PortalStack(app, "Test", {
    env: { account: "111122223333", region: "ap-northeast-1" },
    modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    ingestRate: "2 hours",
    maxSummaries: 40,
    runIngestOnDeploy: false,
    siteDir: "/nonexistent",
  });
  return Template.fromStack(stack);
};

describe("PortalStack", () => {
  const t = synth();

  it("keeps the items table and data bucket on stack deletion", () => {
    t.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Retain" });
    t.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: [Match.objectLike({ IndexName: "byPublished" })],
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
    t.hasResource("AWS::S3::Bucket", { DeletionPolicy: "Retain", Properties: Match.objectLike({ VersioningConfiguration: { Status: "Enabled" } }) });
  });

  it("serves the site and /data/* through CloudFront with OAC only", () => {
    t.resourceCountIs("AWS::CloudFront::OriginAccessControl", 2);
    t.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: [Match.objectLike({ PathPattern: "data/*", ViewerProtocolPolicy: "redirect-to-https" })],
      }),
    });
    t.allResourcesProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    });
  });

  it("runs the ingester on a schedule, one at a time, with its config", () => {
    t.hasResourceProperties("AWS::Events::Rule", { ScheduleExpression: "rate(2 hours)" });
    t.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Architectures: ["arm64"],
      ReservedConcurrentExecutions: 1,
      Environment: { Variables: Match.objectLike({ MODEL_ID: "global.anthropic.claude-haiku-4-5-20251001-v1:0", MAX_SUMMARIES: "40" }) },
    });
  });

  it("scopes Bedrock access to the configured model", () => {
    const statements = Object.values(t.findResources("AWS::IAM::Policy")).flatMap(
      (p) => (p as { Properties: { PolicyDocument: { Statement: { Action: unknown; Resource: unknown }[] } } }).Properties.PolicyDocument.Statement,
    );
    const bedrock = statements.filter((s) => JSON.stringify(s.Action).includes("bedrock:"));
    expect(bedrock).toHaveLength(1);
    // ARNs are Fn::Join with the partition token; check the literal parts.
    const res = JSON.stringify(bedrock[0]!.Resource);
    expect(res).toContain("inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0");
    expect(res).toContain(":bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0");
    expect(res).not.toContain("foundation-model/*");
  });
});

describe("bedrockResources", () => {
  const stack = new Stack(new App(), "S", { env: { account: "111122223333", region: "us-east-1" } });
  it("uses a single foundation-model ARN for an in-region model id", () => {
    const res = bedrockResources(stack, "anthropic.claude-haiku-4-5-20251001-v1:0");
    expect(res).toHaveLength(1);
    expect(res[0]).toMatch(/:bedrock:us-east-1::foundation-model\/anthropic\.claude-haiku-4-5-20251001-v1:0$/);
  });
  it("adds the profile and any-region base model for a cross-region profile", () => {
    const [profile, base] = bedrockResources(stack, "apac.anthropic.claude-haiku-4-5-20251001-v1:0");
    expect(profile).toMatch(/:bedrock:us-east-1:111122223333:inference-profile\/apac\.anthropic/);
    expect(base).toMatch(/:bedrock:\*::foundation-model\/anthropic\.claude-haiku/);
  });
});
