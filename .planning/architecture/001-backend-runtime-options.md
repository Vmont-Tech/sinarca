# Decisão de Arquitetura 001: Opções de runtime do backend SINARCA

**Data:** 2026-05-22
**Status:** decisão operacional atual: reconstruir em Python/FastAPI; manter Node.js/TypeScript como alternativa documentada.
**Escopo:** reconstrução da API/backend, integração segura com frontend, Supabase local/produção e Dokploy via Dockerfile.

## Premissa

Nenhum runtime deve ser tratado como verdade técnica automática. A escolha precisa considerar manutenção futura, risco de migração, maturidade da equipe e aderência aos fluxos operacionais do SINARCA.

O repositório atual comprova apenas estes pontos:

- O frontend já existe em React/Vite/TypeScript.
- A API ativa hoje é Python/FastAPI em `backend/main.py`.
- A API ativa usa dados em memória e não usa Supabase.
- Existe uma arquitetura Python relacional parcial em `backend/api/*`, `backend/core/*` e `backend/models/*`, mas ela não está ligada ao app ativo.
- O deploy Docker atual precisa ser refeito independentemente do runtime escolhido.

Assim, a pergunta prática não é "Python contra Node" em abstrato. A pergunta é qual caminho reduz risco de manutenção e entrega para a equipe que vai operar o SINARCA.

## Opção A: reconstruir a API em Python/FastAPI

**Resumo:** manter Python como runtime, mas reconstruir a API de forma limpa em vez de remendar o MVP em memória.

**Stack possível:**

- Python 3.12 ou 3.11
- FastAPI
- Pydantic v2
- SQLAlchemy 2 async + asyncpg
- Alembic para migrações
- Supabase Postgres/Auth
- pytest + httpx
- Ruff/mypy ou Pyright
- Dockerfile dedicado para API

**Forças:**

- Preserva a linguagem atual do backend.
- Reduz custo de troca de stack durante a reconstrução.
- FastAPI continua adequado para APIs produtivas, validação e OpenAPI.
- É mais coerente se a manutenção futura for feita por uma equipe com maior familiaridade em Python.
- Tem bom encaixe para futuras rotinas de IA, satélite, geoprocessamento e auditoria ambiental.

**Riscos:**

- Segurança, autenticação, autorização, persistência e migrações precisam ser reconstruídas mesmo mantendo Python.
- Reaproveitar os módulos SQLAlchemy atuais sem auditoria herdaria inconsistências de schema e dependências ausentes.
- O repositório seguirá com dois ecossistemas: Node para frontend e Python para backend.

**Quando escolher:**

- A equipe de manutenção do backend domina Python.
- O objetivo é reduzir risco de reescrita mantendo a linguagem já presente.
- O backend tende a concentrar integrações com IA, satélite, geoprocessamento ou jobs ambientais.

## Opção B: reconstruir a API em Node.js/TypeScript

**Resumo:** trocar o runtime para Node.js/TypeScript para unificar stack com o frontend e permitir contratos compartilhados.

**Stack possível:**

- Node.js LTS
- TypeScript
- Fastify ou NestJS
- Prisma ou Drizzle
- Supabase Postgres/Auth
- Vitest
- Dockerfile dedicado para API

**Forças:**

- Unifica a linguagem entre frontend e backend.
- Facilita DTOs compartilhados, testes de contrato em TypeScript e SDK interno.
- Encaixa bem com Supabase JS e tooling web.
- Pode acelerar times mais fortes em frontend/fullstack JavaScript.

**Riscos:**

- A troca de linguagem adiciona custo de migração.
- Pode aumentar risco de manutenção se a equipe de backend for mais forte em Python.
- Fluxos de IA, satélite e geoprocessamento podem exigir serviços Python separados depois.

**Quando escolher:**

- A equipe decide padronizar tudo em TypeScript.
- A prioridade é velocidade fullstack e compartilhamento de tipos.
- O backend será majoritariamente API transacional, sem processamento Python pesado no serviço principal.

## Opção C: Python API + workers especializados

**Resumo:** FastAPI permanece como API principal; jobs pesados ficam em workers Python independentes ou filas.

**Forças:**

- Mantém API em Python e organiza crescimento.
- Evita rotas HTTP lentas para Sentinel, IA, auditoria automatizada, colheita de yield e listeners cross-chain.
- Permite escalar jobs separadamente no futuro.

**Riscos:**

- Adiciona fila, scheduler e operação extra.
- Pode ser prematuro se o MVP ainda não precisa desses jobs reais.

**Quando escolher:**

- A plataforma avançar rapidamente para monitoramento, IA, satélite, blockchain listeners e tesouraria automatizada.
- A equipe aceitar uma arquitetura um pouco mais operacional desde o início.

## Matriz de decisão

| Critério | Peso sugerido | Opção A Python API | Opção B Node API | Opção C Python + workers |
|---|---:|---|---|---|
| Manutenção futura pela equipe | Alto | Melhor se o time domina Python | Melhor se o time domina TypeScript | Melhor se o time domina Python e operação |
| Corte seguro do backend atual | Alto | Bom, desde que seja rebuild limpo | Bom, desde que o contrato seja congelado | Bom, mas com maior escopo |
| Integração com frontend atual | Alto | Boa via OpenAPI/DTOs | Muito boa via tipos compartilhados | Boa via OpenAPI/DTOs |
| Supabase local/produção | Alto | Viável com SQLAlchemy/Alembic e Auth JWT | Viável com Prisma/Drizzle | Viável |
| IA, satélite e geoprocessamento | Médio/alto | Forte | Pode exigir serviço Python futuro | Forte |
| Complexidade operacional inicial | Médio | Média | Média | Maior |
| Dokploy via Dockerfile | Alto | Viável | Viável | Viável, com mais serviços |

## Decisão registrada

A rota recomendada para o próximo ciclo é reconstruir a API em Python/FastAPI, porque o usuário indicou manutenção futura como fator decisivo e porque o repositório já possui runtime Python ativo.

Essa decisão não transforma os módulos atuais em fonte confiável de implementação. O contrato ativo continua sendo a combinação de `backend/main.py`, `backend/mock_data.py`, `src/services/api.ts`, `src/services/database.ts` e `src/contexts/AuthContext.tsx`.

Node.js/TypeScript permanece documentado como alternativa caso a equipe revise a decisão e priorize padronização fullstack.
