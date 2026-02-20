"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contents } from "@/lib/db/schema";

export async function toggleStarred(id: number, starred: boolean) {
  await db.update(contents).set({ starred }).where(eq(contents.id, id));
  revalidatePath("/contents");
}
