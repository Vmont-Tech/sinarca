# Phase 01: auditoria de cobertura dos documentos

**Data:** 2026-05-22
**Objetivo:** validar se os requisitos dos documentos fornecidos estão cobertos na fase de refatoração/reconstrução do backend.

## Veredito

A Phase 01 cobre os requisitos dos documentos no nível de backend, contrato de API, persistência, seed de dados do frontend, adapters, segurança, deploy e smoke real em staging/testnet. Alguns itens seguem fora do escopo executável porque dependem de aplicativo móvel, mainnet, chaves produtivas, operação financeira real ou modelos de IA/satélite produtivos.

## Cobertura detalhada

| Fonte | Requisito | Status na Phase 01 | Plano |
|---|---|---|---|
| PDF 3.1 | Registro de produtor/projeto, CPF/CNPJ, município/estado e tipo de projeto | Coberto por schema/API de projetos e profiles | 01-03, 01-04 |
| PDF 3.1 | Quatro tags NFC 424 DNA, coordenadas, polígono e área em hectares | Coberto por `project_tags`, geofencing e API | 01-03, 01-04 |
| PDF 3.1 | Baseline Sentinel-2, hash, ~5.000 pontos e NDVI | Coberto por `project_baselines` e adapter mock/sandbox | 01-03, 01-04 |
| PDF 3.2 | Certificação, cálculo de potencial e certificado digital | Coberto por `certifications` e rotas de certificadora | 01-03, 01-04 |
| PDF 3.3 | Mint bloqueado na Stellar/Soroban | Coberto por adapter, contrato Soroban e smoke testnet obrigatório | 01-05 |
| DOCX mod. 1 | Sponsored reserves e trustlines patrocinadas | Coberto por porta `StellarReserveSponsor` e testes de adapter | 01-05 |
| DOCX mod. 1 | Mint somente após confirmação Etherfuse/Tesouro | Coberto por `treasury_positions` e orquestração de mint | 01-05 |
| PDF 3.4 | Auditoria em campo, laudo, evidências e assinatura | Coberto por `audits`, `documents` e rotas de auditoria | 01-04 |
| PDF 3.5 | Desbloqueio após auditoria aprovada | Coberto por transição de status e adapter unlock | 01-04, 01-05 |
| DOCX mod. 2 | `ISinarcaLiquidity`, `EtherfuseAdapter`, porta `TransferoAdapter` | Coberto por adapters financeiros | 01-05 |
| PDF 3.6 | Compra de créditos | Coberto por marketplace, purchases, ledger e transações persistentes para frontend | 01-04 |
| DOCX mod. 3 | Ledger off-chain/omnichannel em vez de wallet externa do comprador | Coberto por `ledger_accounts` e `ledger_entries` | 01-03, 01-04 |
| DOCX mod. 3 | Tesouraria, yield 90/10 e `SocialImpactVault` | Coberto por schema e serviço de tesouraria | 01-03, 01-05 |
| PDF 3.7 | Aposentadoria/burn e certificado | Coberto por `retirements`, burn adapter e API `/marketplace/compensate` | 01-04, 01-05 |
| PDF 4-5 | Monitoramento, anomalia, bloqueio e recálculo | Coberto por schema/API e job service mock/sandbox | 01-04 |
| DOCX mod. 4 | Lock-and-mint Polygon/EVM para projetos externos | Coberto por `external_chain_projects`, adapter Polygon vault e tentativa testnet/RPC quando houver acesso | 01-05 |
| Bible RF/RNF | Auth, papéis, segurança, auditoria, performance, LGPD | Coberto por auth/roles, RLS, audit events e testes | 01-02, 01-03, 01-04 |
| Codebase concerns | API demo, mocks, compose inválido, chamada hardcoded | Coberto por contrato, backend novo, seed dos mocks frontend, frontend fix e deploy sem fallback | 01-01, 01-02, 01-03, 01-04, 01-06 |

## Itens parcialmente cobertos ou fora do escopo executável

| Item | Decisão |
|---|---|
| App móvel para leitura NFC e auditoria | Fora da Phase 01; a fase entrega API/schema para receber dados do app. |
| Integração live com Copernicus/Sentinel-2 | Parcial; adapter mock/sandbox e schema nesta fase, live futura. |
| IA real de detecção NDVI/desmatamento | Parcial; thresholds, eventos e contratos nesta fase, modelo real futuro. |
| Deploy com chaves produtivas/mainnet | Fora; a fase exige staging/Dokploy, mas não produção/mainnet. |
| Stellar/Soroban testnet | Obrigatório; Phase 1 não fecha sem deploy/invoke/status real em testnet. |
| Etherfuse/Polygon sandbox/testnet | Parcial condicionado a acesso; exige tentativa real, mas pode fechar como bloqueio externo documentado se credenciais/API/RPC não existirem. |
| Emissão real de PDF de certificado | Parcial; contrato/campo URL e stub verificável nesta fase, render final futuro. |

## Gaps resolvidos pelo replanejamento

- O plano anterior documentava Python/Supabase/Stellar, mas não amarrava de forma verificável os ajustes do DOCX.
- A nova fase exige ledger off-chain e tesouraria/yield como requisitos de backend, não como melhorias futuras.
- A nova fase exige adapters formais para Etherfuse/Transfero/Polygon, sponsored reserves e lock-and-mint.
- A nova fase explicita que wallet externa do comprador não é fluxo do MVP.
- A nova fase adiciona schema push Supabase como tarefa bloqueante.
- A discussão atual tornou obrigatórios: Supabase real, auth própria contra Postgres real, staging/Dokploy, frontend consumindo `backend_app` e Soroban testnet real.
- Dados mockados no frontend entram no seed e/ou em endpoints persistentes; telas de transações e catálogos não devem depender de mocks em runtime.

## Resultado

Os requisitos dos documentos estão cobertos pela Phase 01 replanejada, desde que os seis planos `01-01` a `01-06` sejam executados em ordem e que os itens classificados como fora do escopo sejam mantidos como fases futuras, não como lacunas silenciosas.
