# Phase 01: backend-rebuild - Contexto

**Coletado:** 2026-05-22
**Status:** Ready for execution
**Fonte:** GSD plan-phase + discuss-phase com validação dos documentos operacionais fornecidos pelo usuário

<domain>
## Limite da Fase

A Phase 01 reconstrói/refatora o backend do SINARCA para tirar o produto do MVP em memória e estabelecer uma base operacional persistente, segura e implantável. O escopo inclui contrato `/api/v1`, novo backend FastAPI em `backend_app/`, persistência Supabase Postgres, auth própria com Argon2/JWT, guards por papel, ledger off-chain, adapters Stellar/Soroban/Etherfuse/Polygon, deploy Dokploy e todas as correções acopladas do frontend que dependem de dados da API.

Esta fase não entrega aplicativo móvel nativo, treinamento real de IA/NDVI, operação financeira produtiva, mainnet ou chaves produtivas. Ela deve, porém, provar operação real em sandbox/testnet/staging: Supabase Postgres real, `supabase db push`, backend e frontend em staging/Dokploy, auth própria contra Postgres real, e Stellar/Soroban testnet com deploy/invoke/status. Etherfuse e Polygon devem ter tentativa real em sandbox/testnet/API quando houver acesso; ausência de credenciais pode encerrar como bloqueio documentado, não como sucesso silencioso.
</domain>

<decisions>
## Implementation Decisions

### D-01: Runtime canônico
- A reconstrução aprovada segue Python/FastAPI em `backend_app/`.
- `backend_app` vira runtime único da fase; `backend/main.py` fica temporariamente no repo apenas como referência/contrato legado, sem fallback por flag e sem destino de deploy.
- Node.js/TypeScript permanece somente como alternativa documentada em `NODE-IMPLEMENTATION-PLAN.md`.

### D-02: Fonte de dados
- Supabase fica apenas como Postgres canônico da aplicação; Supabase Auth não é fonte de identidade nesta fase.
- `backend/mock_data.py`, `src/data/mrca_db.ts` e quaisquer mocks/fachadas usados por telas dependentes de dados viram fixture/seed e não podem continuar como modelo implícito de produção.
- O seed Supabase deve cobrir auth, projetos, mapas, rankings/impacto, perfis, inventário, auditoria, certificação, marketplace, transações e aposentadoria.
- Não há migração de dados produtivos nesta fase.
- Toda mudança de schema deve ser versionada em `supabase/migrations/*.sql` e acompanhada de seed idempotente.

### D-03: Contrato `/api/v1`
- O frontend atual define o contrato mínimo junto com `backend/main.py`, `src/services/api.ts`, `src/services/database.ts` e `src/contexts/AuthContext.tsx`.
- Rotas de auth, projetos, marketplace, inventário, auditoria, certificação, transações e status blockchain devem preservar shapes aceitos pelo frontend.
- Erros devem continuar expondo `detail` ou `message`.

### D-04: Autenticação e papéis
- A identidade canônica é auth própria no `backend_app`, com Argon2 para senha, JWT/refresh próprios e persistência no Postgres.
- Supabase Auth, `auth.uid()` e claims Supabase não devem ser usados como contrato obrigatório da fase.
- Cadastro público deve aceitar apenas `producer`, `auditor`, `company` e `certifier`; `admin` deve ser provisionado fora do cadastro público.
- Rotas sensíveis exigem `require_user` e `require_role`.

### D-05: Fluxo operacional do PDF
- O fluxo produtor -> certificadora -> SINARCA -> auditor -> desbloqueio -> compra -> burn permanece como fluxo funcional central.
- A fase deve cobrir backend/schema/API para registro de projeto, quatro tags NFC 424 DNA, cerca virtual, baseline Sentinel-2/NDVI, certificação, tokenização bloqueada, auditoria, desbloqueio, marketplace, compra, aposentadoria e bloqueio/recálculo por anomalia.

### D-06: Ajustes obrigatórios do DOCX
- O modelo Web3 direto do PDF não é suficiente para o sistema real.
- A arquitetura financeira deve incluir contas patrocinadas Stellar (`BeginSponsoringFutureReserves`), confirmação de aporte Etherfuse em Reais via PIX, lastro em Tesouro Direto, ledger off-chain para varejo, `ISinarcaLiquidity`, `EtherfuseAdapter`, porta futura para `TransferoAdapter`, yield 90/10 e `SocialImpactVault`.
- A interoperabilidade deve incluir fluxo lock-and-mint para créditos externos EVM/Polygon com vault e wrapped token na Stellar.

### D-07: Compras e custódia
- Compras por empresas/cidadãos no MVP não devem exigir wallet externa, gestão de chave ou gas do usuário final.
- A propriedade do comprador é refletida instantaneamente no ledger off-chain do SINARCA; eventos on-chain ficam sob controle dos adapters e do ciclo de aposentadoria/liquidação.

### D-08: Segurança e auditoria
- Operações críticas devem ser idempotentes por `idempotency_key`.
- Uploads devem validar autenticação, extensão, tamanho, magic bytes, hash e storage path.
- Eventos sensíveis devem gerar `audit_events` append-only.
- Segredos Supabase service role, Stellar, Etherfuse, Transfero e Polygon nunca podem sair do backend nem entrar no repositório.

### D-09: Frontend acoplado
- `src/pages/Dashboard/RetireCredits.tsx` deve parar de chamar `http://127.0.0.1:5680` e usar `apiPost('/marketplace/compensate', ...)`.
- `src/services/database.ts` precisa manter DTOs explícitos enquanto a API troca de implementação.
- `src/contexts/AuthContext.tsx` deve tratar a API reconstruída como fonte canônica; fallback local só é aceitável em desenvolvimento por flag explícita.

