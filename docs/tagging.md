# AIタグづけ

Claude Haiku を使って収集コンテンツに自動でタグを付与する機能。

## 概要

- **モデル**: `claude-haiku-4-5-20251001`（低コスト・高速）
- **タイミング**: 収集とは分離したバッチジョブとして実行
- **方式**: 事前定義したタグリストから該当するものを選択させる
- **コスト**: 1,000記事あたり約 $0.1〜0.2

## タグ分類体系 (`lib/tagger/taxonomy.ts`)

データ可視化コンテンツに特化したタグリスト。

```typescript
export const TAG_TAXONOMY = {
  // 表現形式
  format: [
    "chart",           // グラフ・チャート全般
    "map",             // 地図・マップ
    "infographic",     // インフォグラフィック
    "scrollytelling",  // スクロール連動ストーリー
    "interactive",     // インタラクティブ
    "animation",       // アニメーション
    "table",           // 表・データテーブル
    "illustration",    // イラスト・ビジュアル解説
  ],

  // テーマ
  topic: [
    "election",        // 選挙・政治
    "climate",         // 気候・環境
    "economy",         // 経済・市場
    "health",          // 医療・健康
    "society",         // 社会・人口統計
    "sports",          // スポーツ
    "technology",      // テクノロジー
    "science",         // 科学
    "conflict",        // 紛争・戦争
    "business",        // 企業・ビジネス
  ],

  // 技術・ツール
  tool: [
    "d3",              // D3.js
    "mapbox",          // Mapbox
    "observable",      // Observable Plot
    "flourish",        // Flourish
    "datawrapper",     // Datawrapper
    "tableau",         // Tableau
    "deckgl",          // Deck.gl
  ],
} as const;

// フラットなリスト（プロンプトに渡す用）
export const ALL_TAGS = Object.values(TAG_TAXONOMY).flat();
```

## 実装 (`lib/tagger/index.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { ALL_TAGS } from "./taxonomy";

const anthropic = new Anthropic();

export async function autoTag(
  title: string,
  description: string
): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `You are a tagging assistant for data visualization content.
Select the most relevant tags from the list below. Return ONLY a JSON array of tag strings, nothing else.

Available tags: ${ALL_TAGS.join(", ")}

Title: ${title}
Description: ${description ?? "(none)"}

Rules:
- Select 1 to 5 tags maximum
- Only use tags from the provided list
- Return JSON array only, e.g. ["chart", "election"]`,
      },
    ],
  });

  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const tags = JSON.parse(text);
    // リストにないタグを除外（安全策）
    return tags.filter((t: string) => ALL_TAGS.includes(t));
  } catch {
    return [];
  }
}
```

## APIエンドポイント (`app/api/tag/route.ts`)

```
POST /api/tag
Authorization: Bearer {CRON_SECRET}
```

タグなしのコンテンツをバッチで処理する。

**処理フロー:**

```
1. content_tags に紐づきのない contents を取得（最大 100件）
2. 各コンテンツを Claude Haiku に送信
3. 返ってきたタグを tags テーブルに upsert
4. content_tags テーブルに紐づけを保存
5. 結果を返す
```

**レスポンス例:**

```json
{
  "processed": 23,
  "tagged": 21,
  "skipped": 2,
  "duration_ms": 8432
}
```

## GitHub Actions 設定

収集ジョブの後にタグづけジョブを実行する：

```yaml
# .github/workflows/collect.yml

name: Collect and Tag

on:
  schedule:
    - cron: '0 * * * *'   # 毎時実行
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Collect RSS contents
        run: |
          curl -s -X POST "${{ vars.APP_URL }}/api/collect" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  tag:
    runs-on: ubuntu-latest
    needs: collect          # 収集完了後に実行
    steps:
      - name: Auto-tag new contents
        run: |
          curl -s -X POST "${{ vars.APP_URL }}/api/tag" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 手動タグづけ（管理画面から）

- コンテンツ詳細ページから任意のタグを追加・削除できる
- AIが付けたタグを修正・削除することも可能
- AIタグ付与済みかどうかを `contents` テーブルの `auto_tagged_at` カラムで管理

## コスト試算

| 条件 | トークン数 | コスト |
|------|-----------|--------|
| 1記事あたり（入力） | 約150トークン | $0.00012 |
| 1記事あたり（出力） | 約20トークン | $0.00008 |
| **1記事合計** | **約170トークン** | **$0.0002** |
| 1,000記事 | — | **約$0.20** |
| 10,000記事 | — | **約$2.00** |

Claude Haiku の料金: 入力 $0.80/1M tokens、出力 $4.00/1M tokens（2026年2月時点）

## タグ体系を拡張するには

`lib/tagger/taxonomy.ts` の `TAG_TAXONOMY` にタグを追加するだけ。
既存コンテンツへの遡及タグづけは、管理画面の「未タグコンテンツを再タグ付け」ボタンから実行。
