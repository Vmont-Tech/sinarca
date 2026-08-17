# Phase 5 Copernicus Provider Prerequisite

**Timestamp:** 2026-08-17
**Scope:** `CopernicusProvider` (`backend_app/adapters/copernicus.py`), primeiro adapter assincrono do repositorio, sobre a Copernicus Data Space Ecosystem (CDSE).
**Safety:** Nenhuma credencial real foi usada ou printada. Todas as chamadas de rede reais estao bloqueadas nesta fase — os testes automatizados (`tests/adapters/test_copernicus.py`) rodam inteiramente contra `httpx.MockTransport`.

## Status atual

**`BLOCKED_MISSING_PROVIDER_CREDENTIALS`** — nenhuma credencial provisionada neste ambiente (D-10).

## Environment Presence

Secrets foram checados apenas como `SET`/`UNSET`; valores nunca foram impressos.

| Variable | State |
|---|---|
| `COPERNICUS_CLIENT_ID` | UNSET |
| `COPERNICUS_CLIENT_SECRET` | UNSET |

Comando:

```bash
env | grep -c COPERNICUS_CLIENT_ID   # 0
env | grep -c COPERNICUS_CLIENT_SECRET  # 0
```

## Pré-requisito operacional (fora do código)

1. Criar uma conta gratuita em [dataspace.copernicus.eu](https://dataspace.copernicus.eu).
2. No painel do usuário, gerar um OAuth client em **User Settings → OAuth clients → Create new client**.
3. Copiar `client_id`/`client_secret` gerados.

Este cadastro é responsabilidade operacional do time — nenhum código deste plano tenta automatizá-lo.

## Variáveis de ambiente

| Variável | Descrição | Onde documentada |
|---|---|---|
| `COPERNICUS_CLIENT_ID` | Client ID do OAuth client CDSE | `.env.example` (Plan 01) |
| `COPERNICUS_CLIENT_SECRET` | Client Secret do OAuth client CDSE | `.env.example` (Plan 01) |

Lidas via `os.getenv(...)` em `CopernicusAdapterConfig.from_env()` — não modeladas em `Settings` (mesmo padrão fail-closed já usado por `backend_app/adapters/stellar.py`).

## Endpoints usados (D-08/D-09)

| Endpoint | URL | Uso |
|---|---|---|
| Token (OAuth2 client credentials) | `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` | Autenticação, token cacheado em memória (~10 min de validade, renovado com margem de 30s) |
| STAC search | `https://stac.dataspace.copernicus.eu/v1/search` | Descoberta de cenas Sentinel-2 L2A (`search_scenes`) |
| Statistical API | `https://sh.dataspace.copernicus.eu/api/v1/statistics` | NDVI/NDMI/NBR agregados sobre a AOI, via preferencial (`get_statistics`) |
| Process API | `https://sh.dataspace.copernicus.eu/api/v1/process` | Imagem PNG bruta, apenas para before/after de anomalia `ANALYZED` (`get_image`, D-19) |

## Quotas (D-11 — conta gratuita CDSE)

| Limite | Valor |
|---|---|
| Processing Units / mês | 10.000 |
| Processing Units / min | 300 |
| Requests / min | 300 |
| Requests concorrentes | **2** (aplicado via `asyncio.Semaphore` interno ao adapter) |
| Transferência / mês | 12 TB |

## Custo em PU

| API | Custo mínimo |
|---|---|
| Statistical | ≥ 0,01 PU/request |
| STAC/Catalog | ≥ 0,01 PU (até 1 PU) por consulta de área+tempo |
| Process | A chamada mais cara — por isso só roda quando uma anomalia chega a `ANALYZED` (D-19), nunca em observação de rotina |

## Comportamento sem credenciais

Todo método público (`search_scenes`, `get_statistics`, `get_image`) chama `self.config.assert_ready()` como primeira instrução — antes de qualquer request HTTP — e levanta:

```
RuntimeError: Configuração Copernicus incompleta: COPERNICUS_CLIENT_ID, COPERNICUS_CLIENT_SECRET
```

Consequências downstream (fases seguintes que consomem este adapter):
- O job de monitoramento marca `satellite_jobs.status = FAILED` com essa mensagem.
- A UI exibe o empty state "Monitoramento satelital bloqueado" (ver `05-UI-SPEC.md`).
- Nenhum dado simulado é exibido — nenhum caminho de código deste adapter devolve NDVI/NDMI/NBR derivado de hash ou valor default.

## Smoke real quando as credenciais existirem (checklist manual)

Herdado de `05-VALIDATION.md` "Manual-Only Verifications":

- [ ] Configurar `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` reais em `.env`.
- [ ] Rodar reconstrução histórica de 1 projeto (Plan 05 — scheduler ainda não existe neste plano).
- [ ] Conferir `copernicus_api_usage` populado com linhas `TOKEN`/`STAC_SEARCH`/`STATISTICS` de `outcome = SUCCESS`.
- [ ] Confirmar que nenhuma janela de tempo excedeu 2 requests concorrentes (checar `duration_ms`/timestamps sobrepostos na tabela).
- [ ] Confirmar que a quota mensal (10.000 PU) não foi violada em um único smoke run.

## Observabilidade

Sem stack de métricas (Prometheus) nesta fase — Phase 9 (`admin-operations-and-observability`) ainda não foi construída. Consumo é registrado como linhas estruturadas na tabela `copernicus_api_usage` (D-26) a cada chamada do adapter, via `CopernicusUsageRecord`/`usage_recorder`. Nenhum campo desse record carrega o client secret (coberto por teste: `test_usage_records_never_contain_client_secret`).

## Provider Smoke Status

| Provider | Status | Evidence |
|---|---|---|
| Copernicus Data Space Ecosystem | BLOCKED | `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` ausentes; nenhuma chamada real foi feita. Cobertura completa via `httpx.MockTransport` em `tests/adapters/test_copernicus.py` (11 testes, sem credencial real, sem rede). |

## Next Actions

1. Criar conta gratuita CDSE e gerar OAuth client.
2. Definir `COPERNICUS_CLIENT_ID`/`COPERNICUS_CLIENT_SECRET` em `.env`.
3. Rodar o checklist de smoke real acima quando o scheduler/reconstrução histórica (planos seguintes) existir.
