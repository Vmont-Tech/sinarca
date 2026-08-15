---
phase: 04-certification-workbench
plan: 01
subsystem: database
tags: [postgres, supabase, sqlalchemy, pytest, rls, migrations]

# Dependency graph
requires:
  - phase: 01-backend-rebuild
    provides: backend_app runtime, Supabase Postgres local, SQLAlchemy models base, seed.sql conventions
provides:
  - "Migration 202608150001_certification_workbench.sql: certifications passa a ser append-only, tabelas certification_pendencies e treasury_authorizations com RLS"
  - "Modelos SQLAlchemy CertificationPendency e TreasuryAuthorization espelhando o schema novo"
  - "tests/test_certifier_workbench.py: contrato Nyquist com 9 testes RED (CERT-01..05, D-09, D-10, D-14/D-19)"
  - "seed.sql compativel com o schema novo, com dossie minimo (LEGAL_OWNERSHIP + FOREST_INVENTORY) para PRC-2026-010/011"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decisoes append-only: constraint UNIQUE(project_id, decision) removida, substituida por indice (project_id, created_at desc); nunca fazer UPDATE em certifications, sempre INSERT."
    - "Pendencia/autorizacao operacional sem policy de SELECT: RLS habilitada + revoke insert/update/delete de anon/authenticated; acesso exclusivo via backend_app com auth propria."

key-files:
  created:
    - supabase/migrations/202608150001_certification_workbench.sql
    - tests/test_certifier_workbench.py
  modified:
    - backend_app/db/models.py
    - supabase/seed.sql
    - supabase/migrations/202605270002_storage_buckets.sql (rename de 202605270001, ver Deviations)
    - tests/db/test_schema_contract.py

key-decisions:
  - "Constraint unica (project_id, decision) de certifications removida e substituida por indice; append-only sera garantido no plano 03 (sempre INSERT)."
  - "certification_pendencies e treasury_authorizations sem policy de SELECT: dados operacionais internos, expostos apenas pelo backend_app."
  - "Producer organization external_id confirmado como 'prod-001' no seed (nao 'prd-001' como no rascunho do plano)."

patterns-established:
  - "Testes de integracao Wave 0 (contrato Nyquist) sao criados RED e ficam verdes conforme os planos seguintes implementam o modulo certifier.service."

requirements-completed: [CERT-01, CERT-02, CERT-03, CERT-04, CERT-05]

# Metrics
duration: 25min
completed: 2026-08-15
---

# Phase 04 Plan 01: Fundacao de Dados da Bancada de Certificacao Summary

**Migration com decisões append-only + tabelas de pendências/autorização de tesouraria, modelos SQLAlchemy espelhados e contrato de 9 testes de integração RED para CERT-01..05.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-15T12:36:48Z
- **Tasks:** 3/3
- **Files modified:** 6 (2 criados: migration + testes; 4 modificados: models.py, seed.sql, migration renomeada, teste de schema)

## Accomplishments
- Migration `202608150001_certification_workbench.sql` remove a constraint única `(project_id, decision)` de `certifications` e cria `certification_pendencies` e `treasury_authorizations` com RLS habilitada e sem policy de SELECT (acesso só via backend_app).
- `backend_app/db/models.py` ganha `CertificationPendency` e `TreasuryAuthorization`, espelhando 1:1 as colunas SQL; `Certification` perde `UniqueConstraint` e ganha `Index(project_id, created_at)`.
- `supabase/seed.sql` ajustado: `certifications` passa a ser populado via `delete` + `insert` sem `ON CONFLICT` (a constraint que o `ON CONFLICT (project_id, decision)` referenciava não existe mais); `documents` usa `ON CONFLICT (project_id, sha256_hash)` (o índice único real, já que `documents_sha256_hash_idx` foi relaxado em `202605270001`); dossiê mínimo (`LEGAL_OWNERSHIP` + `FOREST_INVENTORY`) adicionado para `PRC-2026-010` e `PRC-2026-011`.
- `tests/test_certifier_workbench.py` criado com os 9 testes de integração exigidos pelo `04-VALIDATION.md` (CERT-01..05 + D-09 append-only + D-10 fila de correção + D-14/D-19 rollback atômico), todos RED hoje porque `backend_app.modules.certifier.service` ainda não existe.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar migration de schema da bancada de certificação e ajustar o seed** - `687e4c2` (feat)
2. **Task 2: Espelhar o schema novo em backend_app/db/models.py** - `6804352` (feat)
3. **Task 3: Criar o arquivo de contrato de testes tests/test_certifier_workbench.py (Wave 0)** - `74a4f31` (test)

**Plan metadata:** (a ser adicionado no commit final desta execução)

## Files Created/Modified
- `supabase/migrations/202608150001_certification_workbench.sql` - Drop da constraint única, tabelas `certification_pendencies` e `treasury_authorizations`, RLS.
- `backend_app/db/models.py` - Modelos `CertificationPendency`/`TreasuryAuthorization`; `Certification` sem `UniqueConstraint`.
- `supabase/seed.sql` - Certifications sem `ON CONFLICT`, documents com `ON CONFLICT (project_id, sha256_hash)`, dossiê mínimo PRC-2026-010/011, `ON CONFLICT (tag_uid) WHERE tag_uid IS NOT NULL` em `project_tags`.
- `tests/test_certifier_workbench.py` - Contrato de 9 testes de integração (RED) para CERT-01..05.
- `supabase/migrations/202605270002_storage_buckets.sql` - Renomeado de `202605270001_storage_buckets.sql` para resolver colisão de versão.
- `tests/db/test_schema_contract.py` - `STORAGE_SQL` atualizado para o novo nome do arquivo de migration.

