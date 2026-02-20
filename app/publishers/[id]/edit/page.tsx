import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishers } from "@/lib/db/schema";
import { updatePublisher } from "@/lib/actions/publishers";

export default async function EditPublisherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const publisher = await db.query.publishers.findFirst({
    where: eq(publishers.id, parseInt(id)),
  });

  if (!publisher) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updatePublisher(publisher.id, formData);
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/publishers" className="text-sm text-gray-500 hover:text-gray-700">
          ← パブリッシャー一覧
        </Link>
        <h1 className="text-2xl font-bold">パブリッシャーを編集</h1>
      </div>

      <form action={action} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={publisher.name}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={publisher.description ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
          <select
            name="type"
            defaultValue={publisher.type ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            <option value="person">個人</option>
            <option value="organization">組織・メディア</option>
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
            href="/publishers"
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
