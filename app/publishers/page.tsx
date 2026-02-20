import Link from "next/link";
import { db } from "@/lib/db";
import { publishers, sources } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { deletePublisher } from "@/lib/actions/publishers";

export default async function PublishersPage() {
  const rows = await db
    .select({
      id:           publishers.id,
      name:         publishers.name,
      description:  publishers.description,
      type:         publishers.type,
      createdAt:    publishers.createdAt,
      sourcesCount: sql<number>`count(${sources.id})`.as("sources_count"),
    })
    .from(publishers)
    .leftJoin(sources, sql`${sources.publisherId} = ${publishers.id}`)
    .groupBy(publishers.id)
    .orderBy(publishers.createdAt);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">パブリッシャー</h1>
        <Link
          href="/publishers/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 新規登録
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="mb-2 text-lg">パブリッシャーがまだいません</p>
          <Link href="/publishers/new" className="text-blue-600 hover:underline text-sm">
            最初のパブリッシャーを登録する
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">名前</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 font-medium">ソース数</th>
                <th className="px-4 py-3 font-medium">登録日</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.type === "person" ? "個人" : p.type === "organization" ? "組織" : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.sourcesCount}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/publishers/${p.id}/edit`}
                        className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        編集
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deletePublisher(p.id);
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
