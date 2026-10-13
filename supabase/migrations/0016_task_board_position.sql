-- Kanban board position: a floating-point "fractional index" per task
-- (Trello's own approach) so dropping a card between two others only needs
-- to write one row (new_position = (before + after) / 2) instead of
-- renumbering the whole column. Nullable so existing rows default to null
-- until backfilled below; the app treats null as "goes to the end".

alter table public.tasks add column board_position double precision;

with ranked as (
  select id, row_number() over (
    partition by status
    order by due_date nulls last, created_at
  ) as rn
  from public.tasks
)
update public.tasks t
set board_position = ranked.rn * 1000
from ranked
where ranked.id = t.id;
