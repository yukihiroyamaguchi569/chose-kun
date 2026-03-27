# 調整さん風スケジュール調整アプリ

シンプルなスケジュール調整ツール。候補日を作成してURLを共有するだけで、参加者が ◯△× で回答できます。

## 機能

- イベント作成（タイトル・メモ・候補日時）
- 候補日時のカレンダー入力
  右側カレンダーの日付クリックで `19:00〜` の候補を自動追加
- URL共有で参加者を招待
- ◯△× での出欠回答
- コメント機能
- 回答進捗のSlack通知
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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
APP_BASE_URL=http://localhost:3000
CRON_SECRET=your-random-cron-secret
```

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase ダッシュボードの **Project Overview** トップに表示されています
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **Project Settings → API Keys** の「Legacy anon, service_role API keys」タブにある **anon public** の値を使用します
- `SUPABASE_SERVICE_ROLE_KEY` — 同じ画面にある **service_role** の値です。通知状態の更新に使います
- `SLACK_WEBHOOK_URL` — Slack Incoming Webhook のURL
- `APP_BASE_URL` — Slack通知本文に載せるイベントURLのベースURL
- `CRON_SECRET` — cron エンドポイント保護用のランダム文字列

### 3. データベースの作成

Supabase ダッシュボードの左カラムから **SQL Editor** を開き、`supabase/schema.sql` の内容を貼り付けて **Run** を実行してテーブルを作成。

既存DBに今回の通知機能を追加する場合は、`supabase/migrations/20260328_add_event_notifications.sql` を実行してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## デプロイ

Vercel にデプロイ可能。GitHub リポジトリを連携すると `main` ブランチへのプッシュで自動デプロイされます。

本番URL: https://nextjs-boilerplate-henna-five-47.vercel.app/

`vercel.json` には `GET /api/cron/event-notifications` を 1日1回起動する Cron 設定を入れています。スケジュールは UTC で `0 0 * * *` です。

## 回答進捗通知

イベント作成時に以下を入力すると、Slack チャンネルに通知できます。

- 目安回答人数
- 通知までの日数

通知は一度だけ送られます。

- 回答人数が目安人数に達したら、その時点で送信
- 達しないまま指定日数が過ぎたら、現在の回答人数で送信
