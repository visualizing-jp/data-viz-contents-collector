/**
 * RSSエントリーとOGPから画像URLを取得する（優先度順）
 * 1. RSSフィード内の画像（追加fetchなし）
 * 2. 記事HTMLのog:image / twitter:image
 * 3. null（プレースホルダー表示）
 */
export async function fetchThumbnailUrl(
  item: Record<string, unknown>,
  articleUrl: string
): Promise<string | null> {
  // 優先度1: フィード内の画像
  const enclosureUrl =
    (item.enclosure as { url?: string; type?: string } | undefined)?.type?.startsWith("image/")
      ? (item.enclosure as { url?: string }).url
      : undefined;

  const mediaThumbnail =
    (item["media:thumbnail"] as { $?: { url?: string } } | undefined)?.$?.url;

  const mediaContent =
    (item["media:content"] as { $?: { url?: string; medium?: string } } | undefined)?.$?.medium === "image"
      ? (item["media:content"] as { $?: { url?: string } })?.$?.url
      : undefined;

  const feedImage = enclosureUrl ?? mediaThumbnail ?? mediaContent ?? null;
  if (feedImage) return feedImage;

  // 優先度2: 記事ページのOGP
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "data-viz-collector/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // og:image または twitter:image を正規表現で抽出
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

    const twitterImage =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1];

    return ogImage ?? twitterImage ?? null;
  } catch {
    return null;
  }
}
