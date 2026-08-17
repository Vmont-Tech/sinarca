# Phase 05: satellite-monitoring-and-field-audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-16
**Phase:** 05-satellite-monitoring-and-field-audit
**Areas discussed:** Auditoria de campo (evidências/assinatura/QTAG), SatelliteProvider/Copernicus (auth/endpoints/quotas), Reconstrução histórica e scheduler, Observações/anomalias/eventos, Bloqueio automático e recálculo de crédito, Visualização, Observabilidade de consumo

---

## Modo de condução

Esta discussão foi conduzida por Claude atuando como especialista de domínio do Sinarca, mesmo mandato já usado nas Phases 04.1/04.2 ("toda iteração humana será realizada por você como especialista no Sinarca"). Nenhum `AskUserQuestion` bloqueante foi necessário: o escopo já vinha detalhado na Bible (`15_Geofance_sentinel_requisitos.md`), o roadmap já define os 10 critérios de sucesso, e as decisões arquiteturais (Auto Hold, upload real, fail-closed) já têm precedente direto no código das Phases 3, 4, 04.1 e 04.2.

Pesquisa externa foi realizada nesta sessão (WebSearch/WebFetch contra `documentation.dataspace.copernicus.eu`) para resolver, com dados reais e não suposição, os pontos técnicos que a Bible deixava como link de referência: endpoint OAuth2, base URLs de STAC/Process/Statistical API, e quotas/limites da conta gratuita CDSE (10.000 PU/mês, 300 req/min, **2 requests concorrentes**). Esse último ponto — apenas 2 requests concorrentes — é a descoberta mais relevante para o desenho do scheduler (D-11/D-14 em CONTEXT.md): qualquer paralelismo ingênuo entre projetos estouraria a quota imediatamente.

## Auditoria de campo — evidências reais

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Manter evidências client-side (`local://`) e só formalizar visualmente | Mais rápido, mas viola a regra de aceite explícita ("`mock://`/local não pode representar evidência operacional") | |
| Upload real reaproveitando o padrão de `upload_project_document` (Phase 3) | Consistente com o padrão já estabelecido no código, hash SHA-256 real, vira `Evidence` automaticamente (Phase 04.2) | ✓ |

**Decisão:** upload real (D-01/D-02 em CONTEXT.md). Assinatura vira stub SHA-256 verificável, não biometria real (D-03) — mesmo princípio fail-closed dos adapters blockchain, sem fingir capacidade que o hardware não tem.

## SatelliteProvider / Copernicus — autenticação e endpoints

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Usar `sentinelhub-py` (SDK oficial) | Abstrai token refresh e chamadas, mas adiciona dependência maior | (decisão de biblioteca exata deferida ao planner/pesquisa técnica) |
| Chamar as APIs REST diretamente via `httpx` (já é dependência do projeto) | Menos dependências novas, mais controle sobre concorrência (crítico dado o limite de 2 requests simultâneas) | (idem) |

**Decisão:** endpoints e modelo de autenticação ficam travados em CONTEXT.md (D-08/D-09) com base na pesquisa externa; a escolha entre SDK oficial e `httpx` puro fica para `05-RESEARCH.md`/planner, já sinalizada como gray area técnica não de produto.

## Bloqueio automático e recálculo de crédito

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Criar um segundo mecanismo de bloqueio específico de satélite | Duplicaria o Auto Hold já construído na Phase 04.2 | |
| Alimentar o Risk Engine existente com um novo sinal (`SATELLITE_ANOMALY_CONFIRMED`) e reaproveitar o Auto Hold | Uma fonte de verdade só para bloqueio, consistente com D-04/D-06 da Phase 04.2 | ✓ |
| Recalcular toneladas de carbono automaticamente a partir de NDVI | Explicitamente fora de escopo na Bible | |
| Criar pendência estruturada de revisão manual (análoga a `certification_pendencies`) | Preserva "recálculo prepara ajuste, não executa automaticamente" (critério de sucesso 9) | ✓ |

**Decisão:** D-20/D-23 em CONTEXT.md.

---

## Claude's Discretion

- Nomes exatos de tabelas/colunas/endpoints/DTOs, desde que preservem os comportamentos decididos, usem `/api/v1`, gerem `audit_events`/timeline e não reintroduzam `mock://`/`local://` como evidência operacional.
- Biblioteca cliente exata para Copernicus (`sentinelhub-py` vs. `httpx` puro) e formato exato do evalscript NDVI/NDMI/NBR — decisão técnica, não de produto.
- Estrutura interna do scheduler além de "APScheduler in-process" e "respeitar 2 requests concorrentes".

## Deferred Ideas

- Integração com registros externos (ONR/SIGEF/CAR) — Phase 05.1.
- Fila distribuída (Celery/Redis) — evolução futura além do MVP.
- Batch Statistical API — evolução futura para centenas/milhares de projetos.
- App nativo avançado de captura de campo — já deferido desde a Phase 1.
- Canal de notificação ativo (e-mail/push) para incidentes — esta fase usa apenas registro persistido/timeline.
- Ancoragem blockchain do hash de evidência satelital — evolução futura (Bible seção 25).
