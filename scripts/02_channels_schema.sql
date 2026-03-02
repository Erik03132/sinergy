-- Create the 'channels' table for source monitoring
create table if not exists public.channels (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  url text not null unique,
  source_type text check (source_type in ('youtube', 'telegram')) not null,
  last_scanned_at timestamptz default now(),
  created_at timestamptz default now() not null
);

-- Enable RLS (Row Level Security)
alter table public.channels enable row level security;

-- Simple public access for MVP stage (adjust for production)
create policy "Allow public read channels" on public.channels for select to public using (true);
create policy "Allow public insert channels" on public.channels for insert to public with check (true);
create policy "Allow public update channels" on public.channels for update to public using (true);
create policy "Allow public delete channels" on public.channels for delete to public using (true);

-- Ensure indexes
create index if not exists channels_source_type_idx on public.channels (source_type);
create index if not exists channels_last_scanned_idx on public.channels (last_scanned_at desc);

-- Add 'needs_repair' to 'ideas' if not present (to track incomplete AI analysis)
-- This is already tracked via 'source' and 'metadata', but let's add a clear flag.
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name='ideas' and column_name='needs_repair') then
        alter table public.ideas add column needs_repair boolean default false;
    end if;
end $$;
