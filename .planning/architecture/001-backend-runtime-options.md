# Decisao de Arquitetura 001: Opcoes de runtime do backend SINARCA

**Data:** 2026-05-22
**Status:** decisao em aberto
**Escopo:** reconstrucao da API/backend, integracao segura com frontend, Supabase local/producao e Dokploy via Dockerfile.

## Premissa corrigida

Nenhum runtime deve ser tratado como verdade assumida.

O repositorio atual prova apenas isto:

- O frontend ja existe em React/Vite/TypeScript.
- A API em producao local hoje e Python/FastAPI em `backend/main.py`.
- Essa API ativa usa dados em memoria e nao usa Supabase.
- Existe uma arquitetura Python relacional parcial em `backend/api/*`, `backend/core/*` e `backend/models/*`, mas ela nao esta ligada ao app ativo.
- O deploy Docker atual precisa ser refeito independentemente de Python ou Node.

Logo, a decisao a ser tomada nao e "Python vs Node" em abstrato. O criterio pratico e qual caminho reduz risco de manutencao futura para a equipe que vai operar o SINARCA.

## Opcoes

### Opcao A: Reconstruir a API em Python/FastAPI

**Resumo:** manter Python como runtime, mas reescrever a API limpa em vez de tentar remendar o `backend/main.py` atual.

**Stack possivel:**

- Python 3.12 ou 3.11
- FastAPI
- Pydantic v2
- SQLAlchemy 2 async + asyncpg
- Alembic para migracoes
- Supabase Postgres/Auth
- pytest + httpx
- Ruff/mypy ou Pyright
- Dockerfile API dedicado

**Forcas:**

- Preserva a linguagem atual do backend.
- FastAPI ja e adequado para APIs produtivas, OpenAPI e validacao.
- Mais coerente se a manutencao futura sera feita por equipe com mais familiaridade em Python.
- Melhor encaixe para futuras rotinas de IA/satelite/processamento geoespacial, caso elas fiquem no mesmo backend.
- Permite reaproveitar conceitos e alguns nomes de dominio existentes, mas sem carregar a implementacao quebrada.

**Riscos:**

- Precisa reconstruir seguranca, auth, autorizacao, persistencia e migracoes do zero de qualquer forma.
- Se a equipe tentar reaproveitar os modulos SQLAlchemy atuais sem auditoria, vai herdar inconsistencias de schema e dependencias ausentes.
- Continuara havendo dois ecossistemas no repo: Node para frontend e Python para backend.

**Quando escolher:**

- A manutencao futura sera majoritariamente Python.
- O time quer evitar uma troca de linguagem alem da troca de arquitetura.
- O backend tende a concentrar IA, satelite, geoprocessamento e jobs de auditoria ambiental.

### Opcao B: Reconstruir a API em Node.js/TypeScript

**Resumo:** trocar runtime para Node/TypeScript para unificar stack com o frontend e criar contratos compartilhados.

**Stack possivel:**

- Node 24 LTS
- TypeScript
- Fastify ou NestJS
- Prisma ou Drizzle
- Supabase Postgres/Auth
- Vitest
- Dockerfile API dedicado

**Forcas:**

- Unifica linguagem entre frontend e backend.
- Facilita DTOs compartilhados, testes de contrato em TypeScript e SDK interno.
- Encaixa bem com Supabase JS e tooling web.
- Pode reduzir friccao se o time principal e frontend/fullstack JS.

**Riscos:**

- A troca de linguagem adiciona custo de reescrita e manutencao.
- Pode ser pior para manutencao futura se a equipe de backend for mais forte em Python.
- Fluxos de IA/satelite/geoespacial podem acabar exigindo servicos Python separados depois.

**Quando escolher:**

- O time quer padronizar tudo em TypeScript.
- A prioridade e contrato frontend/backend e velocidade fullstack.
- O backend sera majoritariamente API transacional, sem processamento Python pesado no mesmo servico.

### Opcao C: Python API + workers especializados separados

**Resumo:** FastAPI continua como API principal; jobs pesados ficam em workers Python independentes ou filas, sem misturar tudo nas rotas HTTP.

**Forcas:**

- Mantem API em Python e organiza crescimento.
- Evita rotas HTTP lentas para Sentinel, IA, auditoria automatica, harvest de yield e cross-chain listeners.
- Facilita escalar jobs separadamente no futuro.

**Riscos:**

- Adiciona fila/scheduler e operacao extra.
- Pode ser prematuro se o MVP ainda nao precisa desses jobs reais.

**Quando escolher:**

- A plataforma vai evoluir rapido para monitoramento, IA, satelite, blockchain listeners e tesouraria automatizada.
- A equipe aceita uma arquitetura um pouco mais operacional desde o inicio.

## Matriz de decisao

| Criterio | Peso sugerido | Opcao A Python API | Opcao B Node API | Opcao C Python + workers |
|---|---:|---|---|---|
| Manutencao futura pela equipe | Alto | Melhor se time domina Python | Melhor se time domina TS | Melhor se time domina Python + operacao |
| Corte seguro do backend atual | Alto | Bom, desde que seja rebuild limpo | Bom, desde que contrato seja congelado | Bom, mas maior escopo |
| Integracao com frontend atual | Alto | Boa via contrato OpenAPI/DTOs | Muito boa via TS compartilhado | Boa via contrato OpenAPI/DTOs |
| Supabase local/producao | Alto | Viavel com SQLAlchemy/Alembic e Auth JWT | Viavel com Prisma/Drizzle | Viavel |
| IA/satelite/geoprocessamento | Medio/alto | Forte | Pode exigir servico Python futuro | Forte |
| Complexidade operacional inicial | Medio | Media | Media | Maior |
| Dokploy via Dockerfile | Alto | Viavel | Viavel | Viavel, com mais servicos |

## Decisao pendente

Para decidir sem assumir verdade, faltam tres respostas operacionais:

1. Quem vai manter o backend depois do MVP: perfil mais Python, mais TypeScript, ou misto?
2. Os fluxos de IA/Sentinel/geoprocessamento entram no backend principal ja no MVP ou podem ser adapters/jobs futuros?
3. O objetivo do primeiro corte e "substituir o Python atual com menor risco" ou "padronizar fullstack em uma linguagem"?

Enquanto isso nao for fechado, os planos abaixo devem permanecer como alternativas.
