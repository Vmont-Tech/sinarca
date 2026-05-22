# Modelo de dados alvo: Supabase Postgres

**Data:** 2026-05-22
**Banco local:** Supabase CLI/Postgres local
**Banco de produção:** Supabase managed Postgres

Este modelo serve para a reconstrução Python/FastAPI e também preserva compatibilidade conceitual caso uma alternativa Node.js/TypeScript seja retomada.

## Princípios

- Supabase Postgres é a fonte canônica de dados.
- A service role nunca sai do backend.
- RLS deve estar ligada em tabelas acessíveis por APIs Supabase ou por futuras consultas diretas.
- A API executa regras de negócio e transações críticas.
- `backend/mock_data.py` vira fixture/seed, não modelo implícito.
- Fluxos financeiros e blockchain devem ser idempotentes por chave de operação.

## Entidades principais

| Tabela | Responsabilidade |
|---|---|
| `profiles` | Extensão de `auth.users`; papel SINARCA, documento, organização, telefone e status |
| `organizations` | Empresas, certificadoras, produtores/comunidades e entidades parceiras |
| `projects` | Projeto ambiental, status de ciclo, localização, área, metodologia e produtor |
| `project_tags` | Tags NFC 424 DNA, coordenadas, vértice, estado físico e histórico de leitura |
| `project_baselines` | Imagem Sentinel-2, hash baseline, NDVI, pontos analisados e evidências |
| `certifications` | Decisão da certificadora, metodologia, potencial de créditos e assinatura digital |
| `audits` | Laudos de campo, coordenadas do auditor, fotos/evidências e conclusão |
| `environmental_credits` | Lotes de créditos do projeto, quantidade, status, vintage e token metadata |
| `ledger_accounts` | Conta omnichannel/off-chain por usuário, organização ou projeto |
| `ledger_entries` | Débitos/créditos do ledger único; compra, reserva, aposentadoria e ajuste |
| `purchases` | Compra de créditos, pagamento, taxas, recibo, liquidação e idempotência |
| `retirements` | Aposentadoria/burn, certificado, documentação de emissões e hash final |
| `treasury_positions` | Lastro em Reais/Tesouro Direto via Etherfuse, valor, rendimento e status |
| `yield_distributions` | Colheita mensal: 90% operacional, 10% `SocialImpactVault` |
| `chain_events` | Mint, unlock, lock, burn, sponsored reserve, wrapped mint e hashes |
| `external_chain_projects` | Projetos externos EVM/Polygon, vault lock e wrapped token Stellar |
| `documents` | Uploads, hashes, tipo, storage path, dono e retenção |
| `audit_events` | Trilha imutável de ações sensíveis e mudanças de status |

## Status canônicos

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

1. Produtor registra projeto, documentos e quatro tags NFC.
2. Backend gera cerca virtual e baseline Sentinel-2/IA.
3. Certificadora aprova potencial de crédito.
4. Etherfuse confirma aporte via PIX e lastro em Tesouro Direto.
5. Stellar/Soroban cria subconta patrocinada/trustline e mint bloqueado.
6. Auditor valida campo e tags.
7. Backend desbloqueia créditos e lista marketplace.
8. Empresa/cidadão compra créditos via ledger off-chain.
9. Comprador aposenta créditos; backend executa burn/adaptador e emite certificado.
10. Monitoramento detecta anomalia; projeto bloqueia, auditoria urgente decide desbloqueio ou recálculo.
11. Tesouraria colhe yield e distribui 90/10.
12. Projeto externo Polygon pode travar ERC-20 em vault e emitir wrapped token na Stellar.

## RLS mínima

- `profiles`: usuário lê/edita o próprio perfil; admin lê/edita todos.
- `projects`: público lê projetos ativos; produtor lê seus projetos; certificadora/auditor vê filas designadas; admin vê tudo.
- `ledger_entries`, `purchases`, `retirements`: usuário/organização lê apenas seus registros; backend service role escreve.
- `treasury_positions`, `yield_distributions`: somente backend/admin.
- `audit_events`: append-only pelo backend; leitura restrita por papel.

## Observações de segurança

- Não usar `anon` key para operações financeiras, mint, burn, ledger ou uploads sensíveis.
- Guardas no backend continuam obrigatórios mesmo com RLS.
- Toda operação mutável crítica deve receber `idempotency_key`.
- Segredos Etherfuse, Stellar, Polygon RPC, Supabase service role e storage ficam em variáveis Dokploy/Supabase, nunca no repositório.
