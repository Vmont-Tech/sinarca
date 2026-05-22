# Plano Alternativo: Reconstrucao da API em Node.js/TypeScript

**Objetivo:** manter a opcao Node documentada sem trata-la como decisao tomada.

**Quando usar:** somente se a decisao final favorecer padronizacao fullstack em TypeScript.

## Stack possivel

- Node 24 LTS
- TypeScript
- Fastify ou NestJS
- Prisma ou Drizzle
- Supabase Postgres/Auth
- Vitest
- Dockerfile API dedicado

## Tarefas de alto nivel

1. Congelar contrato `/api/v1` com testes.
2. Criar `server/` com API Node.
3. Configurar Supabase local/producao.
4. Portar auth, projetos, certificacao, auditoria, marketplace e ledger.
5. Isolar adapters Stellar/Etherfuse/Polygon.
6. Criar Dockerfile API Node e compor com frontend no Dokploy.
7. Remover Python apenas depois de UAT.

## Principal risco

A troca para Node so faz sentido se a manutencao futura for mais facil em TypeScript. Caso a equipe queira preservar Python por manutencao, este plano deve ficar como referencia, nao como rota principal.
