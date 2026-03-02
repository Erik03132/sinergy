-- Allow public delete for ideas (MVP mode)
create policy "Allow public delete access"
  on public.ideas
  for delete
  to public
  using (true);
