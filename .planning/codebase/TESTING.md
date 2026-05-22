# Padrões de Teste

**Data da análise:** 2026-05-22

## Estado atual

- Testes Python existem em `tests/test_api_integration.py`.
- Os testes usam `fastapi.testclient.TestClient` contra `backend.main.app`.
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
- `uv run pytest -q`: falhou porque `pytest` não está declarado.
- `uv run --with pytest pytest -q tests/test_api_integration.py`: falhou porque `httpx` não está declarado para `fastapi.testclient`.
- `uv run --with pytest --with httpx pytest -q tests/test_api_integration.py`: executou 9 testes, com 6 passando e 3 falhando.
- `docker compose config`: falhou por YAML inválido em `docker-compose.yml`.

## Organização

```text
tests/
|-- test_api_integration.py   # Testes FastAPI contra backend.main
`-- test_gui_flows.py         # Script Playwright manual
```

## Padrões existentes

- `TestClient(app)` é criado em nível de módulo.
- Fixture `autouse` reseta listas/dicionários globais antes dos testes.
- Assertions validam status HTTP, campos de resposta e efeitos em `PROJECTS`/`TRANSACTIONS`.
- `StellarService(StellarConfig(enabled=False))` é usado para testar comportamento mock.
- Testes dependem de estado em memória e não são seguros para execução paralela.

## Contratos de teste que precisam ser atualizados

- `test_workflow_decision_flow` espera `new_status == "AVAILABLE"`, mas `backend/main.py` retorna `AUDITED`.
- `test_monetization_endpoints` espera `/api/v1/monetization`, endpoint ausente na API ativa.
- `test_stellar_service_missing_keys_raises` espera exceção com chaves vazias, mas o adapter atual não lança nesse caminho.

## Lacunas

- Sem testes para `src/services/api.ts`.
- Sem testes para `src/services/database.ts`.
- Sem testes para `src/contexts/AuthContext.tsx`.
- Sem testes para `src/components/ProtectedRoute.tsx`.
- Sem testes unitários para `src/services/impact-engine/`.
- Sem suite de contrato frontend/backend.
- Sem validação Docker em CI.
- Sem testes dos routers legados em `backend/api/*`.

## Prioridades para a reconstrução Python

1. Declarar dependências de teste no manifesto Python: `pytest`, `httpx`, `pytest-asyncio`.
2. Transformar `tests/test_api_integration.py` em suite de contrato da API v1.
3. Adicionar testes para auth, papéis, projetos, auditoria, certificação, marketplace, aposentadoria e transactions.
4. Criar fixtures a partir de `backend/mock_data.py`.
5. Adicionar teste para o bug de `RetireCredits` usando `src/services/api.ts`.
6. Adicionar `typecheck` ao frontend antes de ampliar o contrato.
7. Criar smoke de deploy para `Dockerfile.api`, `Dockerfile.frontend` e `docker-compose.dokploy.yml`.

## Estratégia recomendada

- Primeiro congelar o comportamento ativo.
- Depois implementar `backend_app/` com testes de contrato rodando contra API antiga e nova.
- Só substituir `backend/main.py` quando os contratos críticos e UAT passarem.
- Manter mocks de Stellar/Etherfuse/Polygon explícitos até haver credenciais e sandbox estáveis.
