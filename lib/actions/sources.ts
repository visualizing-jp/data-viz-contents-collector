"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";

export async function createSource(formData: FormData) {
  const publisherId = parseInt(formData.get("publisherId") as string);
  const url         = formData.get("url") as string;
  const limit       = parseInt(formData.get("limit") as string) || 50;

  if (!url?.trim()) throw new Error("URLは必須です");
  if (isNaN(publisherId)) throw new Error("パブリッシャーを選択してください");

  await db.insert(sources).values({
    publisherId,
    platform: "web",
    url: url.trim(),
    fetchConfig: JSON.stringify({ limit }),
    isActive: true,
  });

  revalidatePath("/sources");
  redirect("/sources");
}

export async function updateSource(id: number, formData: FormData) {
  const url      = formData.get("url") as string;
  const limit    = parseInt(formData.get("limit") as string) || 50;
  const isActive = formData.get("isActive") === "true";

  if (!url?.trim()) throw new Error("URLは必須です");

  await db
    .update(sources)
    .set({
      url: url.trim(),
      fetchConfig: JSON.stringify({ limit }),
      isActive,
    })
    .where(eq(sources.id, id));

  revalidatePath("/sources");
  redirect("/sources");
}

export async function deleteSource(id: number) {
  await db.delete(sources).where(eq(sources.id, id));
  revalidatePath("/sources");
}

export async function toggleSource(id: number, isActive: boolean) {
  await db
    .update(sources)
    .set({ isActive })
    .where(eq(sources.id, id));
  revalidatePath("/sources");
}
