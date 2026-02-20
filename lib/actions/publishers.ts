"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishers } from "@/lib/db/schema";

export async function createPublisher(formData: FormData) {
  const name        = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const type        = formData.get("type") as "person" | "organization" | null;

  if (!name?.trim()) throw new Error("名前は必須です");

  await db.insert(publishers).values({
    name: name.trim(),
    description: description?.trim() || null,
    type: type || null,
  });

  revalidatePath("/publishers");
  redirect("/publishers");
}

export async function updatePublisher(id: number, formData: FormData) {
  const name        = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const type        = formData.get("type") as "person" | "organization" | null;

  if (!name?.trim()) throw new Error("名前は必須です");

  await db
    .update(publishers)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      type: type || null,
    })
    .where(eq(publishers.id, id));

  revalidatePath("/publishers");
  redirect("/publishers");
}

export async function deletePublisher(id: number) {
  await db.delete(publishers).where(eq(publishers.id, id));
  revalidatePath("/publishers");
}
