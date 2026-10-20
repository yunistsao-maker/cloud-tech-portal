import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { FeedItem, FeedSnapshot } from "@ctp/catalog";

export interface Store {
  /** Ids from `ids` that are already stored. */
  existing(ids: string[]): Promise<Set<string>>;
  put(item: FeedItem): Promise<void>;
  latest(limit: number): Promise<FeedItem[]>;
}

const GSI = "byPublished";

/**
 * Table layout: pk `id`; GSI `byPublished` on (gsi1pk = "ITEM", gsi1sk = publishedAt#id)
 * so the newest items come back from one Query.
 */
export class DynamoStore implements Store {
  private readonly doc: DynamoDBDocumentClient;
  constructor(
    private readonly table: string,
    client = new DynamoDBClient({}),
  ) {
    this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }

  async existing(ids: string[]): Promise<Set<string>> {
    const found = new Set<string>();
    const unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i += 100) {
      let keys = unique.slice(i, i + 100).map((id) => ({ id }));
      for (let attempt = 0; keys.length && attempt < 5; attempt++) {
        const res = await this.doc.send(
          new BatchGetCommand({ RequestItems: { [this.table]: { Keys: keys, ProjectionExpression: "id" } } }),
        );
        for (const r of res.Responses?.[this.table] ?? []) found.add(String(r.id));
        keys = (res.UnprocessedKeys?.[this.table]?.Keys as { id: string }[] | undefined) ?? [];
        if (keys.length) await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
      }
    }
    return found;
  }

  async put(item: FeedItem): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: { ...item, gsi1pk: "ITEM", gsi1sk: `${item.publishedAt}#${item.id}` },
        ConditionExpression: "attribute_not_exists(id)",
      }),
    ).catch((err: { name?: string }) => {
      if (err.name !== "ConditionalCheckFailedException") throw err;
    });
  }

  async latest(limit: number): Promise<FeedItem[]> {
    const items: FeedItem[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const res = await this.doc.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: GSI,
          KeyConditionExpression: "gsi1pk = :p",
          ExpressionAttributeValues: { ":p": "ITEM" },
          ScanIndexForward: false,
          Limit: Math.min(limit - items.length, 200),
          ExclusiveStartKey: start,
        }),
      );
      for (const raw of res.Items ?? []) {
        const parsed = FeedItem.safeParse(raw);
        if (parsed.success) items.push(parsed.data);
      }
      start = res.LastEvaluatedKey;
    } while (start && items.length < limit);
    return items;
  }
}

/** A JSON snapshot on disk, for local runs and tests. */
export class FileStore implements Store {
  private items = new Map<string, FeedItem>();
  private loaded = false;
  constructor(private readonly path: string) {}

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const snap = FeedSnapshot.parse(JSON.parse(await readFile(this.path, "utf8")));
      for (const it of snap.items) this.items.set(it.id, it);
    } catch {
      // Missing or unreadable file: start empty.
    }
  }
  async existing(ids: string[]) {
    await this.load();
    return new Set(ids.filter((id) => this.items.has(id)));
  }
  async put(item: FeedItem) {
    await this.load();
    if (!this.items.has(item.id)) this.items.set(item.id, item);
  }
  async latest(limit: number) {
    await this.load();
    return [...this.items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
  }
  async save(snapshot: FeedSnapshot) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(snapshot, null, 2)}\n`);
  }
}

export class MemoryStore implements Store {
  readonly items = new Map<string, FeedItem>();
  async existing(ids: string[]) {
    return new Set(ids.filter((id) => this.items.has(id)));
  }
  async put(item: FeedItem) {
    if (!this.items.has(item.id)) this.items.set(item.id, item);
  }
  async latest(limit: number) {
    return [...this.items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
  }
}
