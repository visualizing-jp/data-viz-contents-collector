import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  unique,
} from "drizzle-orm/pg-core";

// パブリッシャー（作り手・発信者）
export const publishers = pgTable("publishers", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description"),
  type:        text("type", { enum: ["person", "organization"] }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// 収集ソース（RSSフィード等）
export const sources = pgTable("sources", {
  id:            serial("id").primaryKey(),
  publisherId:   integer("publisher_id")
    .notNull()
    .references(() => publishers.id, { onDelete: "cascade" }),
  platform:      text("platform", { enum: ["web"] }).notNull().default("web"),
  url:           text("url").notNull(),
  fetchConfig:   text("fetch_config"),   // JSON: { limit: 50 }
  lastFetchedAt: timestamp("last_fetched_at"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

// 収集コンテンツ
export const contents = pgTable(
  "contents",
  {
    id:           serial("id").primaryKey(),
    sourceId:     integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId:   text("external_id"),
    title:        text("title"),
    url:          text("url").notNull(),
    publishedAt:  timestamp("published_at"),
    thumbnailUrl: text("thumbnail_url"),
    description:  text("description"),
    rawData:      text("raw_data"),       // JSON
    collectedAt:  timestamp("collected_at").defaultNow().notNull(),
    starred:      boolean("starred").notNull().default(false),
  },
  (t) => [unique("uniq_source_external").on(t.sourceId, t.externalId)]
);

// タグ
export const tags = pgTable("tags", {
  id:   serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// コンテンツ-タグ中間テーブル
export const contentTags = pgTable(
  "content_tags",
  {
    contentId: integer("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [unique("uniq_content_tag").on(t.contentId, t.tagId)]
);

// 型エクスポート
export type Publisher   = typeof publishers.$inferSelect;
export type NewPublisher = typeof publishers.$inferInsert;
export type Source      = typeof sources.$inferSelect;
export type NewSource   = typeof sources.$inferInsert;
export type Content     = typeof contents.$inferSelect;
export type NewContent  = typeof contents.$inferInsert;
export type Tag         = typeof tags.$inferSelect;
