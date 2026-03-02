
-- Add new columns for Sprint 2 features
alter table public.ideas 
add column if not exists is_favorite boolean default false,
add column if not exists original_url text,
add column if not exists is_synergy boolean default false;

-- Create index for favorites
create index if not exists ideas_favorite_idx on public.ideas (is_favorite) where is_favorite = true;
