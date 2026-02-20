# data-viz-contents-collector

データ可視化の作り手・パブリッシャーを登録管理し、WebサイトやRSSフィードからコンテンツを定期収集してデータベースを構築する個人ツール。

## 概要

- **パブリッシャー管理**: データ可視化を発信する個人・組織を登録
- **ソース管理**: RSSフィード・WebページのURLを登録
- **自動収集**: GitHub Actionsが定期的にRSS/Webからコンテンツを収集
- **AIタグづけ**: Claude Haiku がタイトル・説明を読んでタグを自動付与
- **管理画面**: ブラウザから登録・閲覧・検索・タグ管理が可能
- **Vercel/Netlifyにデプロイ**: サーバー不要で運用

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| データベース | Neon (Serverless PostgreSQL) |
| ORM | Drizzle ORM |
| スタイリング | Tailwind CSS v4 |
| RSS収集 | rss-parser |
| AIタグづけ | Claude Haiku (Anthropic API) |
| スケジューラ | GitHub Actions (cron) |
| デプロイ | Vercel |

詳細は [docs/architecture.md](docs/architecture.md) を参照。

## セットアップ

### 1. Neonデータベースの作成

[Neon Console](https://console.neon.tech/) でプロジェクトを作成し、接続文字列を取得。

### 2. 環境変数の設定

```bash
cp .env.example .env.local
# .env.local を編集
```

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CRON_SECRET=your_random_secret_string
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. 依存パッケージのインストール

```bash
npm install
```

### 4. DBの初期化

```bash
npm run db:push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

## Vercelへのデプロイ

```bash
# Vercel CLIでデプロイ
npx vercel

# 環境変数をVercelに設定
vercel env add DATABASE_URL
vercel env add CRON_SECRET
```

NeonはVercelとのインテグレーションがあり、[Vercel Marketplace](https://vercel.com/marketplace) から直接接続可能。

## GitHub Actionsで自動収集

`.github/workflows/collect.yml` を設定することで、GitHub Actionsが定期的に収集APIを呼び出す。
リポジトリの Secrets に `APP_URL` と `CRON_SECRET` を設定する。

詳細は [docs/collectors.md](docs/collectors.md) を参照。

## 使い方

### パブリッシャーを登録する

`/publishers/new` からフォームで登録。

### 収集ソースを登録する

`/sources/new` でパブリッシャーとRSSフィードURLを設定。

### コンテンツを確認する

`/contents` で収集済みコンテンツを一覧・検索。

## ドキュメント

- [セットアップガイド](docs/setup.md)
- [運用ガイド](docs/operations.md)
- [アーキテクチャ](docs/architecture.md)
- [DBスキーマ](docs/database-schema.md)
- [コレクター設定](docs/collectors.md)
- [AIタグづけ](docs/tagging.md)
- [APIリファレンス](docs/api.md)

## プロジェクト構成

```
data-viz-contents-collector/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── publishers/          # パブリッシャー管理画面
│   ├── sources/             # ソース管理画面
│   ├── contents/            # コンテンツ閲覧画面
│   └── api/                 # Route Handlers
│       ├── publishers/
│       ├── sources/
│       ├── contents/
│       └── collect/         # 収集トリガーAPI
├── lib/
│   ├── db/                  # Drizzle設定・スキーマ
│   └── collectors/          # RSS収集ロジック
├── .github/
│   └── workflows/
│       └── collect.yml      # GitHub Actions cron
├── .env.example
└── package.json
```
