import { NextRequest, NextResponse } from "next/server";
import { collectAllSources } from "@/lib/collectors/rss";

export async function POST(req: NextRequest) {
  // Bearer トークン認証
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results = await collectAllSources();

  const totalCollected = results.reduce((sum, r) => sum + r.collected, 0);
  const totalSaved     = results.reduce((sum, r) => sum + r.saved, 0);
  const errors         = results.filter((r) => r.error);

  return NextResponse.json({
    sources:     results.length,
    collected:   totalCollected,
    saved:       totalSaved,
    errors:      errors.length,
    errorDetails: errors.map((r) => ({ sourceId: r.sourceId, error: r.error })),
    duration_ms: Date.now() - start,
  });
}
