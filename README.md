# cloud/pulse — cross-cloud tech portal

AWS, Azure and Google Cloud announcements, engineering blogs and research in one feed, with every item tied to a **capability** so you can see the equivalent services on the other two clouds side by side.

- **Pulse** (`/`) — the latest items across clouds, filterable by provider, type and time.
- **Compare** (`/compare/`) — capability matrix per category; pick a row to see attribute rows, former names and recent changes.
- **Category hubs** (`/category/<id>/`) — capability cards plus that category's feed, renames/retirements and papers.
- Search resolves old names (`Vertex AI` → Gemini Enterprise Agent Platform, `Azure AD` → Microsoft Entra ID).
- Three themes (white / gray / storm cloud) and EN / 繁中 throughout.

## Architecture

```
EventBridge (rate 2h) ──▶ Lambda: ingest ──▶ DynamoDB  items (pk id, GSI byPublished)
                              │   fetch 9 feeds → parse → tag capability → Bedrock summary (EN + zh-TW)
                              └──▶ S3 data bucket  data/items.json  (latest 400)
                                            │
Browser ──▶ CloudFront ──┬── /*       → S3 site bucket (Next.js static export)
                         └── /data/*  → S3 data bucket
```

| Path | What it is |
| --- | --- |
| `packages/catalog` | Capability catalog (JSON per category), zod schema, search, keyword tagger. Shared by everything else. |
| `services/ingest` | Feed fetchers/parsers, classifier, Bedrock summariser, DynamoDB/file stores, Lambda handler, local CLI. |
| `apps/web` | Next.js 16 + Tailwind v4, static export. Reads `/data/items.json` in the browser. |
| `infra` | CDK stack: buckets, CloudFront (OAC), DynamoDB, ingest Lambda, schedule, alarm, first-run trigger. |

### Ingestion details

- **Sources** (`services/ingest/src/sources.ts`): AWS What's New, AWS News / ML / Architecture blogs, Azure Updates, Azure Blog, Google Cloud release notes, Google Cloud Blog, arXiv cs.DC. A failing feed is reported in the run log and skipped; it never fails the run.
- **Google Cloud release notes** publish one entry per day for every product; the parser splits it into one item per product.
- **arXiv** keeps only `new` papers that the tagger can place in a capability.
- **Tagging** is keyword-based from the catalog (service names, aliases, former names, capability keywords). Generic words like "Batch" or "Workflows" only count on their own provider's items. Bedrock then confirms or corrects the capability ids (restricted to catalog ids) and writes the summaries.
- **Cost guard**: at most `maxSummaries` (default 40) model calls per run; newer items beyond that wait for the next run. Items already in DynamoDB are never re-summarised. Reserved concurrency 1 keeps runs from overlapping.
- Feed text is passed to the model as fenced, untrusted data; replies are schema-validated and unknown capability ids dropped.

## Local development

Requires Node 22.

```bash
npm install
npm run ingest:local          # fetch live feeds, tag only → apps/web/public/data/items.json
npm run dev                   # http://localhost:3000
```

Add summaries locally with your own AWS credentials and Bedrock model access:

```bash
npm run ingest:local -- --bedrock global.anthropic.claude-haiku-4-5-20251001-v1:0 --max 10
```

Checks: `npm run typecheck`, `npm test`, `npm run build:web`, `npm run synth`.

## Deploy

```bash
export CDK_DEFAULT_ACCOUNT=<account> CDK_DEFAULT_REGION=<region with Bedrock access>
(cd infra && npx cdk bootstrap)   # once per account/region
npm run deploy                     # builds the site, then cdk deploy
```

The stack prints `SiteUrl`. With `runIngestOnDeploy` (default) the first ingest runs during the deploy so the site has data immediately.

Context settings (`infra/cdk.json`, or `-c key=value`):

| Key | Default | Notes |
| --- | --- | --- |
| `modelId` | `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Any Bedrock model or inference profile your account can invoke in the region. The IAM policy is scoped to this id. |
| `ingestRate` | `2 hours` | EventBridge `rate()` body. |
| `maxSummaries` | `40` | Bedrock calls per run. |
| `runIngestOnDeploy` | `true` | Invoke the ingester once during deploy. |

### Automated deploys (GitHub Actions + OIDC)

Every push to `main` runs the checks and, if they pass, deploys the `CloudTechPortal` stack. GitHub gets short-lived credentials through OIDC; no AWS keys are stored in GitHub.

One-time setup, from your machine with admin credentials for the target account and region:

```bash
npm run deploy:ci-role          # creates the OIDC provider + deploy role, prints DeployRoleArn
```

If the account already has a GitHub OIDC provider (another project created `token.actions.githubusercontent.com`), reuse it instead of creating a second one:

```bash
npm run deploy:ci-role -- -c githubOidcProviderArn=arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com
```

Then in GitHub → Settings → Secrets and variables → Actions → **Variables**, add:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | the `DeployRoleArn` output |
| `AWS_REGION` | the region you bootstrapped, e.g. `ap-northeast-1` |

or with the GitHub CLI: `gh variable set AWS_DEPLOY_ROLE_ARN -b <arn>` and `gh variable set AWS_REGION -b ap-northeast-1`.

Finally, in Settings → Environments → **production** (created by the first CI run on `main`, or create it now), set **Deployment branches and tags** to *Selected branches* → `main`. The role trusts the environment, not the branch, so this rule is what keeps other branches from deploying:

```bash
echo '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' \
  | gh api -X PUT repos/yunistsao-maker/cloud-tech-portal/environments/production --input -
