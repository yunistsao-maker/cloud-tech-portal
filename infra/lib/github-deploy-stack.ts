import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

const GITHUB_OIDC_URL = "https://token.actions.githubusercontent.com";

export interface GithubDeployStackProps extends StackProps {
  /** "owner/repo" allowed to deploy. */
  repo: string;
  /**
   * GitHub environment the deploy job runs in. A job with an environment gets
   * an OIDC `sub` of `repo:<repo>:environment:<name>` (not the branch ref), so
   * the trust policy keys on it. Restrict which branches may use it in
   * Settings → Environments → deployment branches.
   */
  environment: string;
  /**
   * The account's existing GitHub OIDC provider. An account can hold only one
   * provider per URL, so pass this when another project already created it.
   */
  existingOidcProviderArn?: string;
  /** CDK bootstrap qualifier; "hnb659fds" unless you bootstrapped with --qualifier. */
  cdkQualifier?: string;
}

/**
 * Deployed once by hand. Gives GitHub Actions jobs in one environment of one repo a role
 * that can do nothing except assume the CDK bootstrap roles in this account and
 * region — the same path `cdk deploy` uses from a laptop. No access keys exist.
 */
export class GithubDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubDeployStackProps) {
    super(scope, id, props);
    const qualifier = props.cdkQualifier ?? "hnb659fds";

    const provider = props.existingOidcProviderArn
      ? iam.OidcProviderNative.fromOidcProviderArn(this, "GithubOidc", props.existingOidcProviderArn)
      : new iam.OidcProviderNative(this, "GithubOidc", { url: GITHUB_OIDC_URL, clientIds: ["sts.amazonaws.com"] });

    const role = new iam.Role(this, "DeployRole", {
      description: `GitHub Actions deploy for ${props.repo} (${props.environment})`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": `repo:${props.repo}:environment:${props.environment}`,
        },
      }),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole", "sts:TagSession"],
        resources: ["deploy", "file-publishing", "image-publishing", "lookup"].map(
          (kind) => `arn:${this.partition}:iam::${this.account}:role/cdk-${qualifier}-${kind}-role-${this.account}-${this.region}`,
        ),
      }),
    );

    new CfnOutput(this, "DeployRoleArn", {
      value: role.roleArn,
      description: "Set as the AWS_DEPLOY_ROLE_ARN repository variable in GitHub",
    });
  }
}
