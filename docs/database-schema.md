# DBスキーマ

データベースは **Neon (Serverless PostgreSQL)**。スキーマ定義は Drizzle ORM で管理。

## ER図

```
publishers
    │ 1
    │
    │ n
sources ───────────────── 1 ── contents ── n ── content_tags ── n ── tags
    (platform: web)                             (中間テーブル)
```

## Drizzle スキーマ定義 (`lib/db/schema.ts`)

```typescript
import { pgTable, serial, text, boolean, timestamp, integer, unique } from "drizzle-orm/pg-core";

export const publishers = pgTable("publishers", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  type:        text("type", { enum: ["person", "organization"] }),
  createdAt:   timestamp("created_at").defaultNow(),
});

export const sources = pgTable("sources", {
  id:            serial("id").primaryKey(),
  publisherId:   integer("publisher_id").notNull().references(() => publishers.id, { onDelete: "cascade" }),
  platform:      text("platform", { enum: ["web"] }).notNull(),
  url:           text("url"),              // RSSフィードURL または WebページURL
  fetchConfig:   text("fetch_config"),    // JSON文字列
  lastFetchedAt: timestamp("last_fetched_at"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at").defaultNow(),
});

export const contents = pgTable("contents", {
  id:           serial("id").primaryKey(),
  sourceId:     integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  externalId:   text("external_id"),
  title:        text("title"),
  url:          text("url").notNull(),
  publishedAt:  timestamp("published_at"),
  thumbnailUrl: text("thumbnail_url"),
  description:  text("description"),
  rawData:      text("raw_data"),         // JSON文字列
  collectedAt:  timestamp("collected_at").defaultNow(),
}, (t) => ({
  uniqueSourceExternal: unique().on(t.sourceId, t.externalId),
}));

export const tags = pgTable("tags", {
  id:   serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const contentTags = pgTable("content_tags", {
  contentId: integer("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  tagId:     integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: unique().on(t.contentId, t.tagId),
}));
```

---

## テーブル詳細

### publishers（パブリッシャー）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | serial PK | 自動採番 |
| `name` | text NOT NULL | パブリッシャー名 |
| `description` | text | 説明・メモ |
| `type` | text | `"person"` または `"organization"` |
| `created_at` | timestamp | 登録日時 |

---

### sources（収集ソース）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | serial PK | 自動採番 |
| `publisher_id` | integer FK | publishers.id |
| `platform` | text | 現在は `"web"` のみ |
| `url` | text | RSSフィードURL または WebページURL |
| `fetch_config` | text (JSON) | 収集設定（後述） |
| `last_fetched_at` | timestamp | 最終収集日時 |
| `is_active` | boolean | 収集有効フラグ |
| `created_at` | timestamp | 登録日時 |

#### fetch_config の例

```json
{
  "limit": 50,
  "type": "rss"
}
```

将来的にスクレイピングに対応する場合：
```json
{
  "type": "scrape",
  "selector": "article h2 a",
  "limit": 20
}
```

---

### contents（収集コンテンツ）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | serial PK | 自動採番 |
| `source_id` | integer FK | sources.id |
| `external_id` | text | フィードエントリのID（重複防止） |
| `title` | text | 記事タイトル |
| `url` | text NOT NULL | 記事URL |
| `published_at` | timestamp | 公開日時 |
| `thumbnail_url` | text | OGP画像URL等 |
| `description` | text | 要約・本文の一部 |
| `raw_data` | text (JSON) | フィードの生データ |
| `collected_at` | timestamp | 収集日時 |

**UNIQUE制約:** `(source_id, external_id)` — 同一コンテンツの重複登録を防止

---

### tags / content_tags

タグは将来の拡張用。現時点では実装を後回しにしても良い。

---

## マイグレーション

### スキーマの適用

```bash
# 開発・プロトタイプ: スキーマを直接プッシュ（マイグレーションファイル不要）
npm run db:push

# 本番運用に移行したら: マイグレーションファイルを生成・管理
npm run db:generate
npm run db:migrate
```

### Drizzle Studio（DBのGUI確認）

```bash
npm run db:studio
# → https://local.drizzle.studio でテーブルを確認
```

### package.json のスクリプト設定

```json
{
  "scripts": {
    "db:push":     "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate":  "drizzle-kit migrate",
    "db:studio":   "drizzle-kit studio"
  }
}
```
