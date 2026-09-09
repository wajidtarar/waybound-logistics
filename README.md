# Waybound

Waybound is an AI-powered logistics platform that extracts shipment data from documents and emails, tracks carrier events in real time, and automatically alerts teams to delays — a full-stack demo built with React, TypeScript, Supabase, and LLM-based document intelligence.

Built as a hands-on portfolio project demonstrating production-ready patterns for logistics SaaS: authenticated multi-tenant data with Row Level Security, typed end-to-end data flow, and (in later phases) AI document extraction, inbox intelligence, and live carrier tracking.

---

## Current Status

🚧 **In active development.** Core shipment dashboard is functional; AI extraction, email intelligence, and live tracking integrations are in progress.

| Milestone | Status |
|---|---|
| `v0.1.0` — Project scaffold, Supabase schema, RLS | ✅ Done |
| `v0.2.0` — Authentication (sign up, login, protected routes) | ✅ Done |
| `v0.3.0` — Shipment dashboard (list, detail, timeline, document upload) | ✅ Done |
| `v0.4.0` — AI document extraction + validation | 🔜 In progress |
| `v0.5.0` — Email/inbox intelligence | Planned |
| `v0.6.0` — Live carrier tracking integration | Planned |
| `v0.7.0` — Alerts & automated workflows | Planned |
| `v0.8.0` — Dashboard/UI polish | Planned |
| `v0.9.0` — Testing, CI/CD, error monitoring | Planned |
| `v1.0.0` — Full capstone demo | Planned |

## Tech Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS v4, shadcn/ui (Base UI, Nova preset)
- **Data fetching:** TanStack Query
- **Forms & validation:** React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Row Level Security, Realtime, Edge Functions)
- **Routing:** React Router

## Features

- **Authentication** — email/password sign-up and login with protected routes
- **Shipment management** — create, list, and view shipments with a status timeline
- **Document storage** — per-user, per-shipment document uploads with strict access-controlled storage policies
- **Row Level Security throughout** — every table enforces ownership at the database level, not just in application code

## Getting Started

```bash
npm install
```

Create a `.env` file with your Supabase project credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the schema and RLS policies in `supabase/schema.sql` and `supabase/rls-policies.sql` against your Supabase project via the SQL Editor.

```bash
npm run dev
```

## Project Structure

```
src/
  components/       UI components (ShipmentList, ShipmentDetail, auth forms)
  components/ui/    shadcn/ui primitives
  lib/              Supabase client, auth context, validation schemas
  types/            Shared TypeScript types
supabase/
  schema.sql        Database schema (tables)
  rls-policies.sql  Row Level Security policies and API grants
```

## Security Notes

- Row Level Security is enabled on every table; access is scoped to the authenticated user via `auth.uid()`, either directly (`shipments`) or through the owning shipment (`events`, `documents`).
- The Supabase Data API does not auto-expose new tables — every table requires an explicit grant before it's reachable, so API surface is always a deliberate decision rather than a default.
- Storage access follows the same per-user isolation pattern via path-scoped storage policies (`{user_id}/{shipment_id}/{filename}`).

## Roadmap

This project follows a phased build plan covering AI document extraction, email inbox intelligence, live carrier tracking, automated alerting, and full production readiness (testing, CI/CD, error monitoring). See project documentation for the detailed phase-by-phase plan.
