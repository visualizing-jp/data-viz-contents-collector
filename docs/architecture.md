# アーキテクチャ

## システム全体像

```
[GitHub Actions] ── cron（定期実行）
      │
      │ POST /api/collect (Bearer token認証)
      ▼
[Vercel / Next.js]
      ├── 管理画面（App Router Pages）
      │     ├── /publishers   パブリッシャー管理
      │     ├── /sources      ソース管理
      │     └── /contents     コンテンツ閲覧・検索
      │
      ├── API Route Handlers (/api/...)
      │     ├── publishers CRUD
      │     ├── sources CRUD
      │     ├── contents 取得・検索
      │     └── collect  収集トリガー
      │
      ├── lib/collectors/
      │     └── rss.ts  → feedからコンテンツ取得
      └── lib/tagger/
            └── index.ts → Claude Haiku でタグを自動付与
                    ↓
               [Neon PostgreSQL]
               (Serverless PostgreSQL)
                    ↑
            [Anthropic API]
            Claude Haiku-4-5
```

## レイヤー構成

### プレゼンテーション層 (`app/`)

Next.js App Router のページコンポーネント。Server Components でDBから直接データ取得。スタイリングは **Tailwind CSS v4** を使用。

| パス | 説明 |
|------|------|
| `app/publishers/` | パブリッシャーの一覧・登録・編集 |
| `app/sources/` | ソースの一覧・登録・編集 |
| `app/contents/` | コンテンツの一覧（カードビュー）・検索・詳細 |

フォーム送信は **Server Actions** で処理（APIルート不要）。

#### コンテンツ一覧のカードビュー

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ [OGP画像]       │ │ [OGP画像]       │ │  (画像なし)     │
│                 │ │                 │ │  [placeholder]  │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ タイトル        │ │ タイトル        │ │ タイトル        │
│ パブリッシャー名 │ │ パブリッシャー名 │ │ パブリッシャー名 │
│ tag  tag        │ │ tag             │ │ tag  tag  tag   │
│ 2026-02-20      │ │ 2026-02-19      │ │ 2026-02-18      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

- `thumbnail_url` がある場合 → OGP画像を表示（Next.js `<Image>` で最適化）
- `thumbnail_url` が null の場合 → パブリッシャー名頭文字などのプレースホルダー

### APIレイヤー (`app/api/`)

外部から呼び出すエンドポイント。主にGitHub Actionsからの収集トリガー用。

| パス | 説明 |
|------|------|
| `app/api/collect/route.ts` | 全ソースの収集を実行（GitHub Actionsから呼び出し） |
| `app/api/sources/[id]/collect/route.ts` | 特定ソースを手動収集 |

### データ収集層 (`lib/collectors/`)

| ファイル | 説明 |
|---------|------|
| `lib/collectors/rss.ts` | RSSフィードの取得・パース |
| `lib/collectors/web.ts` | （将来）スクレイピング対応 |

### AIタグづけ層 (`lib/tagger/`)

| ファイル | 説明 |
|---------|------|
| `lib/tagger/index.ts` | Claude Haiku へのリクエスト・レスポンスのパース |
| `lib/tagger/taxonomy.ts` | タグマスターリスト（事前定義） |

### データ層 (`lib/db/`)

| ファイル | 説明 |
|---------|------|
| `lib/db/schema.ts` | Drizzle ORMのテーブル定義 |
| `lib/db/index.ts` | DB接続クライアントのシングルトン |

## データフロー

### 収集フロー（自動）

```
1. GitHub Actions が毎時 POST /api/collect を呼び出す
   （Authorization: Bearer {CRON_SECRET} で認証）

2. Route Handler が sources テーブルから is_active=true のソースを取得

3. 各ソースに対して RSS収集を実行
   ├── feedの URL に fetch リクエスト
   └── rss-parser でエントリーをパース

4. contents テーブルに INSERT ... ON CONFLICT DO NOTHING
   （source_id + external_id の UNIQUE 制約で重複防止）

5. sources.last_fetched_at を更新
```

### タグづけフロー（バッチ）

```
1. GitHub Actions が POST /api/tag を呼び出す
   （収集とは別のジョブとして実行）

2. Route Handler が tags のない contents を取得

3. 各コンテンツのタイトル + 説明を Claude Haiku に送信

4. レスポンスから tags を抽出

5. tags / content_tags テーブルに保存
```

### 閲覧フロー

```
1. ブラウザが /contents にアクセス

2. Server Component が Drizzle で直接クエリ実行
   （API呼び出し不要）

3. HTML をサーバーサイドレンダリングしてレスポンス
```

## 技術選定の根拠

### Next.js を選んだ理由

- **Vercel-native**: Vercel が開発しており、デプロイが最もシンプル
- **Server Components**: DB クエリをサーバー側で直接実行。APIレイヤー不要
- **Server Actions**: フォーム処理をサーバー側で実行。クライアント JS を最小化
- **App Router**: ファイルベースルーティングで管理画面を素直に構成できる

### Neon を選んだ理由

- **Serverless PostgreSQL**: コネクションプールが不要。Vercel のサーバーレス関数と相性が良い
- **Vercel Integration**: Vercel Marketplace から数クリックで連携可能
- **無料枠**: 0.5GB ストレージ、月192時間のコンピュートが無料
- **PostgreSQL 互換**: 標準的な SQL が使える。Drizzle ORM と組み合わせて型安全

### Tailwind CSS v4 を選んだ理由

- **ゼロ設定**: Next.js 15 との統合がシンプルで、設定ファイルが不要
- **ユーティリティファースト**: 管理画面のような実用的なUIを素早く構築できる
- **v4の変更点**: `tailwind.config.js` が不要になり、CSSファイルへの `@import "tailwindcss"` だけで動作

### Drizzle ORM を選んだ理由

- **型安全**: TypeScript のスキーマ定義から型が自動生成される
- **軽量**: Prisma と比べてバンドルサイズが小さく、エッジ環境に適する
- **`db push`**: マイグレーションファイルを生成せずスキーマを即座に反映できる（プロトタイピングが速い）

### GitHub Actions を選んだ理由

- **無料**: パブリック・プライベートリポジトリともに月2,000分まで無料
- **シンプル**: Vercel の Cron は Pro プランのみ。GitHub Actions なら Hobby プランでも定期実行可能
- **HTTP呼び出し**: `curl` で `/api/collect` を叩くだけ。収集ロジックはアプリ側に集約

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `DATABASE_URL` | 必須 | Neon の接続文字列（`postgresql://...?sslmode=require`） |
| `CRON_SECRET` | 必須 | `/api/collect`, `/api/tag` を保護するトークン。任意の長いランダム文字列 |
| `ANTHROPIC_API_KEY` | 必須 | AIタグづけ用。[Anthropic Console](https://console.anthropic.com/) で取得 |

## デプロイ手順概要

```bash
# 1. Neon でデータベース作成 → DATABASE_URL を取得

# 2. Vercel にデプロイ
npx vercel

# 3. Vercel の環境変数を設定
vercel env add DATABASE_URL production
vercel env add CRON_SECRET production

# 4. DBスキーマを本番に適用
DATABASE_URL=... npm run db:push

# 5. GitHub リポジトリの Secrets に設定
#    APP_URL = https://your-project.vercel.app
#    CRON_SECRET = （VERCEL に設定したものと同じ値）
```
