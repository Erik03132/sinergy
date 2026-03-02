-- Add 'web' to channel source_type check constraint
-- First drop the check constraint if it exists
alter table public.channels drop constraint if exists channels_source_type_check;
alter table public.channels add constraint channels_source_type_check check (source_type in ('youtube', 'telegram', 'web'));
