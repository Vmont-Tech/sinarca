# Phase 07: emissions-inventory-and-compensation

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`.

## Escopo

- Completar inventário de emissões por escopo e período.
- Persistir documentação via upload seguro do backend.
- Vincular inventário ao fluxo de compensação.
- Criar dashboard de emissões versus créditos compensados.
- Remover resumos críticos calculados apenas em estado local.

## Fora de escopo

- Checkout geral do marketplace, salvo integrações necessárias.
- Consoles blockchain.
- Operações admin gerais.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo o item 10 do checklist.
- UI deve chamar `/inventory/declare` e `/inventory/upload`.
- Validações de tipo/tamanho do backend devem aparecer na experiência de upload.
- A compensação deve referenciar inventário persistido quando for iniciada por esse fluxo.
