# Phase 05: satellite-monitoring-and-field-audit

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` como "audit-monitoring-and-anomalies". Expandida em 2026-08-14 com a ingestão de `.planning/docs/bible/15_Geofance_sentinel_requisitos.md` (Satellite Historical Reconstruction & Monitoring), que se torna o escopo dominante da fase. Nome e diretório atualizados de `05-audit-monitoring-and-anomalies` para `05-satellite-monitoring-and-field-audit` para refletir a mudança.

**Depende de**: Phase 04.2 (`integrity-layer-foundation`), que por sua vez depende de Phase 04.1 (`geospatial-foundation`) — a AOI (Area of Interest) usada nas consultas ao Sentinel-2 é a `active_boundary` persistida na Phase 04.1, e as evidências produzidas aqui (satélite e campo) alimentam o modelo `Evidence` da Phase 04.2.

## Escopo

### Auditoria de campo (escopo original, mantido)

- Completar auditoria de campo com evidências reais.
- Registrar fotos, vídeos, geolocalização, observações, laudo e assinatura verificável.
- Definir e implementar cliente de campo web/PWA/mobile para auditoria, com captura adequada ao escopo web ou mobile.
- Permitir releitura de QTAGs/NFC durante auditoria quando o ambiente/hardware permitir.
- Mostrar laudo e evidências no projeto conforme visibilidade.

### Monitoramento satelital (escopo novo, Bible 15)

- Implementar `SatelliteProvider` (interface abstrata) com `CopernicusProvider` como implementação inicial (Copernicus Data Space Ecosystem, Sentinel-2 L2A).
- Descoberta de cenas via STAC; métricas via Statistical API (NDVI, NDMI, NBR) sem baixar imagens completas.
- Reconstrução histórica: mínimo 5 anos anteriores à criação do projeto, composição mensal (~60 pontos por projeto em 5 anos).
- Persistir `SatelliteObservation` por cena processada (cloud coverage, NDVI/NDMI/NBR mean/min/max).
- Gerar `ENVIRONMENTAL_BASELINE` a partir do histórico reconstruído — substitui `deterministic_baseline()` (hash do nome do projeto) por observação real.
- Detecção de anomalia por queda significativa de NDVI (`SatelliteAnomaly`), threshold configurável; anomalia nunca é rotulada automaticamente como `DEFORESTATION` — estados `DETECTED → ANALYZED → CONFIRMED/DISMISSED`.
- `ProjectEvent` para tipos iniciais: `VEGETATION_LOSS`, `VEGETATION_RECOVERY`, `POSSIBLE_FIRE`.
- `SatelliteEvidence` com hash SHA-256, vinculada a `Evidence` da Phase 04.2 quando relevante.
- Job de monitoramento contínuo (scheduler leve, ex. APScheduler in-process — sem introduzir Celery/Redis nesta fase, dado que o deploy atual é Dokploy single-container sem infraestrutura de fila) rodando periodicamente, respeitando `maxCloudCoverage` configurável (MVP: <20%, preferência <10%) e idempotente por `projectId + satellite + sceneId + processingVersion`.
- Observabilidade de consumo Copernicus (Processing Units) desde o primeiro commit da integração.
- Timeline/gráfico NDVI, camadas de mapa (RGB/NDVI/NDMI/NBR/Anomalies), comparação before/after na UI de projeto.

### Comum às duas trilhas

- Criar registro/listagem de anomalias.
- Automatizar bloqueio, notificação e desbloqueio auditável.
- Recalcular créditos após incidente/anomalia quando aplicável.
- Preparar ajuste de tokens/créditos após recálculo quando houver perda ou recuperação.

## Fora de escopo

- Checkout de compra.
- Certificado de aposentadoria.
- Consoles admin gerais.
- Estimativa automática de toneladas de carbono usando apenas NDVI.
- Classificação jurídica automática de desmatamento.
- Emissão automática de créditos baseada apenas em satélite.
- Fila/worker distribuído (Celery+Redis) — reservado para quando o volume de reconstrução histórica justificar; MVP usa scheduler in-process.
- Integração com registros externos (ONR/SIGEF/CAR) — fica na Phase 05.1.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo os itens 5 e 6 do checklist.
- `mock://` não pode representar evidência operacional; `deterministic_baseline()` não pode mais ser a fonte do baseline exibido ao usuário.
- Bloqueios e desbloqueios devem ser persistidos e auditáveis.
- Notificações de incidente devem ter registro persistido ou bloqueio explícito.
- Anomalia sem job automático precisa aparecer como limitação explícita no plano.
- Toda consulta ao Copernicus deve ter fallback fail-closed quando faltarem credenciais (mesmo padrão dos adapters blockchain em `backend_app/adapters/stellar.py`), nunca simular sucesso.
