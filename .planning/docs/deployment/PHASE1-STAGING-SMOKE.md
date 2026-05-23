# Phase 1 Staging Smoke

**Timestamp:** 2026-05-22T22:39:47Z  
**Status:** BLOCKED_EXTERNAL  
**Scope:** Dokploy staging API/web, Supabase remote Postgres, auth própria, frontend consumindo `backend_app`.

## Resultado

O smoke real de staging não foi executado porque as URLs e credenciais remotas não estão disponíveis neste ambiente. Nenhuma evidência de `/health`, login ou frontend staging foi fabricada.

## Variáveis Verificadas

| Variável | Estado |
|---|---|
| `STAGING_API_URL` | UNSET |
| `STAGING_WEB_URL` | UNSET |
| `DOKPLOY_API_URL` | UNSET |
| `DOKPLOY_API_TOKEN` | UNSET |
| `SUPABASE_ACCESS_TOKEN` | UNSET |
| `SUPABASE_PROJECT_REF` | UNSET |
| `DATABASE_URL` | UNSET |
| `SUPABASE_DB_URL` | UNSET |
| `STAGING_LOGIN_EMAIL` | UNSET |
| `STAGING_LOGIN_PASSWORD` | UNSET |
| `STAGING_COMPANY_EMAIL` | UNSET |
| `STAGING_COMPANY_PASSWORD` | UNSET |

Comando:

```bash
for name in STAGING_API_URL STAGING_WEB_URL DOKPLOY_API_URL DOKPLOY_API_TOKEN SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF DATABASE_URL SUPABASE_DB_URL; do if [ -n "${(P)name}" ]; then echo "$name=SET"; else echo "$name=UNSET"; fi; done
```

## Supabase Remoto

`supabase db push` contra Supabase real não foi executado.

Comando planejado quando houver credenciais:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push
```

Bloqueio exato:

```text
SUPABASE_ACCESS_TOKEN=UNSET
SUPABASE_PROJECT_REF=UNSET
SUPABASE_DB_URL=UNSET
DATABASE_URL=UNSET
```

Impacto: não há evidência de migrations aplicadas contra Postgres remoto de staging.

## API Staging `/health`

Comando executado:

```bash
if [ -n "$STAGING_API_URL" ]; then curl -fsS "$STAGING_API_URL/health"; else echo "BLOCKED: STAGING_API_URL unset"; fi
```

Resultado:

```text
BLOCKED: STAGING_API_URL unset
```

Impacto: não há evidência de API staging saudável em `/health`.

## Login com Auth Própria

Comando planejado quando houver URL e credenciais de staging:

```bash
curl -fsS -X POST "$STAGING_API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$STAGING_LOGIN_EMAIL\",\"password\":\"$STAGING_LOGIN_PASSWORD\"}"
```

Bloqueio exato:

```text
STAGING_API_URL=UNSET
STAGING_LOGIN_EMAIL=UNSET
STAGING_LOGIN_PASSWORD=UNSET
```

Impacto: não há evidência de login auth própria contra Postgres real no staging.

## Web Staging

Comando executado:

```bash
if [ -n "$STAGING_WEB_URL" ]; then curl -fsS "$STAGING_WEB_URL/"; else echo "BLOCKED: STAGING_WEB_URL unset"; fi
```

Resultado:

```text
BLOCKED: STAGING_WEB_URL unset
```

Impacto: não há evidência de frontend staging carregando ou consumindo `backend_app` via `VITE_API_URL`.

## Cutover Sem Backend Legado

Validações locais automatizadas:

Os artefatos de runtime/deploy foram inspecionados para garantir que só executam `backend_app`.

Resultado relevante: nenhuma referência ao runtime legado nos artefatos de runtime/deploy verificados.

Conclusão local: cutover sem retorno para o backend legado nos artefatos de deploy inspecionados.

Arquivos confirmados:

- `Dockerfile.api` executa `backend_app.main:app`.
- `docker-compose.dokploy.yml` define `BACKEND_RUNTIME=backend_app`.
- `Dockerfile.frontend` serve build estático Nginx.
- `src/services/api.ts` usa `VITE_API_URL` com default `/api/v1`, sem URL local hardcoded para produção.

## Status da Phase 1

Staging Dokploy permanece bloqueado por dependências externas. A Phase 1 tem build, compose e testes locais validados, mas ainda precisa das URLs e secrets remotos para fechar o smoke real exigido:

1. `STAGING_API_URL`
2. `STAGING_WEB_URL`
3. `DOKPLOY_API_URL`
4. `DOKPLOY_API_TOKEN`
5. `SUPABASE_ACCESS_TOKEN`
6. `SUPABASE_PROJECT_REF` ou `SUPABASE_DB_URL`
7. Credenciais de usuário staging para login auth própria
