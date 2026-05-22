# SINARCA - Especificação de Integração Backend (v1.0)

Este documento orienta a integração das APIs reais ao frontend do SINARCA. Atualmente, parte do sistema ainda depende de dados simulados em `src/services/database.ts`, `src/data/mrca_db.ts` e `backend/mock_data.py`.

## 1. Arquitetura de Autenticação

A autenticação produtiva deve seguir uma das opções formalizadas no plano de reconstrução:

- Supabase Auth como identidade canônica, com API validando JWT.
- Auth própria com senha hash e JWT, mantendo Supabase apenas como Postgres.

Contrato mínimo esperado:

- **Endpoint:** `/api/v1/auth/login`
- **Método:** `POST`
- **Payload:** `{ email, dadoLogin, password, role? }`
- **Resposta:** `{ token, access_token, refresh_token, expires_at, expires_in_seconds, user }`

### Papéis

- `producer`: produtor/certificador, painel de gestão de projetos.
- `auditor`: auditor, fila de verificação técnica.
- `company`: empresa/investidor, marketplace e inventário.
- `certifier`: certificadora, decisão de certificação.
- `admin`: administrador, gestão de ecossistema.

## 2. Modelos de Dados Principais

### Projeto MRCA

Representa o ativo ambiental registrado e rastreável.

```json
{
  "id": "uuid",
  "friendlyId": "PRC-2024-00X",
  "name": "string",
  "status": "AVAILABLE | AUDITED | RETIRED | SUSPENDED",
  "methodology": "string",
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

## 3. Endpoints Necessários

### Marketplace e consulta

- `GET /api/v1/projects`: lista de projetos filtrada por status, bioma ou tipo.
- `GET /api/v1/projects/:id`: detalhes completos de um projeto, incluindo timeline e documentos.
- `GET /api/v1/marketplace`: lista de créditos disponíveis.
- `POST /api/v1/marketplace/buy`: compra de crédito via ledger off-chain.
- `POST /api/v1/marketplace/compensate`: aposentadoria de crédito e emissão de certificado.

### Inventário e conformidade

- `POST /api/v1/inventory/declare`: submissão de dados de escopo 1, 2 e 3.
- `POST /api/v1/inventory/upload`: upload de documento comprobatório.

### Auditoria e certificação

- `GET /api/v1/audit/queue`: fila de projetos aguardando verificação.
- `PATCH /api/v1/audit/verify/:projectId`: atualização de status após inspeção técnica.
- `GET /api/v1/certifier/queue`: fila de projetos aguardando certificação.
- `PATCH /api/v1/certifier/projects/:projectId/decision`: decisão da certificadora.

## 4. Integração Blockchain

O backend deve atuar como gateway para Stellar/Soroban, abstraindo a complexidade de transações para o frontend.

- **Mint:** quando um projeto é aprovado, o backend registra o evento de emissão.
- **Unlock:** após certificação/auditoria, o backend libera crédito bloqueado conforme regra de negócio.
- **Transfer:** compras no MVP devem ser refletidas em ledger off-chain e eventos auditáveis.
- **Burn:** no momento da aposentadoria, o backend executa ou simula burn e gera certificado imutável.

## 5. Próximos Passos

1. Congelar o contrato `/api/v1` com testes.
2. Substituir chamadas diretas no frontend por `src/services/api.ts`.
3. Implementar persistência de documentos via storage controlado.
4. Conectar Supabase Postgres local/produção com migrations e RLS.
5. Isolar integrações Stellar/Soroban, Etherfuse e Polygon atrás de adapters.
