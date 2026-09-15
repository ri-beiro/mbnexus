-- Extensions & shared utilities
create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic trigger: keeps updated_at in sync on every UPDATE.';
