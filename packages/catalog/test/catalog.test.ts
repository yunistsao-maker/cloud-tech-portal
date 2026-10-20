import { describe, expect, it } from "vitest";
import {
  buildTagger,
  capabilities,
  capabilitiesIn,
  categories,
  detectStatus,
  PROVIDERS,
  searchCatalog,
  serviceLabel,
  getCapability,
} from "../src/index";

describe("catalog data", () => {
  it("has the nine categories, each with capabilities", () => {
    expect(categories.map((c) => c.id)).toEqual([
      "compute",
      "storage",
      "networking",
      "database",
      "analytics",
      "ai-ml",
      "security",
      "integration",
      "devops",
    ]);
    for (const cat of categories) expect(capabilitiesIn(cat.id).length).toBeGreaterThan(2);
  });

  it("uses unique capability ids that point at real categories", () => {
    const ids = capabilities.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const catIds = new Set(categories.map((c) => c.id));
    for (const c of capabilities) expect(catIds.has(c.category), c.id).toBe(true);
  });

  it("names a service for every provider on every capability", () => {
    for (const c of capabilities) for (const p of PROVIDERS) expect(c.services[p].length, `${c.id}/${p}`).toBeGreaterThan(0);
  });

  it("joins multi-service cells", () => {
    expect(serviceLabel(getCapability("managed-relational")!, "azure")).toBe(
      "Azure SQL Database · Azure Database for PostgreSQL",
    );
  });
});

describe("searchCatalog", () => {
  it("resolves a retired name to its current service", () => {
    const [hit] = searchCatalog("Vertex AI");
    expect(hit?.formerlyOf).toBe("Gemini Enterprise Agent Platform");
    expect(hit?.capability.id).toBe("foundation-model-platform");
  });

  it("finds a customer's 'Azure equivalent of Lambda' starting point", () => {
    expect(searchCatalog("lambda")[0]?.capability.id).toBe("serverless-functions");
  });

  it("searches Traditional Chinese capability names", () => {
    expect(searchCatalog("資料倉儲")[0]?.capability.id).toBe("data-warehouse");
  });
});

describe("tagger", () => {
  const tagger = buildTagger(capabilities);
  const top = (title: string, provider: "aws" | "azure" | "gcp" | "independent", body?: string) =>
    tagger.tag({ title, provider, body })[0]?.capabilityId;

  it("tags an AWS launch by its service name", () => {
    expect(top("Amazon Bedrock AgentCore Harness is now generally available", "aws")).toBe("agent-runtime");
  });

  it("tags by former names", () => {
    expect(top("New evaluation features in Vertex AI", "gcp")).toBe("foundation-model-platform");
  });

  it("ignores generic product words on another provider's items", () => {
    const res = tagger.tag({ title: "Run a nightly batch of reports with Workflows", provider: "aws" });
    expect(res.map((r) => r.capabilityId)).not.toContain("workflow-orchestration");
  });

  it("returns nothing for unrelated text", () => {
    expect(tagger.tag({ title: "Customer story: a retailer's year in review", provider: "aws" })).toEqual([]);
  });
});

describe("detectStatus", () => {
  it.each([
    ["Amazon EKS Auto Mode is now generally available", "ga"],
    ["Public preview: Azure Container Apps serverless GPUs", "preview"],
    ["Retirement: Azure Cache for Redis Basic tier", "deprecated"],
    ["Azure AI Foundry is now called Microsoft Foundry", "renamed"],
    ["How we built a recommendation engine", undefined],
  ])("%s → %s", (title, status) => {
    expect(detectStatus(title)).toBe(status);
  });
});
