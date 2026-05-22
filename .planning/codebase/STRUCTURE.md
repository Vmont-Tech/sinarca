# Estrutura do Codebase

**Data da análise:** 2026-05-22

## Layout principal

```text
sinarca/
|-- .devcontainer/          # Ambiente Rust/Soroban
|-- .planning/              # Planejamento, mapas, decisões e documentação organizada
|-- backend/                # API Python atual e módulos legados
|-- novas telas painel/     # Referências visuais geradas
|-- public/                 # Assets públicos do Vite
|-- soroban-contract/       # Contrato Soroban em Rust
|-- src/                    # Aplicação frontend React/Vite
|-- tests/                  # Testes Python e script GUI
|-- Dockerfile              # Build combinado frontend + API Python
|-- Dockerfile.api          # Runtime API Python
|-- Dockerfile.frontend     # Runtime frontend atual, ainda dev-server
|-- docker-compose.yml      # Compose existente, precisa ser refeito
|-- index.html              # Entrada Vite
|-- package.json            # Manifesto frontend
|-- pyproject.toml          # Manifesto Python
|-- tsconfig*.json          # Configurações TypeScript
|-- vite.config.ts          # Vite e proxy `/api`
`-- uv.lock                 # Lockfile Python
```

## Diretórios

### `src/`

Raiz da SPA React/Vite. Contém entrada, rotas, páginas, componentes, contextos, serviços, assets e estilos.

Arquivos-chave:

- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/App.css`

### `src/pages/`

Páginas por rota. `src/pages/Public/` cobre experiência pública; `src/pages/Dashboard/` cobre áreas autenticadas.

Arquivos-chave:

- `src/pages/Login.tsx`
- `src/pages/Dashboard/Overview.tsx`
- `src/pages/Dashboard/CreditMarketplace.tsx`
- `src/pages/Dashboard/AuditorReview.tsx`
- `src/pages/Dashboard/CertifierReview.tsx`
- `src/pages/Public/PublicMapPage.tsx`

### `src/components/`

Componentes compartilhados, mapas, cards, calculadora e wrappers legais.

Arquivos-chave:

- `src/components/ProtectedRoute.tsx`
- `src/components/maps/NationalMap.tsx`
- `src/components/calculator/SinarcaImpactCalculator.tsx`

### `src/layouts/`

Shell público e shell do dashboard.

- `src/layouts/PublicLayout.tsx`
- `src/layouts/DashboardLayout.tsx`

### `src/contexts/`

Contextos React. Hoje concentra autenticação e sessão.

- `src/contexts/AuthContext.tsx`

### `src/services/`

Fronteira de API e motores de domínio no navegador.

- `src/services/api.ts`
- `src/services/database.ts`
- `src/services/impact-engine/index.ts`

### `backend/`

Contém o runtime Python ativo e módulos legados.

- Runtime ativo: `backend/main.py`
- Dados em memória: `backend/mock_data.py`
- Adapter atual: `backend/services/stellar_service.py`
- Routers não montados: `backend/api/*`
- Infraestrutura legada: `backend/core/*`
- Modelos legados: `backend/models/*`

### `soroban-contract/`

Crate Rust do contrato on-chain.

- `soroban-contract/Cargo.toml`
- `soroban-contract/src/lib.rs`
- `soroban-contract/src/contract.rs`

### `tests/`

Testes e automação manual.

- `tests/test_api_integration.py`
- `tests/test_gui_flows.py`

### `.planning/`

Planejamento, decisões, mapas e documentação organizada.

- `.planning/config.json`
- `.planning/PROJECT-PREFERENCES.md`
- `.planning/codebase/*.md`
- `.planning/architecture/*.md`
- `.planning/phases/01-backend-rebuild/*.md`
- `.planning/docs/INDEX.md`

## Entrypoints

- Frontend: `index.html`, `src/main.tsx`, `src/App.tsx`.
- API atual: `backend/main.py`.
- Contrato Soroban: `soroban-contract/src/lib.rs` e `soroban-contract/src/contract.rs`.
- Container combinado: `Dockerfile`.
- Container API: `Dockerfile.api`.
- Container frontend: `Dockerfile.frontend`.

## Onde adicionar código

### Novo frontend

- Página pública: `src/pages/Public/` e registro em `src/App.tsx`.
- Página protegida: `src/pages/Dashboard/` e registro sob `/painel/*`.
- Componente reutilizável: `src/components/`.
- Serviço compartilhado: `src/services/`.

### Nova API Python

- Criar `backend_app/`.
- Evitar acoplar a nova API a `backend/main.py`.
- Usar módulos por domínio: `auth`, `projects`, `audit`, `certifier`, `marketplace`, `ledger`, `retirements`.
- Isolar adapters externos em `backend_app/adapters/`.

### Persistência

- Migrations: `supabase/migrations/`.
- Seed local: `supabase/seed.sql` ou fixture versionada.
- Modelos/repositórios: `backend_app/db/` e módulos de domínio.

### Deploy

- API: `Dockerfile.api`.
- Web: `Dockerfile.frontend`.
- Orquestração Dokploy: `docker-compose.dokploy.yml`.

## Diretórios especiais

- `soroban-contract/target/`: build gerado do Cargo; deve ser limpo em fase separada.
- `novas telas painel/`: referência visual gerada; não é código de runtime.
- `public/`: assets estáticos servidos pelo Vite.
- `.devcontainer/`: ambiente de desenvolvimento Rust/Soroban.
