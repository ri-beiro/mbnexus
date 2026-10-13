-- Profile enrichment: a Teams deep link + WhatsApp number for the
-- hover contact card shown on avatars app-wide, and a birthday (date,
-- year included but only month/day are ever compared) used to show a
-- balloons celebration to the birthday person on the day they log in.
-- profiles_update_self (0005) already scopes writes to the owning row,
-- so no new RLS policy is needed for these columns.

alter table public.profiles add column teams_url text;
alter table public.profiles add column whatsapp_number text;
alter table public.profiles add column birthday date;
