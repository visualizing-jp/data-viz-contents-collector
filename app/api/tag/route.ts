import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contents, tags, contentTags } from "@/lib/db/schema";
import { autoTag } from "@/lib/tagger";
import { sql, eq } from "drizzle-orm";

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // タグなしコンテンツを取得
  const untagged = await db
    .select({ id: contents.id, title: contents.title, description: contents.description })
    .from(contents)
    .where(
      sql`${contents.id} NOT IN (
        SELECT DISTINCT ${contentTags.contentId} FROM ${contentTags}
      )`
    )
    .limit(BATCH_SIZE);

  let tagged = 0;
  let skipped = 0;

  for (const content of untagged) {
    if (!content.title) {
      skipped++;
      continue;
    }

    const tagNames = await autoTag(content.title, content.description);
    if (tagNames.length === 0) {
      skipped++;
      continue;
    }

    // タグを upsert して ID を取得
    for (const name of tagNames) {
      const [tag] = await db
        .insert(tags)
        .values({ name })
        .onConflictDoUpdate({ target: tags.name, set: { name } })
        .returning({ id: tags.id });

      await db
        .insert(contentTags)
        .values({ contentId: content.id, tagId: tag.id })
        .onConflictDoNothing();
    }

    tagged++;
  }

  return NextResponse.json({
    processed:   untagged.length,
    tagged,
    skipped,
    duration_ms: Date.now() - start,
  });
}
