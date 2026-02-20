# APIリファレンス

Next.js App Router の Route Handlers (`app/api/`) で実装するエンドポイント一覧。

## ベースURL

- ローカル: `http://localhost:3000/api`
- 本番: `https://{your-project}.vercel.app/api`

---

## Publishers（パブリッシャー）

### 一覧取得

```
GET /api/publishers
```

**レスポンス:**

```json
[
  {
    "id": 1,
    "name": "Flowing Data",
    "description": "Data visualization blog by Nathan Yau",
    "type": "person",
    "createdAt": "2026-02-20T10:00:00Z",
    "sourcesCount": 2
  }
]
```

---

### 新規作成

```
POST /api/publishers
Content-Type: application/json
```

**リクエストボディ:**

```json
{
  "name": "Flowing Data",
  "description": "Data visualization blog by Nathan Yau",
  "type": "person"
}
```

**レスポンス:** `201 Created` + 作成したオブジェクト

---

### 取得（単体）

```
GET /api/publishers/{id}
```

---

### 更新

```
PUT /api/publishers/{id}
Content-Type: application/json
```

---

### 削除

```
DELETE /api/publishers/{id}
```

関連する `sources` と `contents` も CASCADE 削除される。

---

## Sources（収集ソース）

### 一覧取得

```
GET /api/sources
GET /api/sources?publisherId=1
GET /api/sources?platform=web
GET /api/sources?isActive=true
```

**レスポンス:**

```json
[
  {
    "id": 1,
    "publisherId": 1,
    "publisherName": "Flowing Data",
    "platform": "web",
    "url": "https://flowingdata.com/feed",
    "fetchConfig": { "limit": 50 },
    "lastFetchedAt": "2026-02-20T09:00:00Z",
    "isActive": true,
    "createdAt": "2026-02-20T10:00:00Z"
  }
]
```

---

### 新規作成

```
POST /api/sources
Content-Type: application/json
```

**リクエストボディ:**

```json
{
  "publisherId": 1,
  "platform": "web",
  "url": "https://flowingdata.com/feed",
  "fetchConfig": { "limit": 50 }
}
```

---

### 更新 / 削除

```
PUT  /api/sources/{id}
DELETE /api/sources/{id}
```

---

### 手動収集トリガー

```
POST /api/sources/{id}/collect
```

指定ソースの収集を即時実行する。管理画面の「今すぐ収集」ボタンから呼び出す。

**注意:** Vercel の Hobby プランではサーバーレス関数のタイムアウトが **10秒**。
多数のエントリーを処理する場合は GitHub Actions 経由を推奨。

**レスポンス:**

```json
{
  "collected": 12,
  "saved": 5,
  "skipped": 7
}
```

---

## Contents（収集コンテンツ）

### 一覧取得

```
GET /api/contents
GET /api/contents?sourceId=1
GET /api/contents?publisherId=1
GET /api/contents?q=scrollytelling
GET /api/contents?limit=20&offset=0
```

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `publisherId` | number | パブリッシャーで絞り込み |
| `sourceId` | number | ソースで絞り込み |
| `q` | string | タイトル・説明のキーワード検索 |
| `limit` | number | 1ページの件数（デフォルト: 20） |
| `offset` | number | オフセット（デフォルト: 0） |

**レスポンス:**

```json
{
  "items": [
    {
      "id": 1,
      "sourceId": 1,
      "publisherName": "Flowing Data",
      "title": "The Best Data Visualizations of 2025",
      "url": "https://flowingdata.com/2025/...",
      "publishedAt": "2025-12-31T00:00:00Z",
      "thumbnailUrl": null,
      "description": "...",
      "collectedAt": "2026-02-20T09:00:00Z"
    }
  ],
  "total": 342,
  "limit": 20,
  "offset": 0
}
```

---

### 取得（単体）

```
GET /api/contents/{id}
```

---

## Collect（収集実行）

### 全ソースを収集

```
POST /api/collect
Authorization: Bearer {CRON_SECRET}
```

GitHub Actions のスケジュールから呼び出す内部エンドポイント。
`CRON_SECRET` 環境変数で認証。

**GitHub Actions での呼び出し例:**

```yaml
- name: Collect contents
  run: |
    curl -X POST ${{ vars.APP_URL }}/api/collect \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**レスポンス:**

```json
{
  "sources": 8,
  "collected": 45,
  "saved": 12,
  "errors": 0,
  "duration_ms": 3421
}
```

---

## エラーレスポンス

全エンドポイント共通のエラー形式：

```json
{
  "error": "エラーメッセージ",
  "code": "NOT_FOUND"
}
```

| HTTPステータス | code | 説明 |
|--------------|------|------|
| 400 | `VALIDATION_ERROR` | リクエストパラメータ不正 |
| 401 | `UNAUTHORIZED` | 認証失敗 |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 500 | `INTERNAL_ERROR` | サーバーエラー |
