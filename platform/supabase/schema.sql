-- Lorel & Coke platform — Supabase schema (Phase 0).
-- DRAFT: review, then apply via the Supabase SQL editor / migration once keys
-- are provided. Refine column types/constraints during the build.
--
-- "Don't-lose-anything" mapping (old Vite shapes → new columns) is noted inline.
-- Golden rule: the public RSVP form and the planner guest list write the SAME
-- `guests` table.

-- ─────────────────────────────────────────────────────────────────────────────
-- settings — single-tenant config (one row, future-proofs multi-wedding)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists settings (
  id               int primary key default 1,
  couple_names     text    not null default 'Lorel & Coke', -- DEFAULT_SETTINGS.bride + groom
  event_date       date,                                     -- weddingDate (Oct 2026)
  currency         text    not null default 'MXN',
  invitees_target  int     not null default 450,             -- totalInvitees (RSVP denominator)
  cancel_rate      numeric not null default 11,              -- cancellationRate
  contingency      numeric not null default 5,
  constraint settings_singleton check (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- households — NEW: groups guests under one magic-link token
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists households (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null,        -- unguessable; the magic-link key (≥128-bit)
  display_name  text not null,               -- "Familia Hernández", "College crew"
  side          text check (side in ('lorel','coke')),
  group_label   text,                        -- ported from old guest.group
  invited_seats int,                         -- max headcount (covers not-yet-named seats)
  notes         text,
  no_viene      boolean not null default false, -- CSV "No viene": expected not to attend (still invited)
  dudoso        boolean not null default false, -- CSV "Dudoso": attendance in doubt
  invite_round  int     not null default 1,     -- CSV "Lista 1 o 2": 2 = hold until an L1 spot frees up
  name_override text,                            -- CSV "Full invitation name" (''/null = derive "Nombre Apellido")
  responded_at  timestamptz,                 -- set when RSVP submitted
  created_at    timestamptz not null default now()
);

-- 2026-07 guest-list-final migration (idempotent; safe on fresh and existing DBs)
alter table if exists households add column if not exists no_viene      boolean not null default false;
alter table if exists households add column if not exists dudoso        boolean not null default false;
alter table if exists households add column if not exists invite_round  int     not null default 1;
alter table if exists households add column if not exists name_override text;
-- 2026-07 RSVP asistentes: cuántos confirman (null = sin responder; 0 = no vienen)
alter table if exists households add column if not exists confirmed_seats int;
-- 2026-07 idioma de la invitación ('es' | 'en'); en = invitados de USA con nombre en inglés
alter table if exists households add column if not exists lang text not null default 'es';
-- 2026-07 grupo de envío (oleadas de invitación; null = sin asignar)
alter table if exists households add column if not exists send_group int;

-- ─────────────────────────────────────────────────────────────────────────────
-- guests — old SEED_GUESTS exploded into named rows under households.
--   plus_one (old: total seats/row) → one guests row per person, with leftover
--   unnamed seats represented by households.invited_seats.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists guests (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid references households(id) on delete cascade,
  first_name        text,                    -- old: first
  last_name         text,                    -- old: last
  side              text check (side in ('lorel','coke')),
  is_primary        boolean not null default false,
  phone             text,                    -- powers WhatsApp deep-link
  -- RSVP fields (written by the public form, read by the planner):
  attending         boolean,                 -- null = no response (old rsvp: Confirmed→t, Declined→f, Pending→null)
  dietary           text,                    -- old: dietary
  accommodation     text,                    -- NEW
  -- planner-side fields:
  invitation_status text not null default 'not_sent'
                    check (invitation_status in ('not_sent','sent','delivered')), -- old inv_sent
  notes             text
);
create index if not exists guests_household_idx on guests(household_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- link_events — first-party tracking that powers the three-state funnel
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists link_events (
  id            bigserial primary key,
  household_id  uuid references households(id) on delete cascade,
  type          text not null check (type in ('opened','rsvp_started','rsvp_submitted')),
  occurred_at   timestamptz not null default now(),
  user_agent    text,
  ip_hash       text,                        -- hashed, privacy-safe
  referrer      text
);
create index if not exists link_events_household_idx on link_events(household_id);
create index if not exists link_events_type_idx on link_events(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- fixed_costs — old SEED_FIXED (16 rows). balance = amount - paid (derived).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists fixed_costs (
  id         uuid primary key default gen_random_uuid(),
  category   text,
  vendor     text,                           -- old: name
  amount     numeric not null default 0,
  paid       numeric not null default 0,
  due_date   text,                           -- old: due (kept text: holds ISO or "Pagado")
  status     text not null default 'Por Definir'
             check (status in ('Anticipo pagado','Cotizado','Por Definir','Pagado completo','Cancelado')),
  is_approx  boolean not null default false, -- old: approx
  notes      text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- variable_costs — old SEED_VARIABLE (3 rows).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists variable_costs (
  id         uuid primary key default gen_random_uuid(),
  category   text,
  concept    text,                           -- old: name
  unit_cost  numeric not null default 0,
  applies_to text not null default 'attendees' check (applies_to in ('attendees','invitees')),
  min_guests int not null default 0,
  is_approx  boolean not null default false, -- old: approx
  notes      text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Public-site content
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists registry_links (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  url        text not null,
  image_url  text,
  sort_order int not null default 0
);

create table if not exists gallery_images (
  id           uuid primary key default gen_random_uuid(),
  section      text,                         -- hero | story | venue | ...
  storage_path text not null,                -- Supabase Storage path
  caption      text,
  sort_order   int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log — replaces the old Gist changelog idea
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id         bigserial primary key,
  role       text,                           -- 'planner' | 'couple'
  action     text,
  entity     text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- 2026-07 feed de actividad (campana de notificaciones)
-- household_id SIN foreign key a propósito: importGuests hace
-- `truncate households ... cascade`; un FK arrastraría el audit_log.
-- Nombres denormalizados en payload — el feed sobrevive re-imports.
-- role acepta también 'guest' (eventos del lado del invitado).
alter table if exists audit_log add column if not exists household_id uuid;
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- admin_credentials — custom two-role login (hashed). No per-user accounts in v1.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists admin_credentials (
  role          text primary key check (role in ('planner','couple')),
  password_hash text not null
);

-- 2026-07 "desde tu última visita" por rol (divisor del feed de actividad)
alter table if exists admin_credentials add column if not exists feed_seen_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- Funnel reference (implemented as queries / a view in Phase 4):
--   never_opened  = households with zero 'opened' link_events
--   opened_no_rsvp= households with >=1 'opened' AND responded_at IS NULL
--   confirmed     = households with responded_at set
--   progress      = Σ(guests where attending) / settings.invitees_target
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTE on RLS: with the custom (non-Supabase-Auth) role login, all DB access
-- goes through Next.js server code using the service-role key (server-side only).
-- Enable RLS + deny-by-default on every table so the anon/public key cannot read
-- households/guests/tokens directly from the browser. Policies added in Phase 1.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09 Mesas (acomodo de invitados). Ver docs/superpowers/specs/2026-09-16-mesas-seating-design.md
-- ─────────────────────────────────────────────────────────────────────────────
-- Inventario reservado con el proveedor (tope duro en el mapa).
alter table if exists settings add column if not exists tables_round  int not null default 20;
alter table if exists settings add column if not exists tables_square int not null default 8;
alter table if exists settings add column if not exists tables_rect   int not null default 12;

-- Mesas colocadas en el plano. x,y en unidades del plano (espacio 960x540 del
-- PDF del jardín). La mesa de honor es una fila locked (no se mueve ni borra).
-- Capacidades (2026-09-24): redonda 12, cuadrada 10, rectangular 10, honor 13.
-- (La capacidad efectiva se deriva de lib/seating CAPACITY al leer; la columna es informativa.)
-- Al cambiarlas en lib/seating.ts hay que actualizar las filas existentes:
--   update venue_tables set capacity = 12 where shape = 'round';
--   update venue_tables set capacity = 13 where shape = 'head';
create table if not exists venue_tables (
  id         uuid primary key default gen_random_uuid(),
  shape      text not null check (shape in ('round','square','rect','head')),
  x          numeric not null,
  y          numeric not null,
  rotation   int not null default 0 check (rotation in (0, 90)),
  capacity   int not null,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Partes de un hogar con más de 2 pases confirmados ("Juan y Lupita", 2).
-- Los hogares de 1–2 pases no tienen filas aquí: se sientan completos.
create table if not exists seating_parties (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  label        text not null,
  seats        int  not null check (seats > 0),
  sort         int  not null default 0
);
create index if not exists seating_parties_household_idx on seating_parties(household_id);

-- Dónde se sienta cada unidad (hogar completo o parte). seat_index = primer
-- asiento; ocupa `seats` asientos consecutivos (circular salvo 'head').
-- seats y label van congelados al sentar: la ocupación y las listas sobreviven
-- aunque el hogar cambie de confirmación (el conflicto se marca, no se pierde).
create table if not exists seat_assignments (
  id           uuid primary key default gen_random_uuid(),
  table_id     uuid not null references venue_tables(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  party_id     uuid references seating_parties(id) on delete cascade,
  seat_index   int  not null check (seat_index >= 0),
  seats        int  not null check (seats > 0),
  label        text not null default '',
  created_at   timestamptz not null default now()
);
create unique index if not exists seat_assignments_unit_idx
  on seat_assignments (household_id, coalesce(party_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists seat_assignments_table_idx on seat_assignments(table_id);

-- Bitácora de movimientos. Tabla propia (NO audit_log) para no inundar la
-- campana. Nombres y números de mesa denormalizados en payload.
create table if not exists seating_log (
  id         bigserial primary key,
  role       text,
  action     text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists seating_log_created_idx on seating_log (created_at desc);
