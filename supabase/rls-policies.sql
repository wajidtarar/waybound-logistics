-- Enable RLS explicitly as well, for clarity (belt-and-suspenders with the project-level auto-RLS setting)
alter table shipments enable row level security;
alter table documents enable row level security;
alter table events enable row level security;

-- Policies: scope access to the owning user
create policy "Users can view own shipments"
  on shipments for select
  using (auth.uid() = user_id);

create policy "Users can insert own shipments"
  on shipments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shipments"
  on shipments for update
  using (auth.uid() = user_id);

-- Grants: make the table reachable via the Data API at all
grant select, insert, update, delete on public.shipments to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.events to authenticated;