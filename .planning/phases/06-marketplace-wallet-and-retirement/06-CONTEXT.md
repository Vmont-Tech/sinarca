# Phase 06: marketplace-wallet-and-retirement

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`.

## Escopo

- Completar checkout do marketplace com resumo, taxas, total e confirmação.
- Definir compra para empresas e cidadãos, incluindo autenticação, recibo e responsabilidades de due diligence.
- Definir integração de pagamento/settlement ou registrar explicitamente o modo sem gateway.
- Exibir estoque/saldo por projeto, vintage e lote.
- Criar carteira off-chain por projeto/vintage.
- Completar histórico de ledger, filtros, exportação e detalhe por hash/ID.
- Completar aposentadoria com formulário real, validação de saldo, burn/hash e certificado.
- Criar histórico de créditos aposentados por empresa.

## Fora de escopo

- Inventário de emissões completo.
- Tesouraria/provider console.
- Admin geral de usuários.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo os itens 7, 8 e 9 do checklist.
- Compra e aposentadoria devem registrar `ledger_entries`.
- Frontend não deve usar `buyer_id` fixo nem projeto/volume hardcoded.
- Compra não pode parecer liquidada se o pagamento/settlement estiver simulado ou fora de escopo.
- Certificado de impacto deve ser navegável após a aposentadoria.
