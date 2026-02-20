# コレクター設定ガイド

## 対応プラットフォーム

現在は **Web（RSS/Atom フィード）** のみ対応。

| プラットフォーム | 状態 | ライブラリ |
|----------------|------|-----------|
| Web / RSS | 対応済み | rss-parser |
| スクレイピング | 将来対応 | （検討中） |
| YouTube | 将来対応 | YouTube Data API v3 |
| Instagram | 将来対応 | （検討中） |

---

## Webコレクター (`lib/collectors/rss.ts`)

### 仕組み

```
sources テーブルから is_active=true のソースを取得
    ↓
各ソースの url に fetch リクエスト
    ↓
rss-parser でパース
    ↓
contents テーブルに upsert（重複は無視）
    ↓
sources.last_fetched_at を更新
```

### 収集データのマッピング

| contents フィールド | RSSフィードのフィールド |
|--------------------|----------------------|
| `external_id` | `item.guid` または `item.link` |
| `title` | `item.title` |
| `url` | `item.link` |
| `published_at` | `item.pubDate` / `item.isoDate` |
| `description` | `item.contentSnippet` または `item.content` |
| `thumbnail_url` | 後述の画像収集ロジックで取得 |

---

## 画像収集ロジック

カードビューで表示する画像を以下の優先順位で取得する。

```
優先度1: RSSフィード自体に画像URLが含まれている
   └─ item.enclosure?.url（type が image/* のもの）
   └─ item["media:thumbnail"]?.$.url
   └─ item["media:content"]?.$.url

優先度2: RSSに画像がない場合 → 記事URLにfetchしてOGP取得
   └─ <meta property="og:image" content="...">
   └─ <meta name="twitter:image" content="...">

優先度3: どちらもなければ → thumbnail_url = null（カードでは placeholder 表示）
```

### 実装イメージ

```typescript
// lib/collectors/image.ts

async function fetchThumbnailUrl(
  item: RssItem,
  articleUrl: string
): Promise<string | null> {
  // 優先度1: フィード内の画像
  const feedImage =
    item.enclosure?.url ??
    item["media:thumbnail"]?.$?.url ??
    item["media:content"]?.$?.url ?? null;

  if (feedImage) return feedImage;

  // 優先度2: OGP取得（追加fetch）
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "data-viz-collector/1.0" },
      signal: AbortSignal.timeout(5000), // 5秒タイムアウト
    });
    const html = await res.text();
    const ogImage = html.match(
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i
    )?.[1];
    const twitterImage = html.match(
      /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i
    )?.[1];
    return ogImage ?? twitterImage ?? null;
  } catch {
    return null; // タイムアウト・エラーは無視
  }
}
```

### 注意点

- OGP取得のための追加fetchはエントリーごとに1リクエスト発生する
- 1フィードあたり50エントリーあれば最大50リクエスト。タイムアウトを短く（5秒）設定して全体の遅延を抑える
- フィード内に画像があるソース（WordPress系など）は追加fetchが不要

### fetch_config の設定

| キー | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `limit` | number | 50 | 1回の収集で取得するエントリーの最大数 |

```json
{
  "limit": 50
}
```

---

## ソースの登録

### RSSフィードのURL例

```
# データ可視化ブログ
https://flowingdata.com/feed
https://www.visualisingdata.com/feed
https://infowetrust.com/feed

# メディア（データ・グラフィクス系）
https://www.nytimes.com/section/upshot?rss=1
https://www.theguardian.com/data/rss

```

### RSS フィードURLの見つけ方

1. サイトのHTMLソースで `<link rel="alternate" type="application/rss+xml">` を探す
2. Chrome拡張「RSS Feed Finder」等を使う
3. URLパターンを試す: `/feed`, `/rss`, `/atom.xml`, `/rss.xml`

---

## 自動収集の設定（GitHub Actions）

`.github/workflows/collect.yml` を作成する：

```yaml
name: Collect Contents

on:
  schedule:
    - cron: '0 * * * *'   # 毎時0分に実行
  workflow_dispatch:        # 手動実行も可能

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger collection API
        run: |
          curl -s -X POST "${{ vars.APP_URL }}/api/collect" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### GitHub リポジトリに設定するもの

**Secrets（Settings > Secrets and variables > Actions > Secrets）:**

| 名前 | 値 |
|------|-----|
| `CRON_SECRET` | Vercel に設定した `CRON_SECRET` と同じ値 |

**Variables（Settings > Secrets and variables > Actions > Variables）:**

| 名前 | 値 |
|------|-----|
| `APP_URL` | `https://your-project.vercel.app` |

---

## 手動収集

管理画面のソース詳細ページから「今すぐ収集」ボタンで手動実行できる。

または curl で直接：

```bash
# 特定ソースを収集
curl -X POST http://localhost:3000/api/sources/1/collect

# 全ソースを収集（CRON_SECRET が必要）
curl -X POST http://localhost:3000/api/collect \
  -H "Authorization: Bearer your_cron_secret"
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| コンテンツが増えない | URLが間違い、またはフィードがない | URLをブラウザで開いて確認。RSSリーダーで読み込めるか試す |
| 収集エラーが出る | サイトのRSSが一時停止・移転 | `sources.is_active = false` に設定して除外 |
| 重複エントリーが入る | `external_id` が取れていない | フィードの `guid` フィールドを確認 |
| GitHub Actions が失敗する | `APP_URL` / `CRON_SECRET` の設定ミス | GitHub の Secrets/Variables を再確認 |
| Vercel でタイムアウト | ソース数が多く処理が10秒超える | 収集をバッチ分割するか、ソース数を減らす |
