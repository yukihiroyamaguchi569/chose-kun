# 調整さん風スケジュール調整アプリ

シンプルなスケジュール調整ツール。候補日を作成してURLを共有するだけで、参加者が ◯△× で回答できます。

## 機能

- イベント作成（タイトル・メモ・候補日時）
- URL共有で参加者を招待
- ◯△× での出欠回答
- コメント機能
- レスポンシブ対応

## 技術スタック

- **Next.js** 16 (App Router)
- **React** 19
- **TypeScript**
- **Tailwind CSS** 4
- **Supabase** (データベース)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成して Supabase の接続情報を設定:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase ダッシュボードの **Project Overview** トップに表示されています
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **Project Settings → API Keys** の「Legacy anon, service_role API keys」タブにある **anon public** の値を使用します

### 3. データベースの作成

Supabase ダッシュボードの左カラムから **SQL Editor** を開き、`supabase/schema.sql` の内容を貼り付けて **Run** を実行してテーブルを作成。

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## デプロイ

Vercel にデプロイ可能。GitHub リポジトリを連携すると `main` ブランチへのプッシュで自動デプロイされます。
