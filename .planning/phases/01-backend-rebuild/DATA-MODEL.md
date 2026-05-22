# Modelo de dados alvo: Supabase Postgres

**Data:** 2026-05-22
**Banco local:** Supabase CLI/Postgres local
**Banco producao:** Supabase managed Postgres

Este modelo serve para Python ou Node.

## Principios

- Supabase Postgres e a fonte canonica de dados.
- O service role nunca sai do backend.
- RLS deve estar ligada em tabelas acessiveis por APIs Supabase ou por futuras consultas diretas.
- A API executa regras de negocio e transacoes criticas.
- `backend/mock_data.py` vira fixture/seed, nao modelo implicito.
- Fluxos financeiros e blockchain devem ser idempotentes por chave de operacao.

## Entidades principais

| Tabela | Responsabilidade |
|---|---|
| `profiles` | Extensao de `auth.users`; papel SINARCA, documento, organizacao, telefone, status |
| `organizations` | Empresas, certificadoras, produtores/comunidades e entidades parceiras |
| `projects` | Projeto ambiental, status de ciclo, localizacao, area, metodologia, produtor |
| `project_tags` | Tags NFC 424 DNA, coordenadas, vertice, estado fisico e historico de leitura |
| `project_baselines` | Imagem Sentinel-2, hash baseline, NDVI, pontos analisados e evidencias |
| `certifications` | Decisao da certificadora, metodologia, potencial de creditos, assinatura digital |
| `audits` | Laudos de campo, coordenadas do auditor, fotos/evidencias e conclusao |
| `environmental_credits` | Lotes de creditos do projeto, quantidade, status, vintage, token metadata |
| `ledger_accounts` | Conta omnichannel/off-chain por usuario/organizacao/projeto |
| `ledger_entries` | Debitos/creditos do ledger unico; compra, reserva, aposentadoria, ajuste |
| `purchases` | Compra de creditos, pagamento, taxas, recibo, liquidacao e idempotencia |
| `retirements` | Aposentadoria/burn, certificado, documentacao de emissoes e hash final |
| `treasury_positions` | Lastro em Reais/Tesouro Direto via Etherfuse, valor, rendimento e status |
| `yield_distributions` | Colheita mensal: 90% operacional, 10% `SocialImpactVault` |
| `chain_events` | Mint, unlock, lock, burn, sponsored reserve, wrapped mint e hashes |
| `external_chain_projects` | Projetos externos EVM/Polygon, vault lock, wrapped token Stellar |
| `documents` | Uploads, hashes, tipo, storage path, dono e retencao |
| `audit_events` | Trilha imutavel de acoes sensiveis e mudancas de status |

## Status canonicos

`projects.status`:

- `DRAFT`
- `REGISTERED`
- `BASELINE_PENDING`
- `AWAITING_CERTIFICATION`
- `CERTIFIED_AWAITING_TREASURY`
- `TOKENIZED_LOCKED`
- `AWAITING_AUDIT`
- `ACTIVE`
- `BLOCKED_AUDIT_REQUIRED`
- `RECALCULATION_REQUIRED`
- `SUSPENDED`
- `RETIRED`

`environmental_credits.status`:

- `LOCKED`
- `AVAILABLE`
- `RESERVED`
- `OWNED_OFFCHAIN`
- `RETIRED`
- `BURNED`
- `SUSPENDED`

## Fluxos suportados

1. Produtor registra projeto, documentos e 4 tags NFC.
2. Backend gera cerca virtual e baseline Sentinel-2/IA.
3. Certificadora aprova potencial de credito.
4. Etherfuse confirma aporte via PIX e lastro em Tesouro Direto.
5. Stellar/Soroban cria subconta patrocinada/trustline e mint bloqueado.
6. Auditor valida campo e tags.
7. Backend desbloqueia creditos e lista marketplace.
8. Empresa/cidadao compra creditos via ledger off-chain.
9. Comprador aposenta creditos; backend executa burn/adaptador e emite certificado.
10. Monitoramento detecta anomalia; projeto bloqueia, auditoria urgente decide desbloqueio ou recalculo.
11. Tesouraria colhe yield e distribui 90/10.
12. Projeto externo Polygon pode travar ERC-20 em vault e emitir wrapped token na Stellar.

## RLS minima

- `profiles`: usuario le/edita o proprio perfil; admin le/edita todos.
- `projects`: publico le projetos ativos; produtor le seus projetos; certificadora/auditor ve filas designadas; admin ve tudo.
- `ledger_entries`, `purchases`, `retirements`: usuario/organizacao le apenas seus registros; backend service role escreve.
- `treasury_positions`, `yield_distributions`: somente backend/admin.
- `audit_events`: append-only pelo backend; leitura restrita por papel.

## Observacoes de seguranca

- Nao usar `anon` key para operacoes financeiras, mint, burn, ledger ou uploads sensiveis.
- Guardas no backend continuam obrigatorios mesmo com RLS.
- Toda operacao mutavel critica deve receber `idempotency_key`.
- Segredos Etherfuse, Stellar, Polygon RPC, Supabase service role e storage ficam em variaveis Dokploy/Supabase, nunca no repo.
