---
phase: "02-public-transparency-and-profiles"
plan: "02-04"
subsystem: "public-profiles"
tags: ["profiles", "catalogs", "rankings", "roles"]
provides:
  - "Perfis públicos por papel"
  - "Catálogos públicos com dados persistidos"
  - "Métricas públicas e rankings por entidade"
affects: ["phase-02", "profiles", "public-web"]
completed: "2026-05-26"
---

# Phase 02: 02-04 Resumo

Perfis públicos, catálogos e rankings por papel foram completados usando dados de banco/API, com minimização de dados pessoais e estados públicos coerentes.

## Entregas
- Perfis de produtores, empresas, auditores e certificadoras usam contratos públicos.
- Catálogo de produtores foi validado via `/api/v1/producers`.
- Dados sensíveis são minimizados ou mascarados nos perfis públicos.
- Listagens e rankings deixam de depender de dados fixos novos no frontend.

## Verificação
- `/perfil/prod-001` verificado no browser integrado.
- Smokes HTTP validaram `/api/v1/profiles/prod-001` e `/api/v1/producers`.
- `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` passou.

## Decisões e Desvios
- Governança profunda de privacidade, retenção e direitos do titular permanece na Phase 10.

## Auto-checagem: APROVADA
