# 運用ガイド

## パブリッシャーの登録

パブリッシャーとは、データ可視化コンテンツを発信する個人・組織のこと。

### 登録手順

1. `/publishers/new` を開く
2. 以下を入力して保存：

| フィールド | 説明 | 例 |
|---|---|---|
| 名前 | パブリッシャーの名前 | `NYT Graphics` |
| 説明 | 任意のメモ | `ニューヨーク・タイムズのグラフィクス部門` |
| 種類 | `person`（個人）/ `organization`（組織） | `organization` |

---

## ソースの登録

ソースとは、そのパブリッシャーのRSSフィードURL。1パブリッシャーに複数登録できる。

### 登録手順

1. `/sources/new` を開く
2. 以下を入力して保存：

| フィールド | 説明 | 例 |
|---|---|---|
| パブリッシャー | 紐づけるパブリッシャー | `NYT Graphics` |
| フィードURL | RSSのURL | `https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml` |
| 取得件数上限 | 1回の収集で取得する最大件数 | `50`（デフォルト） |

### RSSフィードURLの見つけ方

- サイトのHTMLソース内で `<link rel="alternate" type="application/rss+xml">` を探す
- URLに `/feed`, `/rss`, `/atom.xml` を試す
- Chrome拡張「RSS Feed Finder」を使う

### 代表的なRSSフィードURL例

```
# データ可視化専門
https://flowingdata.com/feed
https://www.visualisingdata.com/feed

# メディアのグラフィクス・データ部門
https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml
https://www.theguardian.com/data/rss
```

### ソースの有効・無効切り替え

- `/sources` のリストから「有効/無効」をトグルで切り替え
- 無効にしたソースは自動収集の対象外になる（削除せずに一時停止できる）

---

## コンテンツの収集タイミング

### 自動収集（GitHub Actions）

| タイミング | 頻度 | 対象 |
|---|---|---|
| 毎時0分 | 1時間ごと | 有効なすべてのソース |

GitHub Actions の `.github/workflows/collect.yml` で設定。ログは GitHub → Actions タブで確認できる。

### 手動収集

**全ソースをまとめて収集：**

```bash
curl -X POST https://your-app.vercel.app/api/collect \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**特定のソースだけ収集（認証不要）：**

```bash
curl -X POST https://your-app.vercel.app/api/sources/1/collect
```

ソースIDは `/sources` の一覧で確認できる。

### 収集の仕組み

```
RSSフィードを取得
  ↓
新着エントリーのみDBに保存（既存は無視）
  ↓
各記事の画像を取得（RSSフィード内 → OGP → なし の優先順）
  ↓
sources.last_fetched_at を更新
```

---

## タグづけのタイミング

### 自動タグづけ（GitHub Actions）

| タイミング | 実行条件 |
|---|---|
| 収集ジョブの直後（毎時） | 収集ジョブ完了後に自動実行 |

タグなしコンテンツを最大50件ずつ処理する。

### 手動タグづけ

```bash
curl -X POST https://your-app.vercel.app/api/tag \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**レスポンス例：**

```json
{
  "processed": 23,
  "tagged": 21,
  "skipped": 2,
  "duration_ms": 8432
}
```

### タグの種類

| カテゴリ | タグ例 |
|---|---|
| 形式（format） | `chart`, `map`, `infographic`, `scrollytelling`, `interactive` |
| テーマ（topic） | `election`, `climate`, `economy`, `health`, `society` |
| ツール（tool） | `d3`, `mapbox`, `flourish`, `datawrapper`, `tableau` |

タグ体系の変更は [docs/tagging.md](tagging.md) を参照。

---

## よくある作業

### 新しいパブリッシャーを追加したい

1. `/publishers/new` でパブリッシャーを作成
2. `/sources/new` でRSSフィードURLを登録
3. 即座に収集したい場合は手動収集を実行

### ソースを一時停止したい

`/sources` → 該当ソースの「有効」ボタンをクリック → 「無効」に切り替わる

### 収集が動いているか確認したい

GitHub → Actions タブ → 最新のワークフロー実行を確認。
または Neon ダッシュボードで `contents` テーブルの件数・`collected_at` を確認。

### タグが付いていないコンテンツがある

手動で `/api/tag` を実行するか、次の自動タグづけ（翌時0分）を待つ。

### コンテンツが収集されない

1. ソースのURLをブラウザで開いてRSSが取得できるか確認
2. `/sources` でそのソースが「有効」になっているか確認
3. 手動収集で個別にテストする（エラーメッセージが返ってくる）
