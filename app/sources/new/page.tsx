import { db } from "@/lib/db";
import { publishers } from "@/lib/db/schema";
import { createSource } from "@/lib/actions/sources";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewSourcePage() {
  const publisherList = await db
    .select({ id: publishers.id, name: publishers.name })
    .from(publishers)
    .orderBy(publishers.name);

  if (publisherList.length === 0) {
    redirect("/publishers/new");
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sources" className="text-sm text-gray-500 hover:text-gray-700">
          ← ソース一覧
        </Link>
        <h1 className="text-2xl font-bold">新規ソース登録</h1>
      </div>

      <form action={createSource} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            パブリッシャー <span className="text-red-500">*</span>
          </label>
          <select
            name="publisherId"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {publisherList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            RSSフィードURL <span className="text-red-500">*</span>
          </label>
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/feed"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            RSS / Atom フィードのURLを入力してください
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            最大取得件数
          </label>
          <input
            name="limit"
            type="number"
            defaultValue={50}
            min={1}
            max={200}
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">1回の収集で取得するエントリーの最大数</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            登録する
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
