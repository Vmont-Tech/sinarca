# Phase 09: admin-operations-and-observability

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`.

## Escopo

- Criar dashboard admin operacional.
- Gerenciar usuários, papéis e organizações.
- Consultar auditoria de eventos sensíveis.
- Criar reprocessamento/manual override controlado para projeto, ledger e status.
- Criar tela de health/status para API, Postgres, providers, filas, jobs e notificações.
- Vincular runbooks de suporte, manutenção e resposta a incidentes operacionais.
- Documentar provisionamento administrativo de admin quando necessário.

## Fora de escopo

- Cadastro público de admin.
- Operação financeira produtiva mainnet.
- Mobile nativo NFC/auditor.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo o item 12 do checklist e operações admin necessárias para os demais fluxos.
- Admin não pode ser criado pelo cadastro público.
- Override sensível deve exigir motivo e criar evento compensatório.
- Health/status deve distinguir falha real, provider sem credencial e integração fora de escopo.
- Suporte operacional deve diferenciar incidente técnico, dúvida de usuário e pedido jurídico/privacidade.
