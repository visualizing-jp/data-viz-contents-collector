# セットアップガイド

## 必要なもの

| サービス/ツール | 用途 | 備考 |
|---|---|---|
| [Neon](https://neon.tech) | サーバーレスPostgreSQL | 無料プランあり |
| [Anthropic](https://console.anthropic.com) | Claude Haiku API | AIタグづけ用 |
| [Vercel](https://vercel.com) | ホスティング | 無料プランあり |
| Node.js 20+ | ローカル開発 | — |
| GitHub | Actions cron / リポジトリ | — |

---

## Step 1: Neonデータベースの作成

1. [console.neon.tech](https://console.neon.tech/) にサインイン
2. **「New Project」** でプロジェクトを作成
   - PostgreSQLバージョン: **17**（推奨）
   - Enable Neon Auth: **オフのまま**（不要）
3. ダッシュボードの **「Connection Details」→「Connection string」** タブを開く
4. 接続文字列をコピーしておく（後で使用）

```
postgresql://ユーザー名:パスワード@ホスト名/データベース名?sslmode=require
```

---

## Step 2: Anthropic APIキーの取得

1. [console.anthropic.com](https://console.anthropic.com/) にサインイン
2. **「API Keys」** から新しいキーを作成
3. `sk-ant-...` の文字列をコピーしておく

---

## Step 3: CRON_SECRETの生成

APIエンドポイント保護用のランダム文字列を生成する：

```bash
openssl rand -hex 32
```

出力された64文字の文字列を控えておく。

---

## Step 4: 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して3つの値を設定：

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CRON_SECRET=<openssl rand -hex 32 で生成した文字列>
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Step 5: 依存パッケージのインストール

```bash
npm install
```

---

## Step 6: DBスキーマの適用

```bash
npm run db:push
```

Neonにテーブルが作成される（publishers, sources, contents, tags, content_tags）。

> **注意**: `drizzle-kit` は `.env.local` を自動で読まないため、`drizzle.config.ts` で `dotenv` を使って読み込んでいる。`dotenv` パッケージは `npm install` 済み。

---

## Step 7: 開発サーバーの起動

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) でアクセス。`/contents` にリダイレクトされる。

---

## Step 8: Vercelへのデプロイ

### Vercel CLIを使う場合

```bash
npx vercel
```

環境変数を設定：

```bash
vercel env add DATABASE_URL
vercel env add CRON_SECRET
vercel env add ANTHROPIC_API_KEY
```

### Vercel ダッシュボードを使う場合

1. GitHub リポジトリをVercelに連携（Import Project）
2. **「Settings」→「Environment Variables」** で3つの変数を追加
3. **「Deployments」→「Redeploy」** で再デプロイ

> **Neon × Vercel統合**: Vercel Marketplaceで「Neon」を追加すると `DATABASE_URL` が自動設定される。

---

## Step 9: GitHub Actionsの設定

リポジトリの **「Settings」→「Secrets and variables」→「Actions」** で設定：

### Secrets（機密情報）
| 名前 | 値 |
|---|---|
| `CRON_SECRET` | Step 3で生成した文字列 |

### Variables（公開情報）
| 名前 | 値 |
|---|---|
| `APP_URL` | デプロイ先のURL（例: `https://your-app.vercel.app`） |

設定後、毎時0分に自動収集 → AIタグづけが実行される。

---

## 動作確認

### ローカルで手動収集テスト

```bash
# ソースが登録済みの場合
curl -X POST http://localhost:3000/api/collect \
  -H "Authorization: Bearer <CRON_SECRET>"

# 特定ソースだけ
curl -X POST http://localhost:3000/api/sources/1/collect
```

### Drizzle Studioでデータを確認

```bash
npm run db:studio
```

→ [https://local.drizzle.studio](https://local.drizzle.studio) でDBの中身をGUIで確認できる。

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `Either connection "url" or "host" are required` | `DATABASE_URL` が未設定 | `.env.local` の値を確認 |
| `Unauthorized` (API) | `CRON_SECRET` が不一致 | ヘッダーの `Bearer <token>` を確認 |
| サムネイルが表示されない | OGP取得失敗またはnull | 正常動作。プレースホルダーが表示される |
| タグが付かない | Anthropic APIキーが未設定 | `.env.local` の `ANTHROPIC_API_KEY` を確認 |
