/**
 * Run the pipeline on this machine and write a snapshot file the web app can read.
 *
 *   npm run ingest:local                         # fetch feeds, tag only, write apps/web/public/data/items.json
 *   npm run ingest:local -- --bedrock MODEL_ID   # also summarise with Bedrock (uses your AWS credentials)
 *   npm run ingest:local -- --out path.json --max 10
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildTagger, capabilities } from "@ctp/catalog";
import { fetchText, runIngest } from "./pipeline";
import { SOURCES } from "./sources";
import { FileStore } from "./store";
import { BedrockSummarizer, NoopSummarizer } from "./summarize";

const { values } = parseArgs({
  options: {
    out: { type: "string", default: resolve(import.meta.dirname, "../../../apps/web/public/data/items.json") },
    bedrock: { type: "string" },
    max: { type: "string", default: "20" },
    source: { type: "string", multiple: true },
  },
});

const sources = values.source?.length ? SOURCES.filter((s) => values.source!.includes(s.id)) : SOURCES;
const store = new FileStore(values.out!);
const report = await runIngest({
  sources,
  fetchText,
  store,
  tagger: buildTagger(capabilities),
  summarizer: values.bedrock ? new BedrockSummarizer(values.bedrock) : new NoopSummarizer(),
  summariesEnabled: !!values.bedrock,
  maxSummaries: Number(values.max),
  log: (m) => console.warn(m),
});
await store.save(report.snapshot);

console.table(report.sources);
console.log(
  `new: ${report.newItems}  summarised: ${report.summarised}  failed summaries: ${report.summaryFailures}  deferred: ${report.deferred}`,
);
console.log(`wrote ${report.snapshot.items.length} items → ${values.out}`);
