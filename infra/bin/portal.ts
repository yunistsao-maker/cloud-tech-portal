import { App } from "aws-cdk-lib";
import { PortalStack } from "../lib/portal-stack";

const app = new App();
const ctx = (k: string) => app.node.tryGetContext(k);

new PortalStack(app, "CloudTechPortal", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  modelId: String(ctx("modelId")),
  ingestRate: String(ctx("ingestRate")),
  maxSummaries: Number(ctx("maxSummaries")),
  runIngestOnDeploy: ctx("runIngestOnDeploy") !== false && ctx("runIngestOnDeploy") !== "false",
  description: "cloud/pulse — cross-cloud tech portal (site, feed ingestion, Bedrock summaries)",
});