## Decisions Made
- A constraint única de `certifications` foi removida em favor de um índice não único, deixando decisões append-only explícitas para os planos seguintes (que devem sempre fazer `INSERT`, nunca `UPDATE`).
- `certification_pendencies` e `treasury_authorizations` não têm policy de `SELECT` no RLS: são dados operacionais internos, únicos expostos via `backend_app` com sua própria autenticação e guard de papel — mesmo padrão de `project_drafts`.
- Confirmado no seed que o `external_id` da organização produtora é `'prod-001'` (não `'prd-001'` como no rascunho do plano); usado no dossiê mínimo dos dois projetos da fila.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration duplicada quebrava `npx supabase db reset` para qualquer plano**
- **Found during:** Task 1 (verificação `npx supabase db reset`)
- **Issue:** `supabase/migrations/202605270001_relax_document_hash_uniqueness.sql` e `supabase/migrations/202605270001_storage_buckets.sql` compartilhavam o mesmo prefixo de versão (`202605270001`), causando `duplicate key value violates unique constraint "schema_migrations_pkey"` — bug pré-existente (a segunda migration foi adicionada em 2026-08-14 sem checar colisão), mas bloqueava todo `db reset`, inclusive o desta plan.
- **Fix:** Renomeado `202605270001_storage_buckets.sql` → `202605270002_storage_buckets.sql` (git mv, preserva histórico).
- **Files modified:** `supabase/migrations/202605270002_storage_buckets.sql`, `tests/db/test_schema_contract.py` (referência `STORAGE_SQL` atualizada).
- **Verification:** `npx supabase db reset` termina com exit code 0; `uv run pytest tests/db -q` continua verde (13 passed).
- **Committed in:** `687e4c2` (rename), `6804352` (fix da referência no teste, junto com Task 2)

**2. [Rule 3 - Blocking] `ON CONFLICT (tag_uid)` do seed não batia com índice único parcial**
- **Found during:** Task 1 (verificação `npx supabase db reset`)
- **Issue:** A migration `202605260005_project_vertices_optional_qtags.sql` (2026-05-26) tornou `tag_uid` opcional e recriou o índice único como parcial (`WHERE tag_uid IS NOT NULL`), mas o `INSERT INTO project_tags ... ON CONFLICT (tag_uid)` do seed nunca foi atualizado, causando `there is no unique or exclusion constraint matching the ON CONFLICT specification` — bug pré-existente que bloqueava o seed completo (e, por consequência, esta plan).
- **Fix:** `ON CONFLICT (tag_uid)` → `ON CONFLICT (tag_uid) WHERE tag_uid IS NOT NULL` em `supabase/seed.sql`.
- **Files modified:** `supabase/seed.sql`
- **Verification:** `psql -f supabase/seed.sql` e `npx supabase db reset` completam sem erro.
- **Committed in:** `687e4c2` (parte do commit de Task 1)

---

**Total deviations:** 2 auto-fixed (ambos Rule 3 — bugs pré-existentes e fora do escopo direto da Task 1, mas bloqueavam a verificação obrigatória `npx supabase db reset` exit 0)
**Impact on plan:** Nenhum scope creep — ambos os fixes são mudanças mínimas e cirúrgicas necessárias para satisfazer o critério de aceite explícito da Task 1 (`npx supabase db reset` termina com exit code 0). Sem eles, nenhum plano futuro da fase conseguiria rodar `db reset`.

## Issues Encountered
- Ambiente local não tinha `docker-credential-desktop` no `PATH` (Docker Desktop instalado em volume externo `/Volumes/External SSD/Applications/Docker.app`), bloqueando pulls de imagem no `supabase db reset`. Contornado adicionando o diretório `Contents/Resources/bin` do Docker.app ao `PATH` da sessão de execução; não é uma mudança de código, apenas ambiente local desta execução. Nenhuma alteração permanente foi feita no shell profile do usuário.
- `psql` também não estava no `PATH` padrão; localizado em `/opt/homebrew/Cellar/libpq/18.2/bin` e adicionado à sessão para os comandos de verificação.

## User Setup Required

None - no external service configuration required. (A observação sobre `docker-credential-desktop`/`psql` acima é apenas sobre o ambiente local desta execução, não requer ação do usuário para uso normal do projeto via `npm run dev`/`npx supabase start`, que já resolvem o PATH internamente na maioria dos setups com Docker Desktop instalado no volume padrão.)

## Next Phase Readiness
- Fundação de dados pronta: planos 02-05 podem implementar `backend_app/modules/certifier/service.py` e as rotas que fazem os 9 testes RED de `tests/test_certifier_workbench.py` ficarem verdes.
- `treasury_authorizations` e `certification_pendencies` existem no banco e nos modelos, prontas para serem consumidas pelos endpoints de decisão/queue/pendências/tesouraria dos próximos planos.
- Nenhum bloqueio conhecido para o plano 04-02.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED
