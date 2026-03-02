-- Create the 'ideas' table
create table if not exists public.ideas (
  id uuid default gen_random_uuid() primary key,
  source text check (source in ('perplexity', 'user')) not null,
  title text not null,
  description text not null,
  created_at timestamptz default now() not null,

  -- Classification fields
  vertical text not null,
  core_tech text[] not null default '{}',
  target_audience text not null,
  business_model text not null,
  pain_point text[] not null default '{}',
  temporal_marker text not null,

  budget_estimate text check (budget_estimate in ('0-25k', '25k-50k', '50k-100k')),
  tags text[] default '{}',
  
  metadata jsonb
);

-- Enable RLS (Row Level Security)
alter table public.ideas enable row level security;

-- Create a policy that allows anyone to read ideas (for now, or restrict as needed)
create policy "Allow public read access"
  on public.ideas
  for select
  to public
  using (true);

-- Create a policy that allows authenticated users (or anon if needed for this stage) to insert
create policy "Allow insert access"
  on public.ideas
  for insert
  to public
  with check (true);

-- Add indexes for common query patterns if list grows
create index if not exists ideas_vertical_idx on public.ideas (vertical);
create index if not exists ideas_created_at_idx on public.ideas (created_at desc);
