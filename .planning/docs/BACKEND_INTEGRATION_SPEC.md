# SINARCA - Especificação de Integração Backend (v1.0)

Este documento serve como guia para a equipe de desenvolvimento de backend integrar as APIs reais ao frontend do SINARCA. Atualmente, o sistema utiliza dados mockados via `src/services/database.ts` e `src/data/mrca_db.ts`.

## 1. Arquitetura de Autenticação

A autenticação deve seguir o padrão **JWT (JSON Web Token)**.

- **Endpoint**: `/api/v1/auth/login`
- **Método**: `POST`
- **Payload**: `{ email, password, role }`
- **Resposta**: `{ token, user: { id, name, role, ... } }`

### Roles (Perfis)
- `producer`: Produtor/Certificador (Painel de Gestão de Projetos)
- `auditor`: Auditor (Fila de Verificação Técnica)
- `company`: Empresa/Investidor (Marketplace e Inventário)
- `admin`: Super Admin (Gestão de Ecossistema)

---

## 2. Modelos de Dados Principais

### Projeto MRCA (Mercado de Ativos)
Representa o ativo ambiental registrado em blockchain.

```json
{
  "id": "uuid",
  "friendlyId": "PRC-2024-00X",
  "name": "string",
  "status": "AVAILABLE | AUDITED | RETIRED | SUSPENDED",
  "methodology": "string (ex: VCS, VERRA)",
  "metrics": {
    "carbonStock": number,
    "vintage": "year",
    "totalAreaHa": number
  },
  "blockchain": {
    "contractAddress": "string",
    "initialHash": "string",
    "timestamp": "iso-date"
  }
}
```

---

## 3. Endpoints Necessários (E2E Flow)

### Marketplace & Consulta
- `GET /api/v1/projects`: Lista de projetos filtrada por status, bioma ou tipo.
- `GET /api/v1/projects/:id`: Detalhes completos de um projeto (incluindo timeline e docs).

### Inventário & Conformidade (Empresas)
- `POST /api/v1/inventory/declare`: Submissão de dados de escopo 1, 2 e 3.
- `POST /api/v1/inventory/upload`: Upload de documento comprobatório (PDF/DOCX).

### Auditoria
- `GET /api/v1/audit/queue`: Fila de projetos aguardando verificação.
- `PATCH /api/v1/audit/verify/:projectId`: Atualização de status após inspeção técnica.

---

## 4. Integração Blockchain (Middleware)

O backend deve atuar como um gateway para a rede **Algorand**, abstraindo a complexidade de transações para o frontend.

- **Emissão**: Quando um projeto é aprovado, o backend deve invocar o Smart Contract de `Mint`.
- **Aposentadoria**: No momento da liquidação (compra), o backend deve executar o `Burn` e gerar o certificado imutável.

---

## 5. Próximos Passos para Dev Team
1. Criar `API_URL` no `.env` do frontend.
2. Substituir chamadas em `src/services/database.ts` por instâncias de `axios` ou `fetch`.
3. Implementar persistência de documentos via S3 ou equivalente.
