# Phase 05: audit-monitoring-and-anomalies

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`.

## Escopo

- Completar auditoria de campo com evidências reais.
- Registrar fotos, vídeos, geolocalização, observações, laudo e assinatura verificável.
- Definir e implementar cliente de campo web/PWA/mobile para auditoria, com captura adequada ao escopo web ou mobile.
- Permitir releitura de QTAGs/NFC durante auditoria quando o ambiente/hardware permitir.
- Mostrar laudo e evidências no projeto conforme visibilidade.
- Completar tela de monitoramento com baseline Sentinel-2, NDVI, pontos e hash.
- Criar registro/listagem de anomalias.
- Automatizar bloqueio, notificação e desbloqueio auditável.
- Recalcular créditos após incidente/anomalia quando aplicável.
- Preparar ajuste de tokens/créditos após recálculo quando houver perda ou recuperação.

## Fora de escopo

- Checkout de compra.
- Certificado de aposentadoria.
- Consoles admin gerais.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo os itens 5 e 6 do checklist.
- `mock://` não pode representar evidência operacional.
- Bloqueios e desbloqueios devem ser persistidos e auditáveis.
- Notificações de incidente devem ter registro persistido ou bloqueio explícito.
- Anomalia sem job automático precisa aparecer como limitação explícita no plano.
