create table carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  carrier_id uuid references carriers,
  tracking_number text,
  status text default 'pending',
  origin text,
  destination text,
  eta timestamptz,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments not null,
  file_path text not null,
  extracted_data jsonb,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments not null,
  status text not null,
  location text,
  occurred_at timestamptz,
  created_at timestamptz default now()
);