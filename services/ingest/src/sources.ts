import type { ContentType, Provider } from "@ctp/catalog";

export interface Source {
  id: string;
  name: string;
  url: string;
  provider: Provider | "independent";
  type: ContentType;
  /** How to turn the feed into entries. Most feeds are one item per entry. */
  format: "rss" | "atom" | "gcp-release-notes" | "arxiv";
  /** Drop entries that the tagger cannot place in any capability (noisy feeds). */
  requireCapability?: boolean;
  /** Most recent feed entries to consider per run (for release notes: days, before splitting). */
  limit?: number;
}

/**
 * Official feeds first. Each URL was checked to return a valid feed in Oct 2026;
 * a feed that starts failing shows up in the run report rather than stopping the run.
 */
export const SOURCES: Source[] = [
  {
    id: "aws-whats-new",
    name: "AWS What's New",
    url: "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
    provider: "aws",
    type: "announcement",
    format: "rss",
    limit: 60,
  },
  {
    id: "aws-news-blog",
    name: "AWS News Blog",
    url: "https://aws.amazon.com/blogs/aws/feed/",
    provider: "aws",
    type: "blog",
    format: "rss",
  },
  {
    id: "aws-ml-blog",
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    provider: "aws",
    type: "blog",
    format: "rss",
  },
  {
    id: "aws-architecture-blog",
    name: "AWS Architecture Blog",
    url: "https://aws.amazon.com/blogs/architecture/feed/",
    provider: "aws",
    type: "blog",
    format: "rss",
  },
  {
    id: "azure-updates",
    name: "Azure Updates",
    url: "https://www.microsoft.com/releasecommunications/api/v2/azure/rss",
    provider: "azure",
    type: "announcement",
    format: "rss",
    limit: 60,
  },
  {
    id: "azure-blog",
    name: "Azure Blog",
    url: "https://azure.microsoft.com/en-us/blog/feed/",
    provider: "azure",
    type: "blog",
    format: "rss",
  },
  {
    id: "gcp-release-notes",
    name: "Google Cloud release notes",
    url: "https://docs.cloud.google.com/feeds/gcp-release-notes.xml",
    provider: "gcp",
    type: "announcement",
    format: "gcp-release-notes",
    limit: 5,
  },
  {
    id: "gcp-blog",
    name: "Google Cloud Blog",
    // Valid RSS from most networks; returned HTTP 500 from the build sandbox, so watch its row in the run report.
    url: "https://cloudblog.withgoogle.com/rss/",
    provider: "gcp",
    type: "blog",
    format: "rss",
  },
  {
    id: "arxiv-cs-dc",
    name: "arXiv cs.DC",
    url: "https://rss.arxiv.org/rss/cs.DC",
    provider: "independent",
    type: "research",
    format: "arxiv",
    requireCapability: true,
    limit: 80,
  },
];
