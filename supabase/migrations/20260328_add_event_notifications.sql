alter table events add column if not exists expected_responses int;
alter table events add column if not exists reminder_after_days int;

create table if not exists event_notifications (
  event_id text primary key references events(id) on delete cascade,
  notification_sent_at timestamptz,
  notification_reason text,
  created_at timestamptz default now()
);

alter table if exists event_notifications drop column if exists organizer_email;
alter table event_notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_notifications'
      and policyname = 'No one can read event notifications'
  ) then
    create policy "No one can read event notifications"
      on event_notifications for select using (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_notifications'
      and policyname = 'No one can create event notifications directly'
  ) then
    create policy "No one can create event notifications directly"
      on event_notifications for insert with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_notifications'
      and policyname = 'No one can update event notifications directly'
  ) then
    create policy "No one can update event notifications directly"
      on event_notifications for update using (false);
  end if;
end $$;
