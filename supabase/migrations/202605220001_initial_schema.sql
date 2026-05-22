create extension if not exists "uuid-ossp";

create type user_role as enum ('producer', 'auditor', 'company', 'certifier', 'admin');

create type project_status as enum (
  'DRAFT',
  'CREATED',
  'REGISTERED',
  'BASELINE_PENDING',
  'AWAITING_CERTIFICATION',
  'CERTIFIED_AWAITING_TREASURY',
  'TOKENIZED_LOCKED',
  'AWAITING_AUDIT',
  'AUDITED',
  'ACTIVE',
  'AVAILABLE',
  'RESERVED',
  'TRANSFERRED',
  'BLOCKED_AUDIT_REQUIRED',
  'RECALCULATION_REQUIRED',
  'SUSPENDED',
  'RETIRED'
);

create type credit_status as enum (
  'LOCKED',
  'AVAILABLE',
  'RESERVED',
  'OWNED_OFFCHAIN',
  'RETIRED',
  'BURNED',
  'SUSPENDED'
);

create type ledger_entry_type as enum (
  'CREDIT_ISSUED',
  'PURCHASE',
  'RECEIVED',
  'TRANSFER_SENT',
  'RETIREMENT',
  'MINT',
  'BURN',
  'RESERVE',
  'YIELD',
  'ADJUSTMENT'
);

create type chain_event_type as enum (
  'MINT_LOCKED',
  'UNLOCK',
  'TRANSFER',
  'BURN',
  'SPONSORED_RESERVE',
  'PIX_CONFIRMED',
  'TREASURY_LOCK',
  'VAULT_LOCK',
  'WRAPPED_MINT',
  'STATUS_CHECK'
);

create type external_chain as enum ('stellar', 'soroban', 'etherfuse', 'polygon');

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null unique,
  name text not null,
  role text not null,
  document text,
  website text,
  logo_url text,
  authorized boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inventory_regions (
  id text primary key,
  uf text not null unique,
  name text not null,
  description text not null,
  status text not null,
  emissions jsonb not null,
  local_contributions jsonb not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null unique,
  organization_id uuid references organizations(id),
  name text not null,
  email text not null,
  document text,
  role user_role not null,
  password_hash text not null,
  phone text,
  avatar_url text,
  gov_level text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email)
);

create unique index profiles_email_lower_idx on profiles (lower(email));

