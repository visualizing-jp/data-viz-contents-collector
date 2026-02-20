import Parser from "rss-parser";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources, contents } from "@/lib/db/schema";
import { fetchThumbnailUrl } from "./image";

const parser = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "media:thumbnail"],
      ["media:content",   "media:content"],
    ],
  },
});

export interface CollectResult {
  sourceId:  number;
  collected: number;
  saved:     number;
  error?:    string;
}

export async function collectSource(sourceId: number): Promise<CollectResult> {
  const source = await db.query.sources.findFirst({
    where: eq(sources.id, sourceId),
  });

  if (!source || !source.isActive) {
    return { sourceId, collected: 0, saved: 0, error: "Source not found or inactive" };
  }

  const fetchConfig = source.fetchConfig ? JSON.parse(source.fetchConfig) : {};
  const limit: number = fetchConfig.limit ?? 50;

  try {
    const feed = await parser.parseURL(source.url);
    const items = feed.items.slice(0, limit);

    let saved = 0;

    for (const item of items) {
      const externalId = item.guid ?? item.link ?? null;
      const url        = item.link ?? "";
      if (!url) continue;

      const thumbnailUrl = await fetchThumbnailUrl(item as unknown as Record<string, unknown>, url);

      const result = await db
        .insert(contents)
        .values({
          sourceId:     source.id,
          externalId,
          title:        item.title ?? null,
          url,
          publishedAt:  item.isoDate ? new Date(item.isoDate) : null,
          thumbnailUrl,
          description:  item.contentSnippet ?? item.summary ?? null,
          rawData:      JSON.stringify({ feedTitle: feed.title }),
        })
        .onConflictDoNothing()
        .returning({ id: contents.id });

      if (result.length > 0) saved++;
    }

    // 最終収集日時を更新
    await db
      .update(sources)
      .set({ lastFetchedAt: new Date() })
      .where(eq(sources.id, source.id));

    return { sourceId, collected: items.length, saved };
  } catch (err) {
    return {
      sourceId,
      collected: 0,
      saved: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function collectAllSources(): Promise<CollectResult[]> {
  const activeSources = await db.query.sources.findMany({
    where: eq(sources.isActive, true),
  });

  const results: CollectResult[] = [];
  for (const source of activeSources) {
    const result = await collectSource(source.id);
    results.push(result);
  }
  return results;
}
