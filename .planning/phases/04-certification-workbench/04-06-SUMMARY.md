---
phase: 04-certification-workbench
plan: 06
subsystem: frontend
tags: [react, typescript, tailwind, formdata, multipart-upload]

# Dependency graph
requires:
  - phase: 04-certification-workbench/04-02
    provides: "GET /certifier/projects/{id}/review — dossie tecnico completo"
  - phase: 04-certification-workbench/04-03
    provides: "PATCH /certifier/projects/{id}/decision multipart/form-data append-only"
  - phase: 04-certification-workbench/04-05
    provides: "GET /certifier/queue?scope=main|corrections com counts; GET /certifier/projects/{id}/history com filtros event_type/actor_role"
provides:
  - "src/services/certifierReview.ts — cliente tipado da bancada (fila por escopo, dossie, historico, decisao multipart)"
  - "src/pages/Dashboard/CertifierReview.tsx — bancada completa: card expansivel, duas filas, seis abas, formulario de decisao com upload real"
affects: [04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fetchCertificationHistory monta o envelope CertificationHistoryResponse no cliente a partir da lista bruta retornada pela API (a rota mantem o formato de lista no nivel raiz, documentado como desvio deliberado em 04-05-SUMMARY.md); availableEventTypes/availableActorRoles sao derivados de uma chamada sem filtro e cacheados por projeto."
    - "document_item (usado pelo dossie interno da certificadora, nao apenas pelo publico) nao expoe filename/metadata — a aba Documentos usa o tipo de documento como rotulo (documentTypeLabel), nao o nome do arquivo original."

key-files:
  created:
    - src/services/certifierReview.ts
  modified:
    - src/pages/Dashboard/CertifierReview.tsx

key-decisions:
  - "fetchCertificationHistory monta o envelope descrito na prosa do plano (events/availableEventTypes/availableActorRoles) inteiramente no cliente, porque a rota GET /certifier/projects/{id}/history entrega uma lista JSON no nivel raiz (desvio ja documentado em 04-05-SUMMARY.md, protegido por teste imutavel). Os tipos/atores disponiveis sao derivados de uma chamada sem filtro, cacheada por projeto, e recalculados apenas quando o usuario limpa os filtros."
  - "A aba Documentos usa document_item (sem filename/metadata) em vez do texto literal do plano ('filename de metadata.filename'), porque o serializador interno realmente entregue pelo plano 04-02 (document_item, distinto de public_document_item) nao inclui esses campos. O rotulo exibido usa o tipo do documento (documentTypeLabel), mesmo padrao ja usado em MrcaDetails.tsx."

requirements-completed: [CERT-01, CERT-02, CERT-03]

# Metrics
duration: ~25min
completed: 2026-08-15
---

# Phase 04 Plan 06: Bancada Completa da Certificadora (Card Expansível, Seis Abas, Decisão com Upload Real) Summary

**`CertifierReview.tsx` deixou de ser uma lista com três botões soltos e virou a bancada completa da certificadora: duas filas com contador, card expansível com seis abas (Resumo/QTAGs/Documentos/Cálculo/Decisão/Histórico), formulário de decisão bloqueado por dossiê mínimo e upload real de certificado via `FormData`.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-15
- **Tasks:** 3/3
- **Files modified:** 2 (1 criado: `src/services/certifierReview.ts`; 1 reescrito: `src/pages/Dashboard/CertifierReview.tsx`)

## Accomplishments

- `src/services/certifierReview.ts` (novo) espelha o padrão de `projectDocuments.ts`: `fetchCertifierQueue(scope)`, `fetchCertifierReview(projectId)`, `fetchCertificationHistory(projectId, filters)` e `decideCertification(projectId, input)` (envia `FormData` real com `decision`/`methodology`/`credit_potential`/`credit_potential_adjustment_reason`/`notes`/`rejection_category`/`certificate`, nunca setando `Content-Type` manualmente). `decisionErrorMessage` traduz erros do servidor para as cópias exatas do `04-UI-SPEC.md` (dossiê incompleto, falha de upload de certificado, falha de autorização de tesouraria).
- `CertifierReview.tsx` reescrito: fila dividida em "Fila de decisão" / "Aguardando retorno do produtor" (com contador âmbar `counts.corrections`), estados vazios com as duas cópias exatas do UI-SPEC, card expansível por projeto (`toggleReview`, cache por `friendlyId`) com painel fixo de dossiê mínimo (baseline/QTAGs/documentos) e navegação por seis abas (`Resumo`, `QTAGs / Geofence`, `Documentos`, `Cálculo`, `Decisão`, `Histórico`).
- Aba **Decisão**: três botões (Aprovar certificação/Solicitar ajustes/Reprovar projeto) com estado opaco no não-selecionado; campos condicionais por decisão (metodologia/potencial/justificativa de ajuste/notas + dropzone real de PDF para APROVAR; categoria estruturada + descrição para REJEITAR/AJUSTES); dropzone usa apenas a casca visual do `AuditorReview.tsx` — a lógica é 100% nova, com `FormData` real, sem `local://` nem blob. `canSubmit` replica no cliente o gate do servidor (dossiê completo + certificado + metodologia + potencial > 0 + justificativa de ajuste quando diverge do sugerido em mais de 0.01) como UX; a validação autoritativa continua em `CertifierService.record_decision`. Confirmações destrutivas com as cópias exatas do UI-SPEC para Reprovar/Solicitar ajustes. Em sucesso, mensagens com os `statusLabels` renderizados como chips (`bg-emerald-50 text-emerald-700`); em erro, `decisionErrorMessage` mantém o rascunho intacto (D-14).
- Aba **Histórico**: dois `select` (tipo de evento/ator) alimentados por `availableEventTypes`/`availableActorRoles` derivados de uma chamada sem filtro à mesma rota (ver Decisões abaixo); linha do tempo no padrão `MrcaDetails.tsx`, exibindo notas internas (`metadata.description`/`metadata.response`) por decisão explícita de produto (D-22 — a certificadora vê notas internas).
- `decide()` antigo (notas hardcoded, `certifier_id: 'std-001'`, chamada JSON direta a `apiPatch`) removido por completo; toda decisão passa por `decideCertification`/`decisionErrorMessage`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar src/services/certifierReview.ts** - `cbfc7f8` (feat)
2. **Task 2: Card expansível com duas filas, contador e abas Resumo/QTAGs/Documentos/Cálculo** - `2ecebd6` (feat)
3. **Task 3: Aba Decisão (formulário completo + upload de certificado) e aba Histórico com filtros** - `493c1db` (feat)

**Plan metadata:** (adicionado no commit final desta execução)

## Files Created/Modified

- `src/services/certifierReview.ts` — Tipos (`CertifierQueueScope`, `CertificationDecision`, `PendencyCategory`, `CertifierReviewDossier`, `CertificationHistoryEvent`, `CertificationDecisionResult`, etc.), `PENDENCY_CATEGORY_OPTIONS`, `APPROVAL_STATUS_LABELS`, `fetchCertifierQueue`, `fetchCertifierReview`, `fetchCertificationHistory`, `decideCertification`, `decisionErrorMessage`.
- `src/pages/Dashboard/CertifierReview.tsx` — Reescrito por completo: duas filas com contador, card expansível, painel de dossiê mínimo, seis abas, formulário de decisão com upload real, histórico filtrável.

## Decisions Made

- `fetchCertificationHistory` monta o envelope `CertificationHistoryResponse` (events/availableEventTypes/availableActorRoles) inteiramente no cliente a partir da lista JSON bruta retornada por `GET /certifier/projects/{id}/history` — a rota manteve o formato de lista no nível raiz por decisão já registrada em `04-05-SUMMARY.md` (teste imutável `tests/test_certifier_workbench.py` consome a rota como array). Os tipos/atores disponíveis para os filtros são derivados de uma chamada sem filtro por projeto, cacheada em `historyOptionsByProject`, e não são recalculados a cada mudança de filtro (para não encolher as opções do `<select>` conforme o usuário filtra).
- A aba Documentos usa o serializador interno real (`document_item`, que não expõe `filename`/`metadata`) em vez do texto literal do plano ("filename de metadata.filename") — o serializador realmente entregue no plano 04-02 para a revisão interna da certificadora não inclui esses campos (só `public_document_item`, usado no dossiê público, tinha uma forma diferente, também sem filename). A UI exibe o tipo do documento via `documentTypeLabel` (mesmo padrão de `MrcaDetails.tsx`), hash, mimetype, tamanho e data de upload.
- `canSubmit` no cliente é gating de UX (T-04-22 do threat model, disposition `accept`); a validação autoritativa permanece 100% em `CertifierService.record_decision` no servidor.

## Deviations from Plan

### Acceptance criteria não satisfeitas literalmente (grep de linha única para import+uso)

Nenhuma correção de bug ou funcionalidade crítica ausente foi necessária — as três tasks foram implementadas com sucesso e o `npm run build` está verde. Três `acceptance_criteria` do plano, porém, pedem `grep -c "<símbolo>" arquivo == 1` para símbolos que aparecem necessariamente em duas linhas distintas de um módulo ES (a linha de `import { simbolo } from ...` e a linha de uso `simbolo(...)`), já que `grep -c` conta **linhas** correspondentes, não ocorrências totais:

- `grep -c "ProjectGeofencePreview" src/pages/Dashboard/CertifierReview.tsx` pede `== 1`; o arquivo tem 2 linhas (import + `<ProjectGeofencePreview tags={qtagDrafts} />`). O mesmo padrão de 2 linhas já existe em `MrcaDetails.tsx` (a própria referência que o plano manda copiar), então este é um padrão consistente com o resto do código-base, não um desvio de implementação.
- `grep -c "decideCertification" src/pages/Dashboard/CertifierReview.tsx` pede `== 1`; há 2 linhas (import + chamada em `submitDecision`).
- `grep -c "fetchCertificationHistory" src/pages/Dashboard/CertifierReview.tsx` pede `== 1`; há 2 linhas (import + chamada em `loadHistory`).

**Fix:** Nenhum — a implementação correta (importar e depois chamar a função) exige necessariamente 2 linhas. Reduzir para 1 linha exigiria import dinâmico ou uso inline sem importar (ambos piores). Tratado como imprecisão do grep de aceite, não como requisito de produto — mesma categoria de decisão já registrada em `04-05-SUMMARY.md` (teste/grep como fonte de verdade quando correto vs. prosa do plano quando a prosa está com um detalhe impreciso).
**Verification:** `npm run build` → código 0; todas as demais 15 `acceptance_criteria` grep-based das Tasks 1-3 (contagens de textos literais, classes exatas, ausência de padrões proibidos) passam exatamente como escrito.
**Impact on plan:** Nenhum — funcionalidade completa, sem scope creep, sem regressão de comportamento.

---

**Total deviations:** 1 categoria (imprecisão de 3 acceptance_criteria baseadas em grep de linha única para símbolos import+uso) — não é bug, não é funcionalidade ausente, não afeta `must_haves`/`success_criteria` do plano.
**Impact on plan:** Nenhum comportamento exigido pelos `must_haves`/`success_criteria` foi sacrificado — card expansível com as seis abas exatas, duas filas com contador âmbar, formulário completo bloqueado por dossiê mínimo e certificado obrigatório, upload real via `FormData`, histórico filtrável, tudo entregue e verificado via `npm run build` + inspeção de grep das demais 15 acceptance_criteria.

## Issues Encountered

- `npx tsc -b`/`npx tsc --noEmit -p tsconfig.app.json` seguem com dívida técnica pré-existente fora do escopo desta phase (88 erros após esta plan, contra 89 antes — nenhuma regressão; a única mudança relacionada a este arquivo foi a resolução natural de um aviso transitório de variável não utilizada entre a Task 2 e a Task 3, já que `setMessage` só passa a ser usado quando o formulário de decisão é implementado). `npm run build` (script real de build do projeto, via `vite build`) está limpo.
- `Dockerfile.frontend` segue modificado localmente e não relacionado a esta plan (já documentado em `deferred-items.md` desde o plano 04-03); não tocado.

## User Setup Required

None — nenhuma configuração de serviço externo é necessária.

## Next Phase Readiness

- `src/services/certifierReview.ts` e `CertifierReview.tsx` estão prontos para o plano 04-07 (verificação manual da UI, conforme `<verification>` do próprio plano 04-06 já delega as verificações manuais 1-5 para 04-07).
- Todo o fluxo de decisão (aprovar/reprovar/solicitar ajustes) agora passa pelo contrato multipart real do backend, sem mocks locais e sem `local://`.
- Nenhum bloqueio conhecido para o plano 04-07.

---
*Phase: 04-certification-workbench*
*Completed: 2026-08-15*

## Self-Check: PASSED

All created/modified files confirmed present on disk (`src/services/certifierReview.ts`, `src/pages/Dashboard/CertifierReview.tsx`); all 3 task commit hashes (`cbfc7f8`, `2ecebd6`, `493c1db`) confirmed in `git log`.
