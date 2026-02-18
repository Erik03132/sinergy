-- Create the 'synergies' table to store results of AI radical synthesis
create table if not exists public.synergies (
    id uuid default gen_random_uuid() primary key,
    idea_a_id uuid references public.ideas(id) on delete cascade,
    idea_b_id uuid references public.ideas(id) on delete cascade,
    synergy_title text not null,
    synergy_description text not null,
    logic_chain text,
    score numeric,
    metadata jsonb default '{}',
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.synergies enable row level security;

-- Allow public read access
create policy "Allow public read access for synergies"
    on public.synergies
    for select
    to public
    using (true);

-- Allow service role/authenticated to insert
create policy "Allow insert access for synergies"
    on public.synergies
    for insert
    to public
    with check (true);

-- Add index for idea lookups
create index if not exists synergies_ideas_idx on public.synergies (idea_a_id, idea_b_id);
create index if not exists synergies_created_at_idx on public.synergies (created_at desc);
