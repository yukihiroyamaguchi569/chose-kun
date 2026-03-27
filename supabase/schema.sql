-- 調整さんクローン - DBスキーマ
-- Supabase SQL Editor で実行してください

-- イベントテーブル
create table if not exists events (
  id text primary key,
  title text not null,
  memo text default '',
  created_at timestamptz default now()
);

-- 候補日時テーブル
create table if not exists candidates (
  id uuid default gen_random_uuid() primary key,
  event_id text not null references events(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

-- 回答テーブル
create table if not exists responses (
  id uuid default gen_random_uuid() primary key,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  answers jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- コメントテーブル
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz default now()
);

-- インデックス
create index if not exists idx_candidates_event on candidates(event_id);
create index if not exists idx_responses_event on responses(event_id);
create index if not exists idx_comments_event on comments(event_id);

-- RLS (Row Level Security) - 全員アクセス可能（認証不要）
alter table events enable row level security;
alter table candidates enable row level security;
alter table responses enable row level security;
alter table comments enable row level security;

create policy "Anyone can read events" on events for select using (true);
create policy "Anyone can create events" on events for insert with check (true);

create policy "Anyone can read candidates" on candidates for select using (true);
create policy "Anyone can create candidates" on candidates for insert with check (true);

create policy "Anyone can read responses" on responses for select using (true);
create policy "Anyone can create responses" on responses for insert with check (true);
create policy "Anyone can update responses" on responses for update using (true);

create policy "Anyone can read comments" on comments for select using (true);
create policy "Anyone can create comments" on comments for insert with check (true);
