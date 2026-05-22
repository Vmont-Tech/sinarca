-- Supabase nesta fase é apenas Postgres. A identidade canônica fica no backend_app
-- com auth própria Argon2/JWT; operações financeiras mutáveis usam backend com
-- service role/conexão de aplicação, e os papéis são validados pela auth própria.

alter table organizations enable row level security;
alter table inventory_regions enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_tags enable row level security;
alter table project_baselines enable row level security;
alter table certifications enable row level security;
alter table audits enable row level security;
alter table environmental_credits enable row level security;
alter table ledger_accounts enable row level security;
alter table ledger_entries enable row level security;
alter table purchases enable row level security;
alter table retirements enable row level security;
alter table treasury_positions enable row level security;
alter table yield_distributions enable row level security;
alter table chain_events enable row level security;
alter table external_chain_projects enable row level security;
alter table documents enable row level security;
alter table audit_events enable row level security;
alter table idempotency_keys enable row level security;

grant select on organizations, inventory_regions, projects, project_tags, project_baselines,
  certifications, audits, environmental_credits, chain_events, external_chain_projects
  to anon, authenticated;

revoke insert, update, delete on organizations, inventory_regions, profiles, projects, project_tags,
  project_baselines, certifications, audits, environmental_credits, ledger_accounts, ledger_entries,
  purchases, retirements, treasury_positions, yield_distributions, chain_events,
  external_chain_projects, documents, audit_events, idempotency_keys
  from anon, authenticated;

create policy "public read authorized organizations"
  on organizations for select
  to anon, authenticated
  using (authorized = true or role in ('Registry', 'Certifier', 'Auditor', 'Developer', 'Compensator'));

create policy "public read inventory regions"
  on inventory_regions for select
  to anon, authenticated
  using (true);

create policy "public read visible projects"
  on projects for select
  to anon, authenticated
  using (status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED'));

create policy "public read visible project tags"
  on project_tags for select
  to anon, authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = project_tags.project_id
        and projects.status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED')
    )
  );

create policy "public read visible baselines"
  on project_baselines for select
  to anon, authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = project_baselines.project_id
        and projects.status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED')
    )
  );

create policy "public read visible certifications"
  on certifications for select
  to anon, authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = certifications.project_id
        and projects.status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED')
    )
  );

create policy "public read visible audits"
  on audits for select
  to anon, authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = audits.project_id
        and projects.status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED')
    )
  );

create policy "public read available credits"
  on environmental_credits for select
  to anon, authenticated
  using (status in ('AVAILABLE', 'OWNED_OFFCHAIN', 'RETIRED'));

create policy "public read chain events for visible projects"
  on chain_events for select
  to anon, authenticated
  using (
    project_id is null
    or exists (
      select 1
      from projects
      where projects.id = chain_events.project_id
        and projects.status in ('ACTIVE', 'AVAILABLE', 'TOKENIZED_LOCKED', 'AWAITING_AUDIT', 'RETIRED')
    )
  );

create policy "public read wrapped external projects"
  on external_chain_projects for select
  to anon, authenticated
  using (status in ('LOCKED', 'WRAPPED_MINTED', 'ACTIVE'));

-- Sem politicas de insert/update/delete para anon/authenticated:
-- profiles, ledger_accounts, ledger_entries, purchases, retirements,
-- treasury_positions, yield_distributions, documents, audit_events e
-- idempotency_keys ficam fechadas para clientes diretos. O backend aplica
-- regras de negocio, idempotencia e autorizacao por papel antes de escrever.