gh api -X POST repos/yunistsao-maker/cloud-tech-portal/environments/production/deployment-branch-policies -f name=main
```

Until both variables exist the deploy job is skipped, so CI stays green. Re-run a deploy any time from Actions → ci → **Run workflow**. To require a manual approval before each deploy, add required reviewers to the `production` environment (Settings → Environments).

What the role can do: only `sts:AssumeRole` on this account's CDK bootstrap roles (`cdk-hnb659fds-*-role-<account>-<region>`), and only from jobs in the `production` environment of `yunistsao-maker/cloud-tech-portal` (OIDC `sub` = `repo:yunistsao-maker@253825534/cloud-tech-portal@1427218895:environment:production` — the repo uses GitHub's immutable subjects, which carry owner and repo IDs so a renamed or re-created repo can't match), which the environment's branch rule limits to `main`. CloudFormation changes run under the bootstrap deploy role, exactly as a local `cdk deploy` does. Change the repo or environment with the `githubRepo` / `githubSubjectRepo` / `githubEnvironment` context values (`githubSubjectRepo` is the `sub_claim_prefix` from `gh api repos/<owner>/<repo>/actions/oidc/customization/sub`, minus `repo:`; leave it empty if the repo doesn't use immutable subjects) and re-run `npm run deploy:ci-role`.

Retained on `cdk destroy`: the DynamoDB table (PITR on) and the versioned data bucket. The site bucket is rebuilt from source.

## Editing the catalog

Each category is one file in `packages/catalog/data/capabilities/`. A capability has bilingual names, keywords for the tagger, one or more services per provider (with `aliases` and `formerly`), and optional `attributes` rows for the Compare detail panel. Mark a value you have not confirmed against current docs with `"needsReview": true` — the UI flags it. `npm test` validates the schema, unique ids and that every capability names a service on all three clouds.

## Reports

Long-form surveys live under `/reports/`, each tagged with the categories and capabilities it covers, so it also appears on those category hubs and in the Compare detail panel.

A report is written in Claude Docs and imported as JSON:

1. Save the doc tab's XML (from the Claude Docs connector's `read` of the tab) to a file.
2. Write a small meta file: `slug`, `summary` (`en` + `zh`), `lang`, `categories`, `capabilities`, `sourceUrl`.
3. `cd apps/web && npx tsx scripts/import-doc.ts tab.xml meta.json > content/reports/<slug>.json`
4. Add the import to `lib/reports.ts`. If the doc has embedded diagrams, register a component for each embed id in `components/reports/ReportBody.tsx` (tests fail on an unregistered figure).

The page links back to the source doc, which stays the place to edit; re-run the import to refresh (set `updatedAt` in the meta file so the page shows the revision date). The importer prints a `warning:` line for any element it cannot render, so a new kind of block in the doc is never dropped silently — add support for it before publishing.

### Diagram decks

A deck is a diagram-first report: one diagram page and one deep-dive page per topic, read in order with the pager or ← → keys (or a swipe on phones). Diagrams show AWS, Azure or Google Cloud names from the cloud switch in the deck bar; the choice is a portal preference (`ctp.prefs`), so it sticks across pages. Decks share `/reports/` with reports and appear in the same index and side cards.

| Path | What it is |
| --- | --- |
| `/reports/<deck>/` | Cover: core idea and every topic's diagram as a card |
| `/reports/<deck>/<topic>/` | Diagram, with key services per cloud and a summary beside it |
| `/reports/<deck>/<topic>/deep-dive/` | Full explanation |
| `/reports/<deck>/checklist/` | Review checklist (ticks stay in the reader's browser) and references |

Content lives in `apps/web/content/decks/<slug>/`:

- `meta.json` — hand-edited listing fields (same as a report's), cover text and appendix intro.
- `source/` — the topics as Python (`topics_*.py`, diagrams drawn with the helpers in `lib.py`).
- `deck.json` — generated; do not edit. After changing a topic run `python3 source/export.py` (standard library only) and commit both.

The exporter scopes diagram ids per topic and rewrites links between topics to portal paths. Register a new deck in `lib/deck-metas.ts` and `lib/decks.ts`; the tests check catalog ids, anchors, links and that the injected markup has no scripts or event handlers. Styles are in `components/decks/deck.css`, scoped under `.deck` and driven by the sky theme.

## Known gaps (milestone 1)

- The Google Cloud Blog feed returned HTTP 500 from the build sandbox; check its row in the first Lambda run's log.
- The snapshot committed in `apps/web/public/data/items.json` came from a live run without Bedrock, so it has no summaries; deployed runs add them.
- Events are hand-maintained in `apps/web/lib/events.ts` and list only organiser-confirmed dates.
- No custom domain / certificate yet; add an ACM certificate and `domainNames` on the distribution.
