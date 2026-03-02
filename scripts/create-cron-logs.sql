
-- Create the 'cron_logs' table to track automated task execution
create table if not exists public.cron_logs (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    status text not null check (status in ('success', 'error')),
    item_count integer default 0,
    message text,
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.cron_logs enable row level security;

-- Allow public read access to see the status in the UI
create policy "Allow public read access for cron logs"
    on public.cron_logs
    for select
    to public
    using (true);

-- Allow service role to insert logs
-- (Administrators/CLI tools will use this)
create policy "Allow service role insert access"
    on public.cron_logs
    for insert
    with check (true);

-- Add index for status queries
create index if not exists cron_logs_name_idx on public.cron_logs (name);
create index if not exists cron_logs_created_at_idx on public.cron_logs (created_at desc);
