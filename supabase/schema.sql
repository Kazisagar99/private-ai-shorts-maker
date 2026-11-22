create table if not exists public.short_projects (
  id uuid primary key,
  owner_email text not null,
  title text not null,
  youtube_url text,
  transcript text,
  analysis jsonb,
  cues jsonb default '[]'::jsonb,
  status text default 'draft',
  shorts_count integer default 0,
  updated_at timestamptz default now()
);

alter table public.short_projects enable row level security;

create policy "Deny all direct client access"
  on public.short_projects
  for all
  using (false)
  with check (false);
