---
phase: "02-public-transparency-and-profiles"
plan: "02-02"
subsystem: "public-api"
tags: ["api-v1", "public-dossier", "transactions", "profiles", "producers"]
provides:
  - "Dossiê público agregado de projeto"
  - "Explorer público de transações com filtros"
  - "Detalhe público de transação por hash ou ID"
  - "Perfis públicos minimizados por papel"
affects: ["phase-02", "backend_app", "public-api-contract"]
completed: "2026-05-26"
---

# Phase 02: 02-02 Resumo

Contrato público da API v1 foi ampliado para sustentar dossiê de projeto, explorer de transações, catálogo de produtores e perfis públicos com dados persistidos e minimizados.

## Entregas
- Criado contrato para `/api/v1/projects/{id}/public-dossier`.
- Criados filtros públicos de transação por projeto, hash, tipo, comprador e status.
- Criado detalhe público em `/api/v1/transactions/{hash_or_id}`.
- Perfis públicos em `/api/v1/profiles/{id}` mascaram documentos e minimizam dados pessoais.
- Catálogo público de produtores exposto via `/api/v1/producers`.

## Verificação
- `uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py` passou com `7 passed`.
- Smokes HTTP locais validaram dossiê, transações, perfil e produtores.

## Decisões e Desvios
- O dossiê público ficou agregado no backend para evitar montagem frágil na UI.
- Admin segue fora de cadastro público e permanece escopo da Phase 9.

## Auto-checagem: APROVADA
