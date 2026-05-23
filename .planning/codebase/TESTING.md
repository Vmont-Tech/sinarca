# Padrões de Teste

**Data da análise:** 2026-05-22

## Estado atual

- Testes Python existem em `tests/` e cobrem contratos da API v1, banco e adapters.
- Os testes usam `fastapi.testclient.TestClient` contra `backend_app.main.app`.
- Há um script Playwright em `tests/test_gui_flows.py`, mas ele não está integrado a pytest nem a npm scripts.
- Não há runner JavaScript detectado no `package.json`.
- Não há testes co-localizados em `src/`.

## Comandos relevantes

```bash
npm run lint
npm run build
uv run pytest -q
uv run --with pytest --with httpx pytest -q tests/test_api_integration.py
python tests/test_gui_flows.py
docker compose config
```

## Resultado observado no mapeamento

- `npm ci`: passou com dependências do `package-lock.json`, mas reportou achados de audit.
- `npm run lint`: passou com um aviso de `react-hooks/exhaustive-deps` em `src/pages/Dashboard/Feed.tsx`.
- `npm run build`: passou com aviso de chunk grande do Vite.
- `uv run pytest -q`: passa na suíte Python.
- `npm run build`: passa com aviso de chunk grande do Vite.
- `npm run lint`: passa com um aviso existente de `react-hooks/exhaustive-deps` em `src/pages/Dashboard/Feed.tsx`.

## Organização

```text
tests/
|-- adapters/                 # Adapters Stellar/Soroban/Etherfuse/Polygon/Transfero
|-- contract/                 # Contratos HTTP e frontend/backend
|-- db/                       # Schema e seed
|-- test_api_integration.py   # Contratos FastAPI contra backend_app
`-- test_gui_flows.py         # Script Playwright manual
```

## Padrões existentes

- `TestClient(app)` é criado em nível de módulo.
- Fixture de banco aplica schema e seed idempotente em Postgres local.
- Assertions validam status HTTP, campos de resposta e efeitos persistidos.
- Adapters externos têm modo local/sandbox com contratos explícitos.

## Contratos de teste que precisam ser atualizados

- Manter os contratos de auth, projetos, auditoria, certificação, marketplace, aposentadoria, monitoramento e transactions sincronizados com `backend_app`.

## Lacunas

- Sem testes para `src/services/api.ts`.
- Sem testes para `src/services/database.ts`.
- Sem testes para `src/contexts/AuthContext.tsx`.
- Sem testes para `src/components/ProtectedRoute.tsx`.
- Sem testes unitários para `src/services/impact-engine/`.
- Suite de contrato frontend/backend iniciada em `tests/contract/`.
- Sem validação Docker em CI.
- Sem CI remoto configurado.

## Prioridades para a reconstrução Python

1. Declarar dependências de teste no manifesto Python: `pytest`, `httpx`, `pytest-asyncio`.
2. Transformar `tests/test_api_integration.py` em suite de contrato da API v1.
3. Adicionar testes para auth, papéis, projetos, auditoria, certificação, marketplace, aposentadoria e transactions.
4. Manter fixtures a partir de `supabase/seed.sql`.
5. Adicionar teste para o bug de `RetireCredits` usando `src/services/api.ts`.
6. Adicionar `typecheck` ao frontend antes de ampliar o contrato.
7. Criar smoke de deploy para `Dockerfile.api`, `Dockerfile.frontend` e `docker-compose.dokploy.yml`.

## Estratégia recomendada

- Primeiro manter o comportamento ativo coberto por contrato.
- Evoluir `backend_app/` sem reintroduzir repositórios em memória.
- Usar modos locais determinísticos apenas atrás de adapters persistidos pelos serviços de domínio.
