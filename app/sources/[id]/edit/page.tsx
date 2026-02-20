import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishers, sources } from "@/lib/db/schema";
import { updateSource } from "@/lib/actions/sources";

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await db.query.sources.findFirst({
    where: eq(sources.id, parseInt(id)),
  });

  if (!source) notFound();

  const publisherList = await db
    .select({ id: publishers.id, name: publishers.name })
    .from(publishers)
    .orderBy(publishers.name);

  const fetchConfig = source.fetchConfig ? JSON.parse(source.fetchConfig) : { limit: 50 };

  const action = async (formData: FormData) => {
    "use server";
    await updateSource(source.id, formData);
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sources" className="text-sm text-gray-500 hover:text-gray-700">
          ← ソース一覧
        </Link>
        <h1 className="text-2xl font-bold">ソースを編集</h1>
      </div>

      <form action={action} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">パブリッシャー</label>
          <select
            disabled
            defaultValue={source.publisherId}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
          >
            {publisherList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">パブリッシャーは変更できません</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RSSフィードURL <span className="text-red-500">*</span>
          </label>
          <input
            name="url"
            type="url"
            required
            defaultValue={source.url}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大取得件数</label>
          <input
            name="limit"
            type="number"
            defaultValue={fetchConfig.limit ?? 50}
            min={1}
            max={200}
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
          <select
            name="isActive"
            defaultValue={source.isActive ? "true" : "false"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="true">有効</option>
            <option value="false">無効</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            更新する
          </button>
          <Link
            href="/sources"
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
