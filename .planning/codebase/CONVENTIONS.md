# Convenções de Código

**Data da análise:** 2026-05-22

## Nomes e organização

### Frontend

- Componentes, páginas e layouts usam PascalCase: `Overview.tsx`, `ProtectedRoute.tsx`, `DashboardLayout.tsx`.
- Serviços e helpers usam camelCase: `api.ts`, `database.ts`, `normalizeInputs.ts`.
- Rotas públicas ficam em `src/pages/Public/`; rotas protegidas ficam em `src/pages/Dashboard/`.
- Serviços compartilhados ficam em `src/services/`; UI reutilizável fica em `src/components/`.
- Chamadas HTTP devem passar por `src/services/api.ts`.

### Backend Python atual

- Módulos Python usam snake_case: `routes.py`, `service.py`, `repository.py`.
- O app ativo está em `backend_app/main.py`.
- Novos módulos devem entrar em `backend_app/` seguindo os limites `core`, `db`, `adapters` e `modules`.
- Nomes de domínio podem preservar termos de negócio em português quando já existirem, mas APIs públicas devem ser documentadas e testadas.

### Contrato de API

- Preservar campos públicos usados pelo frontend: `friendlyId`, `carbonStock`, `expires_at`, `access_token`, `escopo_1`, `quantidade`.
- Não renomear payloads no primeiro corte sem adapter de compatibilidade.
- Rotas produtivas continuam sob `/api/v1`.

## Estilo

- Não há Prettier, Biome, Black, Ruff ou mypy configurados no repositório.
- Ao editar arquivos existentes, preservar o estilo local para evitar churn.
- Novos módulos TypeScript devem preferir tipos explícitos em exports.
- Novos módulos Python devem usar type hints, funções pequenas, dependências injetáveis e configuração centralizada.
- Comentários devem explicar regra de negócio, decisão de migração ou integração externa; evitar comentários que repitam o código.

## Imports

1. Pacotes externos primeiro.
2. Imports locais depois.
3. `import type` em TypeScript quando aplicável.
4. Em Python, manter biblioteca padrão, terceiros e imports `backend_app.*` em blocos separados.
5. Não introduzir imports de pacotes que não estejam no manifesto/lockfile.

## Tratamento de erros

- Frontend: usar `src/services/api.ts`, que lê `detail`, `message`, texto da resposta ou status HTTP.
- Backend: respostas HTTP devem usar `detail` com mensagens claras e status explícito.
- Erros de infraestrutura devem ser tratados fora das rotas e gerar logs estruturados.
- Rotas sensíveis devem distinguir erro de validação, erro de autenticação e erro de autorização.

## Logging

- O frontend hoje usa `console.error`/`console.warn` pontualmente.
- O backend atual usa logging padrão do Uvicorn e alguns `print`.
- A API reconstruída deve ter um logger estruturado único, com correlação por request e sem vazar segredos.

## Convenções de documentação

- Documentação autoral deve ser escrita em português do Brasil com acentuação correta.
- Identificadores de código, nomes de arquivos, rotas, pacotes e produtos oficiais devem preservar o formato original.
- Copyright e avisos legais do projeto devem seguir: `© <ano> <titular>. Todos os direitos reservados.`

## Riscos de migração

- Não adicionar rotas fora de `backend_app/api/router.py` ou dos routers montados por ele.
- Não chamar endpoints com URL absoluta no frontend.
- Não assumir que `README.md` reflete o código atual sem validação.
- Não usar `docker-compose.yml` como base de produção sem reescrever e validar.
- Não reintroduzir runtime legado nem repositórios em memória.
