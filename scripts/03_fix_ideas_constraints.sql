-- Add 'automatic' to source check constraint
alter table public.ideas drop constraint if exists ideas_source_check;
alter table public.ideas add constraint ideas_source_check check (source in ('perplexity', 'user', 'automatic'));

-- Fix potential missing vertical error in save API
-- Make 'vertical' optional or default to 'General' if not provided
alter table public.ideas alter column vertical set default 'General';
