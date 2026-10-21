import { App } from "aws-cdk-lib";
import { GithubDeployStack } from "../lib/github-deploy-stack";
import { PortalStack } from "../lib/portal-stack";

const app = new App();
const ctx = (k: string) => app.node.tryGetContext(k);
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

new PortalStack(app, "CloudTechPortal", {
  env,
  modelId: String(ctx("modelId")),
  ingestRate: String(ctx("ingestRate")),
  maxSummaries: Number(ctx("maxSummaries")),
  runIngestOnDeploy: ctx("runIngestOnDeploy") !== false && ctx("runIngestOnDeploy") !== "false",
  description: "cloud/pulse — cross-cloud tech portal (site, feed ingestion, Bedrock summaries)",
});

// One-time setup for automated deploys: `npx cdk deploy CloudTechPortalGithubDeploy`.
new GithubDeployStack(app, "CloudTechPortalGithubDeploy", {
  env,
  repo: String(ctx("githubRepo")),
  branch: String(ctx("githubBranch")),
  existingOidcProviderArn: ctx("githubOidcProviderArn") || undefined,
  description: "cloud/pulse — GitHub Actions OIDC deploy role",
});
