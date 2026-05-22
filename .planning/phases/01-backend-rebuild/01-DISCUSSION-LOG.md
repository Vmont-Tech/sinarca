# Phase 01: backend-rebuild - Discussion Log

**Data:** 2026-05-22
**Origem:** `$gsd-discuss-phase 1`
**Status:** completo

## Pergunta central

A Phase 1 deve cobrir todos os fluxos delineados nos documentos de referência?

## Decisões confirmadas

### 1. Cobertura live dos fluxos

- A Phase 1 deve cobrir os fluxos dos documentos no backend e nos provedores, sem incluir aplicativo móvel nativo.
- O ambiente live aceito para esta fase é sandbox/testnet/staging, não produção/mainnet.
- Supabase real, Dokploy/staging e Stellar/Soroban testnet são obrigatórios.
- Etherfuse e Polygon devem ser tentados com API/sandbox/testnet real quando houver acesso; se não houver credenciais, o bloqueio deve ser documentado com erro exato.

### 2. Dados iniciais e migração

- A fase deve contemplar todos os fluxos do frontend que dependem de dados.
- O seed Supabase deve ser realista e completo para auth, projetos, mapas, rankings/impacto, perfis, inventário, auditoria, certificação, marketplace, transações e aposentadoria.
- Dados mockados no frontend também entram no seed ou viram endpoint persistente, incluindo `src/data/mrca_db.ts` e mocks/fachadas usados por telas de dados.
- Não há migração de dados produtivos nesta fase.

### 3. Cutover e deploy

- O backend atual deve ser aposentado como runtime.
- `backend_app` vira runtime único.
- `backend/main.py` permanece temporariamente no repositório apenas como referência/contrato legado até o fim da fase.
- Não haverá fallback por flag para o backend atual.

### 4. Identidade e autenticação

- A identidade canônica é auth própria no `backend_app`, com Argon2/JWT e refresh próprios.
- Supabase fica apenas como Postgres canônico.
- Supabase Auth, `auth.uid()` e claims Supabase não são contrato da Phase 1.

### 5. Critérios de aceite com provedores

Para concluir a Phase 1, a execução precisa produzir evidência de:

- `supabase db push` real.
- Login/auth própria contra Postgres real.
- API staging no Dokploy respondendo `/health`.
- Frontend staging consumindo `backend_app`.
- Stellar/Soroban testnet com deploy, invoke e status reais.
- Tentativa real Etherfuse/Polygon em sandbox/testnet/API, ou bloqueio externo documentado quando não houver acesso.

## Fora do escopo confirmado

- Aplicativo móvel nativo NFC/auditor.
- Produção/mainnet.
- Operação financeira real em produção.
- Migração de dados produtivos sem dump ou fonte real.

## Artefatos atualizados

- `01-CONTEXT.md`
- `01-02-PLAN.md`
- `01-03-PLAN.md`
- `01-04-PLAN.md`
- `01-05-PLAN.md`
- `01-06-PLAN.md`
- `01-VALIDATION.md`
- `01-COVERAGE.md`
- `01-PATTERNS.md`
- `01-RESEARCH.md`
- `API-CONTRACT.md`
- `DATA-MODEL.md`
- `DEPLOYMENT-PLAN.md`
- `PYTHON-IMPLEMENTATION-PLAN.md`

## Resultado

Os requisitos dos documentos continuam cobertos, mas a Phase 1 agora tem critérios mais fortes: não basta contrato/mock. A fase exige base real Supabase, cutover sem fallback, frontend alimentado pelo backend novo, staging Dokploy e prova testnet de Soroban.
