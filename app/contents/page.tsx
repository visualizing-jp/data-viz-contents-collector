import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { contents, sources, publishers, contentTags, tags } from "@/lib/db/schema";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { StarButton } from "@/app/components/StarButton";

const PAGE_SIZE = 24;

export default async function ContentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; publisherId?: string; page?: string; starred?: string }>;
}) {
  const { q, publisherId, page, starred } = await searchParams;
  const currentPage    = parseInt(page ?? "1");
  const offset         = (currentPage - 1) * PAGE_SIZE;
  const publisherIdNum = publisherId ? parseInt(publisherId) : null;
  const starredOnly    = starred === "1";

  // フィルター条件
  const filters = [];
  if (q) {
    filters.push(
      or(
        ilike(contents.title, `%${q}%`),
        ilike(contents.description, `%${q}%`)
      )
    );
  }
  if (publisherIdNum) {
    filters.push(eq(publishers.id, publisherIdNum));
  }
  if (starredOnly) {
    filters.push(eq(contents.starred, true));
  }

  const whereClause = filters.length > 0
    ? sql`${filters.reduce((a, b) => sql`${a} AND ${b}`)}`
    : undefined;

  const [rows, countResult, publisherList] = await Promise.all([
    db
      .select({
        id:            contents.id,
        title:         contents.title,
        url:           contents.url,
        thumbnailUrl:  contents.thumbnailUrl,
        description:   contents.description,
        publishedAt:   contents.publishedAt,
        collectedAt:   contents.collectedAt,
        starred:       contents.starred,
        publisherName: publishers.name,
        publisherId:   publishers.id,
      })
      .from(contents)
      .innerJoin(sources, eq(contents.sourceId, sources.id))
      .innerJoin(publishers, eq(sources.publisherId, publishers.id))
      .where(whereClause)
      .orderBy(desc(contents.collectedAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)` })
      .from(contents)
      .innerJoin(sources, eq(contents.sourceId, sources.id))
      .innerJoin(publishers, eq(sources.publisherId, publishers.id))
      .where(whereClause),

    db.select({ id: publishers.id, name: publishers.name }).from(publishers).orderBy(publishers.name),
  ]);

  // 各コンテンツのタグを取得
  const contentIds = rows.map((r) => r.id);
  const tagRows = contentIds.length > 0
    ? await db
        .select({ contentId: contentTags.contentId, tagName: tags.name })
        .from(contentTags)
        .innerJoin(tags, eq(contentTags.tagId, tags.id))
        .where(inArray(contentTags.contentId, contentIds))
    : [];

  const tagsByContentId = tagRows.reduce<Record<number, string[]>>((acc, row) => {
    if (!acc[row.contentId]) acc[row.contentId] = [];
    acc[row.contentId].push(row.tagName);
    return acc;
  }, {});

  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildUrl = (params: Record<string, string>) =>
    `/contents?${new URLSearchParams(params)}`;

  return (
    <div>
      {/* ヘッダー・フィルター */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">
          コンテンツ
          <span className="ml-2 text-base font-normal text-gray-400">{totalCount}件</span>
        </h1>
        <form className="flex flex-wrap gap-2" method="GET">
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="タイトル・説明を検索"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
          />
          <select
            name="publisherId"
            defaultValue={publisherId ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">すべてのパブリッシャー</option>
            {publisherList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* ☆フィルター（hidden input で状態を保持） */}
          <input type="hidden" name="starred" value={starredOnly ? "1" : ""} />
          <button
            type="submit"
            className="rounded-md bg-gray-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            検索
          </button>
          {(q || publisherId || starredOnly) && (
            <Link
              href="/contents"
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              クリア
            </Link>
          )}
        </form>
        {/* ☆フィルタートグル */}
        <Link
          href={buildUrl({
            ...(q ? { q } : {}),
            ...(publisherId ? { publisherId } : {}),
            ...(starredOnly ? {} : { starred: "1" }),
          })}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors border ${
            starredOnly
              ? "bg-yellow-400 border-yellow-400 text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          ★ お気に入り
        </Link>
      </div>

      {/* カードグリッド */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="text-lg">コンテンツがまだありません</p>
          <p className="mt-1 text-sm">
            {starredOnly
              ? "☆をつけたコンテンツがありません"
              : <><Link href="/sources" className="text-blue-600 hover:underline">ソースを登録</Link>して収集を開始してください</>
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((item) => (
            <div key={item.id} className="relative group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col flex-1"
              >
                {/* サムネイル */}
                <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title ?? ""}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-gray-300">
                      {item.publisherName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* テキスト情報 */}
                <div className="flex flex-col gap-1 p-3">
                  <p className="text-xs font-medium text-blue-600">{item.publisherName}</p>
                  <h2 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                    {item.title ?? item.url}
                  </h2>

                  {/* タグ */}
                  {(tagsByContentId[item.id]?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tagsByContentId[item.id].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-1 text-xs text-gray-400">
                    {(item.publishedAt ?? item.collectedAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </a>

              {/* ☆ボタン */}
              <StarButton id={item.id} starred={item.starred} />
            </div>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl({
                ...(q ? { q } : {}),
                ...(publisherId ? { publisherId } : {}),
                ...(starredOnly ? { starred: "1" } : {}),
                page: String(p),
              })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                p === currentPage
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
