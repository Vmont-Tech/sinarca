# SINARCA - Especificação de Integração Backend (Phase 1)

Este documento define o contrato operacional entre o frontend SINARCA e a API reconstruída. O backend canônico da Phase 1 é `backend_app`; Docker, Dokploy, scripts operacionais e staging devem executar `backend_app.main:app`.

## 1. Arquitetura Canônica

- **Runtime backend:** FastAPI em `backend_app.main:app`.
- **Rotas:** `GET /health` e contrato `/api/v1`.
- **Banco:** Supabase apenas como Postgres externo, acessado por `DATABASE_URL` e service role no backend.
- **Identidade:** auth própria com Argon2/JWT; Supabase Auth, `auth.uid()` e claims Supabase não são fonte canônica nesta fase.
- **Frontend:** `src/services/api.ts` usa `VITE_API_URL` e bearer token salvo em `localStorage.sinarca_token`.

## 2. Contrato de Autenticação

### Login

- **Endpoint:** `POST /api/v1/auth/login`
- **Payload:** `{ email, dadoLogin?, password, role? }`
- **Resposta:** `{ token, access_token, refresh_token, expires_at, expires_in_seconds, user }`

### Cadastro público

- Papéis aceitos: `producer`, `auditor`, `company`, `certifier`.
- `admin` deve ser provisionado fora do cadastro público.
- Senhas são hash Argon2 no backend.

## 3. Modelos e Endpoints Principais

### Projeto MRCA

```json
{
  "id": "uuid",
  "friendlyId": "PRC-2026-001",
  "name": "string",
  "status": "ACTIVE",
  "methodology": "string",
  "location": {
    "city": "Porto Nacional",
    "state": "Tocantins",
    "bioma": "Cerrado"
  },
  "metrics": {
    "carbonStock": 1000,
    "vintage": "2026",
    "totalAreaHa": 500
  },
  "blockchain": {
    "contractAddress": "string",
    "initialHash": "string",
    "timestamp": "iso-date"
  }
}
```

### Consulta e catálogos

- `GET /api/v1/projects`
- `GET /api/v1/projects/{id_or_friendly_id}`
- `POST /api/v1/projects`
- `GET /api/v1/certifiers`
- `GET /api/v1/auditors`
- `GET /api/v1/companies`

### Certificação, auditoria e monitoramento

- `GET /api/v1/certifier/queue`
- `PATCH /api/v1/certifier/projects/{project_id}/decision`
- `GET /api/v1/audit/queue`
- `PATCH /api/v1/audit/verify/{project_id}`
- Monitoramento registra anomalias, bloqueio de projeto e recálculo via eventos persistentes.

### Marketplace, ledger e inventário

- `GET /api/v1/marketplace`
- `POST /api/v1/marketplace/buy`
- `POST /api/v1/marketplace/compensate`
- `GET /api/v1/transactions`
- `GET /api/v1/inventory`
- `POST /api/v1/inventory/declare`
- `POST /api/v1/inventory/upload`

Compras usam ledger off-chain no backend. O comprador comum não precisa de wallet externa, chave privada ou gas; propriedade, compras e aposentadorias são refletidas em `ledger_accounts`, `ledger_entries`, `purchases`, `retirements` e eventos auditáveis.

## 4. Blockchain, Tesouraria e Interoperabilidade

- **Stellar/Soroban:** adapters executam mint bloqueado, unlock, transfer e burn. Sponsored reserves usam `BeginSponsoringFutureReserves` quando configurados.
- **Etherfuse/Tesouro:** `EtherfuseAdapter` confirma lastro financeiro em sandbox/API antes de mint quando as credenciais existem.
- **TransferoAdapter:** porta futura para portabilidade de liquidez sem trocar o contrato do frontend.
- **Yield social:** tesouraria divide rendimento em 90% operação e 10% `SocialImpactVault`.
- **Polygon:** lock-and-mint valida crédito externo travado em vault EVM/Polygon antes de solicitar wrapped mint na Stellar.

Provider smoke real fica documentado em `.planning/docs/providers/PHASE1-PROVIDER-SMOKE.md`. Ausência de credenciais externas deve ser registrada como bloqueio, não sucesso.

## 5. Deploy e Cutover

O deploy Dokploy da Phase 1 usa `docker-compose.dokploy.yml` com dois serviços:

- `sinarca-api`, buildado por `Dockerfile.api`, executando `backend_app.main:app`.
- `sinarca-web`, buildado por `Dockerfile.frontend`, servindo `dist/` via Nginx.

Supabase permanece externo aos containers. Não há serviço Postgres local no compose de Dokploy.

Antes de liberar staging:

1. Aplicar migrations no Supabase real com `supabase db push`.
2. Validar API em `GET /health`.
3. Validar login com auth própria contra Postgres real.
4. Validar frontend com `VITE_API_URL` apontando para a API staging.
5. Registrar evidências em `.planning/docs/deployment/PHASE1-STAGING-SMOKE.md`.
