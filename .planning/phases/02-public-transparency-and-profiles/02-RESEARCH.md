# Phase 02 Research

**Data:** 2026-05-26

## Mapa de implementação atual

### Frontend

- `src/App.tsx` já registra rotas públicas limpas e redirect legado para `/public/*`.
- `src/LandingPage.tsx`, `src/layouts/PublicLayout.tsx` e páginas públicas já formam a base de navegação.
- `src/pages/Dashboard/PublicExplorer.tsx` lista transações a partir de `database.getTransactions()`, mas filtra em memória.
- `src/pages/Dashboard/TransactionDetails.tsx` existe para `/tx/:hash`, mas a origem ainda depende da lista geral.
- `src/pages/Dashboard/MrcaDetails.tsx` exibe detalhe de projeto, mas ainda contém documentos, auditoria e textos blockchain fixos/legados.
- `src/pages/Dashboard/UserProfile.tsx` resolve empresas, auditores e certificadoras; não há catálogo público de produtores.
- `src/pages/Login.tsx` não oferece `certifier` no seletor de papel apesar do backend aceitar.
- `src/pages/Dashboard/Settings.tsx` não conclui edição real de documento/avatar.

### Backend/API

- `backend_app/modules/projects/routes.py` expõe `/projects`, `/projects/{id}`, `/certifiers`, `/auditors`, `/companies`.
- `backend_app/modules/projects/service.py` transforma `Project` em `ProjectMRCA`, mas não inclui QTAGs, baseline técnico, certificações, auditorias, documentos, créditos e transações no detalhe.
- `backend_app/modules/marketplace/routes.py` expõe `/transactions` sem filtros query e sem endpoint de detalhe.
- `backend_app/modules/auth/routes.py` expõe login, cadastro, `/auth/me` e `PATCH /auth/me`.
- `backend_app/modules/profiles/repository.py` persiste nome, e-mail, documento, telefone, avatar e organização quando recebidos.

### Banco/seed

- `supabase/seed.sql` já inclui:
  - organizações e perfis para empresa, auditor, certificadora, produtor e admin;
  - projetos com vínculos de produtor/desenvolvedor, auditor, certificadora e registry;
  - `project_tags`, `project_baselines`, `certifications`, `audits`, `documents`, `chain_events`, `ledger_entries`;
  - compras e aposentadorias seedadas.
- Falta expor alguns desses dados em contratos públicos de API.

## Lacunas críticas

1. **Dossiê público incompleto:** a UI de projeto não consome QTAGs, baseline, certificação, auditoria, documentos, créditos e transações reais.
2. **Explorer sem contrato de filtro:** filtros exigidos pelo checklist não existem no endpoint.
3. **Perfis públicos incompletos:** produtor não tem catálogo público e atividade pública fica vazia.
4. **Cadastro por perfil incompleto:** certificadora está ausente na UI.
5. **Perfil editável incompleto:** documento/avatar não têm UX real.
6. **Conteúdo legal com placeholders:** Bible continha cidade, contato e DPO a definir; contato, suporte e DPO usam `contato@sinarca.com.br` provisoriamente.
7. **Dados fixos em telas públicas:** `MrcaDetails.tsx` contém documentos e auditoria estáticos.

## Estratégia técnica recomendada

- Criar contratos explícitos de API antes de refatorar as telas públicas.
- Reaproveitar `ProjectsService` e adicionar DTOs públicos agregados em vez de montar dossiê no frontend a partir de múltiplas chamadas frágeis.
- Estender `/transactions` com query params e adicionar `/transactions/{hash_or_id}`.
- Estender catálogos para `/producers` e, se necessário, `/profiles/{id}` público com campos minimizados.
- Tratar conteúdo legal como páginas públicas versionadas, usando a copy da Bible e removendo placeholders ou tornando-os configuráveis.
- Adicionar testes de contrato backend e testes/componentes frontend focados em fonte de dados e regressão de rota.

## Verificações mínimas da fase

- Backend:
  - `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py`
  - testes novos para dossiê público, filtros de transação e catálogo de produtores.
- Frontend:
  - `npm run lint`
  - `npm run build`
  - UAT manual em `/`, `/consulta`, `/feed`, `/projeto/:id`, `/tx/:hash`, `/perfil/:id`, `/login` e `/painel/configuracoes`.
- Fonte de dados:
  - `rg` para localizar dados fixos públicos remanescentes em `MrcaDetails`, `PublicExplorer`, `UserProfile`, `Login` e `Settings`.
  - `rg` para impedir links novos para `/public`.