### D-10: Deploy
- A entrega de deploy deve separar `sinarca-api` e `sinarca-web`, preferencialmente via `docker-compose.dokploy.yml` no mesmo commit/gatilho.
- API expõe `GET /health`; web serve `dist/` com fallback SPA; Supabase fica fora dos containers de aplicação.
- O cutover não mantém o backend atual como fallback. `Dockerfile.api`, docs e smoke tests devem apontar para `backend_app.main:app`.
- A conclusão exige staging/Dokploy com API saudável em `/health` e frontend staging consumindo `backend_app`.

### D-11: Critério live por camadas
- Bloqueiam a conclusão da fase: Supabase real com `supabase db push`, auth própria contra Postgres real, staging/Dokploy API+web, e Stellar/Soroban testnet com deploy/invoke/status.
- Etherfuse e Polygon exigem tentativa real de sandbox/testnet/API. Se credenciais/acesso não existirem, o executor deve registrar comando, configuração esperada, erro exato e impacto, mantendo o item como bloqueio externo documentado.
- Produção/mainnet e operação financeira real ficam fora da Phase 01.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Documentos operacionais fornecidos pelo usuário
- `.planning/docs/reference/Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf` - fluxo completo original da plataforma, fases 1 a 7, monitoramento, bloqueio/desbloqueio e rastreabilidade.
- `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx` - alterações obrigatórias do fluxo Web3 direto para contas patrocinadas, Etherfuse/Tesouro, ledger off-chain, yield social e lock-and-mint Polygon.

### Decisões e contexto local
- `.planning/architecture/001-backend-runtime-options.md` - decisão operacional atual de reconstruir em Python/FastAPI.
- `.planning/codebase/ARCHITECTURE.md` - fronteiras atuais do frontend, backend ativo, contrato legado e anti-padrões.
- `.planning/codebase/CONCERNS.md` - dívidas técnicas, bugs conhecidos, segurança e bloqueios de produção.
- `.planning/codebase/STACK.md` - stack real e comandos úteis.
- `.planning/PROJECT-PREFERENCES.md` - idioma, tom e acentuação esperados para artefatos.

### Contratos e planos existentes da fase
- `.planning/phases/01-backend-rebuild/API-CONTRACT.md` - rotas e shapes mínimos da API v1.
- `.planning/phases/01-backend-rebuild/DATA-MODEL.md` - entidades alvo em Supabase Postgres, RLS e status canônicos.
- `.planning/phases/01-backend-rebuild/PYTHON-IMPLEMENTATION-PLAN.md` - direção inicial da reconstrução Python/FastAPI.
- `.planning/phases/01-backend-rebuild/DEPLOYMENT-PLAN.md` - decisão de deploy API/web no mesmo gatilho.
- `.planning/phases/01-backend-rebuild/NODE-IMPLEMENTATION-PLAN.md` - alternativa documentada, não rota canônica.

### Código fonte operacional
- `backend/main.py` - API ativa e contrato legado a congelar por testes.
- `backend/mock_data.py` - origem de fixtures/seeds, não runtime alvo.
- `src/data/mrca_db.ts` - origem de mocks do frontend que devem virar seed.
- `backend/services/stellar_service.py` - adapter Stellar atual em modo mock/parcial.
- `src/services/api.ts` - cliente HTTP e contrato de erro/autenticação.
- `src/services/database.ts` - fachada de dados consumida pelo frontend.
- `src/contexts/AuthContext.tsx` - contrato de auth do navegador.
- `src/pages/Dashboard/RetireCredits.tsx` - correção acoplada obrigatória de chamada direta.
- `src/pages/Dashboard/Transactions.tsx` - dados mockados de transações devem migrar para `/api/v1/transactions`.
- `soroban-contract/src/contract.rs` - contrato Soroban candidato para ciclo Mint -> Unlock -> Transfer -> Burn.
</canonical_refs>

<specifics>
## Specific Ideas

- Criar suíte de contrato antes de tocar na API nova.
- Criar `backend_app/` isolado em vez de remendar routers legados não montados.
- Versionar schema em `supabase/migrations/202605220001_initial_schema.sql` e políticas RLS em `202605220002_rls_policies.sql`.
- Modelar `ledger_accounts`, `ledger_entries`, `purchases`, `retirements`, `treasury_positions`, `yield_distributions`, `chain_events`, `external_chain_projects`, `project_tags`, `project_baselines` e `audit_events`.
- Incluir adapters com interface e modo `mock` para testes unitários, mas exigir smoke real em sandbox/testnet onde definido como obrigatório.
- Tratar schema push como bloqueante: `supabase db push` real depois de migrations e antes da verificação.
- Tratar seed como parte do contrato com o frontend: todos os dados mockados consumidos por telas devem existir no Postgres ou ser substituídos por endpoint persistente.
- Adicionar gates `npm run lint`, `npm run build`, `uv run pytest -q`, build dos Dockerfiles e `docker compose -f docker-compose.dokploy.yml config`.
</specifics>

<deferred>
## Deferred Ideas

- Aplicativo móvel nativo para leitura NFC e auditoria de campo.
- Integração live com Sentinel/Copernicus e modelos reais de IA/NDVI.
- Deploy real em produção, chaves reais e mainnet.
- Operação financeira real com Etherfuse/Transfero/Polygon fora de sandbox/testnet.
- Migração completa de dados produtivos, pois não há dump produtivo anexado.
- Refatoração visual ampla do frontend fora das correções acopladas à API.
</deferred>

---

*Phase: 01-backend-rebuild*
*Context gathered: 2026-05-22 via GSD plan-phase + discuss-phase*
