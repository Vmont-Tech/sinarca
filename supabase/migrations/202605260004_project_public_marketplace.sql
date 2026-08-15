alter table public.projects
  add column if not exists public_marketplace boolean not null default false;

create index if not exists projects_public_marketplace_ready_idx
  on public.projects (public_marketplace, status, blockchain_timestamp desc, created_at desc)
  where public_marketplace is true
    and status in ('ACTIVE', 'AVAILABLE');

update public.projects
set public_marketplace = true,
    updated_at = now()
where friendly_id in ('PRC-2024-002', 'PRC-2025-001', 'PRC-2025-002')
  and status in ('ACTIVE', 'AVAILABLE');
