# Phase 02 Discussion Log

**Data:** 2026-05-26
**Modo:** discussão orientada por documentação e auditoria.

## Decisão de condução

A fase foi planejada sem interromper por perguntas porque o escopo estava suficientemente definido por:

- checklist operacional validado em `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`;
- cobertura da Bible validada em `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`;
- recorte de roadmap já aprovado para Phase 2.

## Questões resolvidas

| Tema | Decisão | Fonte |
|---|---|---|
| Recorte da fase | Fechar público/transparência e auth/perfis; deixar originação, marketplace, admin e compliance operacional para fases próprias. | `ROADMAP.md`, `FLOW_SCREEN_CHECKLIST_AUDIT.md` |
| URLs públicas | Manter URLs limpas como contrato; `/public/*` fica apenas como redirect de compatibilidade. | `BLUEPRINT_V1.md`, `App.tsx` |
| Dossiê de projeto | Usar dados persistidos de projeto, QTAGs, baseline, certificação, auditoria, documentos, créditos e transações. | Checklist item 1 |
| Explorer | Evoluir de filtro local para filtros de API/UI por projeto, hash, tipo, comprador e status. | Checklist item 1 |
| Perfis públicos | Incluir produtor, empresa, auditor e certificadora, todos vindos do banco/seed. | Checklist itens 1 e 2 |
| Cadastro por perfil | Expor produtor, empresa, auditor e certificadora; admin não deve ter cadastro público. | Checklist item 2 |
| Conteúdo legal | Publicar Termos, Privacidade, Suporte Jurídico e Institucional na Phase 2; operação completa de LGPD fica na Phase 10. | Bible docs 10-13 |
| Regra de dados | Nenhuma tela nova pode usar mock runtime ou exemplo fora do seed/API. | Regra transversal do checklist |

## Assunções de planejamento

- O backend Phase 1 é a base canônica para `/api/v1`.
- `supabase/seed.sql` deve ser expandido quando faltar dado demonstrativo necessário para telas públicas.
- Componentes existentes podem ser evoluídos em vez de substituídos se isso preservar a experiência e reduzir risco.
- O dossiê público deve proteger dados pessoais e exibir documentos/identificadores apenas quando forem públicos por regra de negócio.
- Placeholders legais de DPO e contato devem usar `contato@sinarca.com.br` provisoriamente; cidade/foro não deve ser inventado.

## Decisões não bloqueantes para execução

- Contato, suporte jurídico e DPO provisórios: `contato@sinarca.com.br`.
- A nomenclatura pública de "produtor" deve aparecer como "produtor", "desenvolvedor de projeto" ou ambos?
- Perfis públicos devem exibir documento completo, documento mascarado ou apenas status verificado?

Os dois últimos pontos não bloqueiam o planejamento porque os planos exigem configuração explícita ou estado seguro quando a informação oficial não existir.
