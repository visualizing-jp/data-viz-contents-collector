import { NextRequest, NextResponse } from "next/server";
import { collectSource } from "@/lib/collectors/rss";
import { revalidatePath } from "next/cache";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sourceId = parseInt(id);
  if (isNaN(sourceId)) {
    return NextResponse.json({ error: "Invalid source ID" }, { status: 400 });
  }

  const result = await collectSource(sourceId);
  revalidatePath("/contents");
  revalidatePath("/sources");

  return NextResponse.json(result);
}
