# Plano alternativo: reconstrução da API em Node.js/TypeScript

**Objetivo:** manter a opção Node documentada sem tratá-la como decisão tomada.

**Quando usar:** somente se a decisão final favorecer padronização fullstack em TypeScript.

## Stack possível

- Node.js LTS
- TypeScript
- Fastify ou NestJS
- Prisma ou Drizzle
- Supabase Postgres/Auth
- Vitest
- Dockerfile dedicado para API

## Tarefas de alto nível

1. Congelar contrato `/api/v1` com testes.
2. Criar `server/` com API Node.js.
3. Configurar Supabase local/produção.
4. Portar auth, projetos, certificação, auditoria, marketplace e ledger.
5. Isolar adapters Stellar/Etherfuse/Polygon.
6. Criar Dockerfile API Node e compor com frontend no Dokploy.
7. Remover Python apenas depois de UAT.

## Principal risco

A troca para Node.js só faz sentido se a manutenção futura for mais fácil em TypeScript. Caso a equipe queira preservar Python por manutenção, este plano deve ficar como referência, não como rota principal.
