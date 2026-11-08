-- Per-user report history for ResearchPilot.
--
-- The backend inserts rows with the service-role key (which bypasses RLS) once a
-- research job completes. Signed-in users can read and delete only their own rows
-- directly from the browser with the anon key + their session.

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  thread_id     text not null unique,
  topic         text not null,
  analysts      jsonb not null default '[]'::jsonb,
  sources       jsonb not null default '[]'::jsonb,
  final_report  text not null,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz not null default now()
);

create index if not exists reports_user_completed_idx
  on public.reports (user_id, completed_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can read their own reports" on public.reports;
create policy "Users can read their own reports"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own reports" on public.reports;
create policy "Users can delete their own reports"
  on public.reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update policies: only the backend (service role) writes reports.
revoke insert, update on public.reports from anon, authenticated;
grant select, delete on public.reports to authenticated;
