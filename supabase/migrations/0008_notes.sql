-- Notes module (Notion-like pages/blocks). Phase 5 UI; schema defined now.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  parent_note_id uuid references public.notes (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default 'Sem título',
  icon text,
  position integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notes_org on public.notes (organization_id);
create index idx_notes_owner on public.notes (owner_profile_id);
create index idx_notes_parent on public.notes (parent_note_id);
create index idx_notes_project on public.notes (project_id);

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create type public.note_block_type as enum (
  'paragraph', 'heading', 'bulleted_list', 'numbered_list', 'checklist',
  'table', 'code', 'image', 'link', 'attachment'
);

create table public.note_blocks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  type public.note_block_type not null default 'paragraph',
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_note_blocks_note on public.note_blocks (note_id);

create trigger trg_note_blocks_updated_at
  before update on public.note_blocks
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.note_blocks enable row level security;

create policy notes_select on public.notes
  for select to authenticated
  using (
    owner_profile_id = auth.uid()
    or public.is_super_admin()
    or (project_id is not null and project_id in (
      select id from public.projects
      where created_by = auth.uid() or owner_profile_id = auth.uid()
        or id in (select project_id from public.project_members where profile_id = auth.uid())
    ))
  );

create policy notes_write on public.notes
  for all to authenticated
  using (owner_profile_id = auth.uid() or public.is_super_admin())
  with check (owner_profile_id = auth.uid() or public.is_super_admin());

create policy note_blocks_all on public.note_blocks
  for all to authenticated
  using (note_id in (select id from public.notes))
  with check (note_id in (select id from public.notes));
