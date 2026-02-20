import Link from "next/link";
import { db } from "@/lib/db";
import { publishers, sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { deleteSource, toggleSource } from "@/lib/actions/sources";

export default async function SourcesPage() {
  const rows = await db
    .select({
      id:            sources.id,
      url:           sources.url,
      isActive:      sources.isActive,
      lastFetchedAt: sources.lastFetchedAt,
      createdAt:     sources.createdAt,
      publisherName: publishers.name,
      publisherId:   publishers.id,
    })
    .from(sources)
    .innerJoin(publishers, eq(sources.publisherId, publishers.id))
    .orderBy(sources.createdAt);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ソース</h1>
        <Link
          href="/sources/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 新規登録
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="mb-2 text-lg">ソースがまだありません</p>
          <Link href="/sources/new" className="text-blue-600 hover:underline text-sm">
            最初のソースを登録する
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">パブリッシャー</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium">最終収集</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate block"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.publisherName}</td>
                  <td className="px-4 py-3">
                    <form
                      action={async () => {
                        "use server";
                        await toggleSource(s.id, !s.isActive);
                      }}
                    >
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {s.isActive ? "有効" : "無効"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {s.lastFetchedAt
                      ? s.lastFetchedAt.toLocaleString("ja-JP")
                      : "未収集"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/sources/${s.id}/edit`}
                        className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        編集
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteSource(s.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded px-3 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
