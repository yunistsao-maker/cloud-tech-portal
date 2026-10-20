import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { buildTagger, capabilities } from "@ctp/catalog";
import { fetchText, runIngest } from "./pipeline";
import { SOURCES } from "./sources";
import { DynamoStore } from "./store";
import { BedrockSummarizer } from "./summarize";

const s3 = new S3Client({});
const tagger = buildTagger(capabilities);

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Scheduled by EventBridge. Writes new items to DynamoDB and a snapshot the site reads. */
export async function handler(): Promise<{ newItems: number; summarised: number; failedSources: string[] }> {
  const report = await runIngest({
    sources: SOURCES,
    fetchText,
    store: new DynamoStore(env("TABLE_NAME")),
    tagger,
    summarizer: new BedrockSummarizer(env("MODEL_ID")),
    summariesEnabled: true,
    maxSummaries: Number(process.env.MAX_SUMMARIES ?? 40),
    log: (m) => console.warn(m),
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: env("DATA_BUCKET"),
      Key: "data/items.json",
      Body: JSON.stringify(report.snapshot),
      ContentType: "application/json",
      CacheControl: "public, max-age=300",
    }),
  );

  const failedSources = report.sources.filter((s) => s.error).map((s) => s.sourceId);
  console.log(
    JSON.stringify({
      msg: "ingest complete",
      newItems: report.newItems,
      summarised: report.summarised,
      summaryFailures: report.summaryFailures,
      deferred: report.deferred,
      sources: report.sources,
    }),
  );
  return { newItems: report.newItems, summarised: report.summarised, failedSources };
}
