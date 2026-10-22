import type { Lang } from "./prefs";

const STRINGS = {
  pulse: { en: "Pulse", zh: "動態" },
  compare: { en: "Compare", zh: "服務比較" },
  categories: { en: "Categories", zh: "類別" },
  category: { en: "Category", zh: "類別" },
  allCategories: { en: "All categories", zh: "全部類別" },
  provider: { en: "Provider", zh: "雲端供應商" },
  providerColumns: { en: "Provider columns", zh: "顯示供應商" },
  type: { en: "Type", zh: "內容類型" },
  searchPlaceholder: { en: "Search services, capabilities, old names…", zh: "搜尋服務、能力或舊名稱…" },
  search: { en: "Search", zh: "搜尋" },
  language: { en: "Language", zh: "語言" },
  skyColour: { en: "Sky colour", zh: "主題色" },
  latestAcross: { en: "Latest across clouds", zh: "跨雲最新動態" },
  everything: { en: "Everything", zh: "全部" },
  equivalentServices: { en: "equivalent services", zh: "對應服務" },
  capability: { en: "Capability", zh: "能力" },
  capabilities: { en: "Capabilities", zh: "能力" },
  changedRecently: { en: "changed in the last 90 days", zh: "近 90 天有更新" },
  recentChanges: { en: "Recent changes", zh: "近期更新" },
  noRecentChanges: { en: "No changes in the current feed.", zh: "目前動態中沒有相關更新。" },
  notAuthored: {
    en: "Attribute rows for this capability are not authored yet.",
    zh: "此能力的比較項目尚未建立。",
  },
  needsReview: { en: "needs review", zh: "待確認" },
  openMatrix: { en: "Open matrix", zh: "開啟比較表" },
  openSource: { en: "Read at source", zh: "閱讀原文" },
  research: { en: "Research", zh: "研究論文" },
  events: { en: "Events", zh: "活動" },
  lifecycle: { en: "Renames & retirements", zh: "更名與退役" },
  loading: { en: "Loading feed…", zh: "載入中…" },
  feedError: { en: "The feed could not be loaded.", zh: "無法載入動態。" },
  empty: { en: "Nothing matches these filters.", zh: "沒有符合篩選條件的項目。" },
  updatedAt: { en: "Feed updated", zh: "更新時間" },
  backToPulse: { en: "Back to Pulse", zh: "返回動態" },
  noEquivalent: { en: "No direct equivalent", zh: "無直接對應服務" },
  formerly: { en: "formerly", zh: "舊名" },
  showMore: { en: "Show more", zh: "顯示更多" },
  upcoming: { en: "Upcoming", zh: "即將舉行" },
  untagged: { en: "Unmapped", zh: "未分類" },
  reports: { en: "Reports", zh: "研究報告" },
  reportsIntro: {
    en: "In-depth surveys written by the team, each tied to the capabilities it covers.",
    zh: "團隊撰寫的深度調查報告，並對應到所涵蓋的雲端能力。",
  },
  contents: { en: "Contents", zh: "目錄" },
  coversCapabilities: { en: "Covers", zh: "涵蓋能力" },
  editableSource: { en: "Open the editable source doc", zh: "開啟可編輯的原始文件" },
  readReport: { en: "Read report", zh: "閱讀報告" },
  updated: { en: "Updated", zh: "更新於" },
  bodyInChinese: { en: "Report body is in Traditional Chinese.", zh: "" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}

export const TYPE_LABEL = {
  announcement: { en: "Announcement", zh: "公告" },
  blog: { en: "Tech blog", zh: "技術部落格" },
  news: { en: "News", zh: "新聞" },
  research: { en: "Research", zh: "研究" },
  event: { en: "Event", zh: "活動" },
  lifecycle: { en: "Lifecycle", zh: "生命週期" },
} as const;

export const STATUS_LABEL = {
  ga: { en: "GA", zh: "正式推出" },
  preview: { en: "Preview", zh: "預覽" },
  deprecated: { en: "Retiring", zh: "即將退役" },
  renamed: { en: "Renamed", zh: "更名" },
} as const;
