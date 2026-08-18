# Workflow Operacional Sintético — SINARCA

**Status:** documento de alinhamento do sistema completo
**Base:** leitura de ROADMAP, PROJECT, STATE, REQUIREMENTS, Bible, checklist operacional, verificações de fase e fluxo operacional completo
**Última atualização:** 2026-08-18

Copyright (c) 2026 SINARCA. Todos os direitos reservados. Este documento consolida a visão operacional e evolutiva do sistema SINARCA para uso interno de produto, tecnologia, auditoria, governança e estratégia. Reprodução, distribuição ou uso externo dependem de autorização formal da SINARCA.

## 1. Objetivo

Consolidar o sistema inteiro em uma leitura simples para que o time compreenda o fluxo operacional, o estado atual do milestone v1.0, os próximos blocos de evolução e as melhorias identificadas.

Este documento é a versão sintética. A versão analítica está em `SINARCA_WORKFLOW_OPERACIONAL_ANALITICO.md`.

## 2. Tese do Sistema

O SINARCA é uma camada tecnológica de rastreabilidade, integridade e operação para créditos ambientais. Ele não substitui certificadoras, auditorias independentes, metodologias reconhecidas ou órgãos reguladores; ele organiza evidências, monitora risco, registra decisões, estrutura o ciclo financeiro-operacional e torna o ativo ambiental mais verificável.

## 3. Fluxo Operacional Completo

```text
Público / produtor / certificadora
        |
        v
Cadastro, identidade e perfil
        |
        v
Originação do projeto
        |
        v
QTAGs, geofence, documentos e baseline
        |
        v
Claims, evidências, conflitos e score de risco
        |
        v
Certificação técnica e autorização de tesouraria
        |
        v
Auditoria de campo e monitoramento satelital
        |
        v
Marketplace, carteira e compra
        |
        v
Aposentadoria / burn / certificado de impacto
        |
        v
Tesouraria, blockchain, operação admin e compliance
```

## 4. Overview da Arquitetura

```text
Frontend público e painel logado
  - rotas públicas
  - dashboards por papel
  - dossiês, marketplace, auditoria e monitoramento
        |
        v
API FastAPI /api/v1
  - auth
  - projects
  - certifier
  - audit
  - integrity
  - satellite
  - marketplace
  - inventory
  - treasury
  - blockchain
        |
        v
Postgres/Supabase + PostGIS + Storage
  - projetos, perfis, documentos, boundaries
  - claims, evidence, conflicts, risk
  - observações satelitais e eventos
  - ledger, créditos, compras e auditoria
        |
        v
Adapters externos
  - Copernicus/Sentinel-2
  - Stellar/Soroban
  - Etherfuse
  - Polygon
  - registros oficiais futuros
```

## 5. Estado Atual do Milestone v1.0

| Indicador | Estado |
| --- | --- |
| Milestone | v1.0 — base operacional e fechamento de fluxos/telas |
| Progresso de fases | 7/13 fases completas |
| Progresso percentual | 54% |
| Planos executados | 42/42 planos planejados até agora |
| Requisitos completos | 42/74 |
| Próxima fase | Phase 05.1 — integrity-review-and-external-registries |
| Última verificação formal | 2026-08-18 |

Fases completas:

- Phase 01: backend-rebuild.
- Phase 02: public-transparency-and-profiles.
- Phase 03: project-origination-and-documents.
- Phase 04: certification-workbench.
- Phase 04.1: geospatial-foundation.
- Phase 04.2: integrity-layer-foundation.
- Phase 05: satellite-monitoring-and-field-audit.

Fases ainda não planejadas/executadas:

- Phase 05.1: revisão de integridade e registros externos.
- Phase 06: marketplace, carteira e aposentadoria.
- Phase 07: inventário de emissões e compensação.
- Phase 08: tesouraria, blockchain e interoperabilidade.
- Phase 09: operação admin e observabilidade.
- Phase 10: segurança, compliance e governança de dados.

## 6. O Que Já Temos

- Backend FastAPI canônico em `backend_app`, com `/api/v1`.
- Auth própria com Argon2/JWT.
- Supabase/Postgres como fonte durável, com migrations e seed.
- Frontend React/Vite com rotas públicas e painel protegido.
- Dossiê público de projeto e perfis públicos.
- Originação de projeto com QTAGs, geofence, documentos e timeline.
- PostGIS para perímetro real e detecção de overlap.
- Integrity Layer com Claim, Evidence, Conflict, Risk Score e Auto Hold.
- Bancada da certificadora com decisão, certificado e histórico.
- Auditoria de campo com evidências e assinatura verificável.
- Copernicus/Sentinel-2 para NDVI, NDMI, NBR, baseline, anomalias e monitoramento contínuo.
- Motor de risco append-only com sinais explicáveis.
- Base de marketplace, ledger, compra, aposentadoria, inventário, tesouraria e blockchain.

## 7. O Que Ainda Precisa Melhorar Muito

### Frontend e Produto

- Refinar telas públicas para explicar melhor confiança, risco, status e ciclo do ativo.
- Refinar dashboards logados por papel, com hierarquia visual, ações claras e menos fragmentação.
- Criar uma jornada contínua entre projeto, score, QID, monitoramento, auditoria e marketplace.
- Melhorar estados vazios, loading, erro, permissões, responsividade mobile e consistência de componentes.
- Transformar dashboards em superfícies operacionais, não só páginas informativas.

### Integridade e Compliance

- Implementar four-eyes review para risco HIGH+.
- Definir build vs. buy para registros oficiais externos: ONR/CNM, SIGEF/INCRA, CAR/SICAR.
- Criar Trust Badge público com checks claros.
- Evoluir QID/Selo Sinarca como prova versionada de integridade ambiental.

### Marketplace e Operação Financeira

- Fechar checkout real, carteira por projeto/vintage/lote, recibos e histórico.
- Definir pagamento/settlement sem simulação silenciosa.
- Conectar aposentadoria/burn com certificado de impacto navegável.
- Completar tesouraria e execução blockchain em UI/admin.

### Operação, Segurança e Governança

- Criar console admin para usuários, organizações, providers, filas, overrides e health.
- Implementar observabilidade real, logs estruturados, status operacional e runbooks.
- Fechar LGPD/GDPR, DPO, retenção, anonimização, AML/CFT, MFA, gestão de segredos e auditoria externa.

## 8. Próximos Blocos Sugeridos

| Bloco | Foco | Por que vem agora |
| --- | --- | --- |
| v1.0 restante / Phase 05.1 | Revisão de integridade, four-eyes e registros externos | Fecha a confiança antes de escalar marketplace |
| v1.1 sugerido | UX pública/logada, Selo, QID e dashboards operacionais | Torna o sistema compreensível e vendável |
| v1.2 sugerido | Marketplace, carteira, aposentadoria e certificados | Fecha ciclo comprador e geração de receita |
| v1.3 sugerido | Inventário de emissões e compensação | Conecta demanda corporativa à aposentadoria |
| v1.4 sugerido | Tesouraria, blockchain e interoperabilidade | Remove simulação operacional e fecha lastro/token |
| v1.5 sugerido | Admin, observabilidade, segurança e governança | Prepara operação real e auditoria externa |

## 9. Leitura Executiva

O sistema deixou de ser uma demonstração baseada em telas e passou a ter fundação operacional real: API persistente, Postgres, documentos, geofence, integridade, risco, auditoria e Sentinel-2. A principal lacuna agora não é só técnica; é transformar essa base em experiência de produto coesa, com dashboards claros, trust layer visível, marketplace fechado e operação admin/governança pronta para produção.