create table projects (
  id uuid primary key default uuid_generate_v4(),
  friendly_id text not null unique,
  source_hash text unique,
  version text not null default 'v1.0',
  name text not null,
  description text not null default '',
  baseline text,
  methodology text not null,
  methodology_link text,
  status project_status not null default 'REGISTERED',
  producer_organization_id uuid references organizations(id),
  developer_organization_id uuid references organizations(id),
  auditor_organization_id uuid references organizations(id),
  certifier_organization_id uuid references organizations(id),
  registry_organization_id uuid references organizations(id),
  city text not null,
  state text not null,
  state_id text not null,
  biome text not null,
  latitude numeric(10, 6) not null,
  longitude numeric(10, 6) not null,
  svg_x numeric(10, 2),
  svg_y numeric(10, 2),
  area_hectares numeric(14, 2) not null,
  carbon_stock numeric(18, 2) not null,
  investment_value_brl numeric(18, 2) not null default 0,
  vintage text not null,
  image_url text,
  serial_start text,
  serial_end text,
  contract_address text,
  merkle_root text,
  block_height bigint,
  blockchain_timestamp timestamptz,
  timeline jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_tags (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  tag_uid text not null,
  cmac text not null,
  latitude numeric(10, 6) not null,
  longitude numeric(10, 6) not null,
  vertex_label text not null,
  status text not null default 'ACTIVE',
  first_seen_at timestamptz not null,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index project_tags_tag_uid_idx on project_tags (tag_uid);
create index project_tags_project_id_idx on project_tags (project_id);

create table project_baselines (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  sentinel_scene_id text not null,
  baseline_hash text not null,
  points_analyzed integer not null,
  vegetation_cover_pct numeric(6, 3) not null,
  ndvi_mean numeric(6, 3) not null,
  captured_at timestamptz not null,
  evidence_uri text,
  created_at timestamptz not null default now()
);

create unique index project_baselines_baseline_hash_idx on project_baselines (baseline_hash);
create index project_baselines_project_id_idx on project_baselines (project_id);

create table certifications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  certifier_organization_id uuid references organizations(id),
  certifier_profile_id uuid references profiles(id),
  methodology text not null,
  credit_potential numeric(18, 2) not null,
  decision text not null,
  notes text,
  signed_document_hash text,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table audits (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  auditor_organization_id uuid references organizations(id),
  auditor_profile_id uuid references profiles(id),
  status text not null,
  report_text text,
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  evidence_urls jsonb not null default '[]'::jsonb,
  digital_signature text,
  audited_at timestamptz,
  created_at timestamptz not null default now()
);

create table environmental_credits (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  vintage text not null,
  quantity_total numeric(18, 2) not null,
  quantity_available numeric(18, 2) not null,
  quantity_retired numeric(18, 2) not null default 0,
  status credit_status not null default 'LOCKED',
  unit text not null default 'tCO2e',
  token_metadata jsonb not null default '{}'::jsonb,
  serial_start text,
  serial_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index environmental_credits_project_vintage_idx on environmental_credits (project_id, vintage);

create table ledger_accounts (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null unique,
  owner_profile_id uuid references profiles(id),
  owner_organization_id uuid references organizations(id),
  project_id uuid references projects(id),
  account_type text not null,
  currency text not null default 'tCO2e',
  balance numeric(18, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ledger_accounts_owner_present check (
    owner_profile_id is not null or owner_organization_id is not null or project_id is not null
  )
);

create unique index ledger_accounts_org_type_idx on ledger_accounts (owner_organization_id, account_type) where owner_organization_id is not null;
create unique index ledger_accounts_project_type_idx on ledger_accounts (project_id, account_type) where project_id is not null;

create table purchases (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  buyer_profile_id uuid references profiles(id),
  buyer_organization_id uuid references organizations(id),
  credit_id uuid references environmental_credits(id),
  quantidade numeric(18, 2) not null,
  unit_price_brl numeric(18, 2) not null,
  total_value_brl numeric(18, 2) not null,
  platform_fee_brl numeric(18, 2) not null default 0,
  receipt_hash text,
  status text not null default 'SETTLED',
  idempotency_key text not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index purchases_idempotency_key_idx on purchases (idempotency_key);

create unique index certifications_project_decision_idx on certifications (project_id, decision);
create unique index audits_project_status_idx on audits (project_id, status);

create table retirements (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  owner_profile_id uuid references profiles(id),
  owner_organization_id uuid references organizations(id),
  amount numeric(18, 2) not null,
  unit text not null default 'tCO2e',
  emissions_data jsonb not null default '{}'::jsonb,
  certificate_hash text,
  burn_hash text,
  documentation_uri text,
  status text not null default 'COMPLETED',
  idempotency_key text not null,
  retired_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index retirements_idempotency_key_idx on retirements (idempotency_key);

create table ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid not null references ledger_accounts(id),
  entry_type ledger_entry_type not null,
  amount numeric(18, 2) not null,
  unit text not null,
  project_id uuid references projects(id),
  purchase_id uuid references purchases(id),
  retirement_id uuid references retirements(id),
  idempotency_key text not null,
  counterparty text,
  chain_event_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index ledger_entries_idempotency_key_idx on ledger_entries (idempotency_key);
create index ledger_entries_account_id_idx on ledger_entries (account_id);

create table treasury_positions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  provider text not null,
  principal_brl numeric(18, 2) not null,
  instrument text not null,
  external_reference text not null,
  status text not null,
  opened_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index treasury_positions_external_reference_idx on treasury_positions (external_reference);

create table yield_distributions (
  id uuid primary key default uuid_generate_v4(),
  treasury_position_id uuid not null references treasury_positions(id) on delete cascade,
  gross_yield_brl numeric(18, 2) not null,
  operational_brl numeric(18, 2) not null,
  social_vault_brl numeric(18, 2) not null,
  distribution_month date not null,
  status text not null default 'BOOKED',
  created_at timestamptz not null default now()
);

create unique index yield_distributions_position_month_idx on yield_distributions (treasury_position_id, distribution_month);

create table chain_events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  event_type chain_event_type not null,
  chain external_chain not null,
  transaction_hash text,
  source_tx_hash text,
  amount numeric(18, 2),
  status text not null default 'RECORDED',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index chain_events_source_tx_hash_idx on chain_events (source_tx_hash) where source_tx_hash is not null;

create table external_chain_projects (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  chain external_chain not null,
  vault_address text not null,
  source_token_address text not null,
  source_tx_hash text not null,
  wrapped_stellar_asset text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index external_chain_projects_source_tx_hash_idx on external_chain_projects (source_tx_hash);

alter table ledger_entries
  add constraint ledger_entries_chain_event_id_fkey
  foreign key (chain_event_id) references chain_events(id);

create table documents (
  id uuid primary key default uuid_generate_v4(),
  owner_profile_id uuid references profiles(id),
  owner_organization_id uuid references organizations(id),
  project_id uuid references projects(id),
  document_type text not null,
  storage_path text not null,
  sha256_hash text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index documents_sha256_hash_idx on documents (sha256_hash);

create table audit_events (
  id uuid primary key default uuid_generate_v4(),
  actor_profile_id uuid references profiles(id),
  actor_role user_role,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table idempotency_keys (
  id uuid primary key default uuid_generate_v4(),
  key text not null,
  scope text not null,
  request_hash text not null,
  response_payload jsonb,
  status text not null default 'RECORDED',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index idempotency_keys_key_scope_idx on idempotency_keys (key, scope);
