# Phase 01: backend-rebuild - Pesquisa

**Data:** 2026-05-22
**Escopo:** validar os documentos operacionais contra a fase de refatoração/reconstrução do backend e preparar planos executáveis.

## Fontes lidas

- `.planning/docs/reference/Fluxo_Operacional_Completo_da_Plataforma_SINARCA.p.pdf`
- `.planning/docs/reference/O que precisamos ajustar nesse documento para refl....docx`
- `.planning/docs/BACKEND_INTEGRATION_SPEC.md`
- `.planning/docs/BLUEPRINT_V1.md`
- `.planning/docs/SINARCA_MANIFESTO.md`
- `.planning/docs/bible/02_Requisitos_Funcionais_e_Nao_Funcionais.md`
- `.planning/docs/bible/03_Arquitetura_Tecnica_Detalhada.md`
- `.planning/docs/bible/04_Modelagem_de_Dados_e_Entidades.md`
- `.planning/docs/bible/05_Fluxos_de_Negocio_e_Casos_de_Uso.md`
- `.planning/docs/bible/06_Guia_Implementacao_e_Roadmap.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/STACK.md`
- `.planning/architecture/001-backend-runtime-options.md`
- `.planning/phases/01-backend-rebuild/API-CONTRACT.md`
- `.planning/phases/01-backend-rebuild/DATA-MODEL.md`
- `.planning/phases/01-backend-rebuild/PYTHON-IMPLEMENTATION-PLAN.md`
- `.planning/phases/01-backend-rebuild/DEPLOYMENT-PLAN.md`

## Requisitos extraídos dos documentos

### R1: Registro e demarcação de projeto

- Produtor/certificadora registram projeto, produtor, documentos, localização, município/estado e tipo de projeto.
- Quatro tags NFC 424 DNA delimitam a área por coordenadas GPS.
- Backend valida integridade de dados, CPF/CNPJ, coordenadas com precisão mínima e autenticidade da tag/CMAC.
- Backend cria cerca virtual, calcula área e persiste o estado "Aguardando Certificação".

### R2: Baseline ambiental

- Backend deve registrar captura Sentinel-2, data/hora, baseline, hash criptográfico, ~5.000 pontos analisados, cobertura vegetal e NDVI médio.
- Nesta fase, a integração real com Copernicus/IA pode ficar como adapter mock/sandbox, mas schema e contrato precisam existir. Essa exceção não se aplica a Supabase, Dokploy/staging ou Stellar/Soroban testnet, que são critérios live obrigatórios da Phase 1.

### R3: Certificação

- Certificadora valida metodologia, calcula potencial de créditos e registra certificado digital assinado.
- Projeto sai de "Aguardando Certificação" para "Certificado - Aguardando Auditoria".
- Certificadora é responsável legal pelo cálculo declarado.

### R4: Tokenização Stellar/Soroban

- SINARCA executa mint de tokens equivalentes ao potencial certificado.
- Tokens nascem bloqueados e não transferíveis.
- Metadados mínimos: project ID, produtor, certificadora, área, baseline hash, data de certificação e status de auditoria.
- O contrato Soroban atual cobre parte de Mint -> Unlock -> Transfer -> Burn, mas não cobre sponsored reserves, Etherfuse/Tesouro, ledger off-chain, yield social ou lock-and-mint.

### R5: Ajuste financeiro obrigatório do DOCX

- Contas e trustlines Stellar devem usar sponsored reserves para reduzir custo de XLM e manter controle dos XLMs de reserva mínima pela plataforma.
- Mint bloqueado só deve ocorrer depois da confirmação de aporte em Reais via PIX/Etherfuse e trava equivalente em Tesouro Direto.
- A liquidez deve ser abstrata via `ISinarcaLiquidity`, com `EtherfuseAdapter` no MVP e porta futura para `TransferoAdapter`.

### R6: Auditoria e desbloqueio

- Auditor agenda/realiza inspeção, valida tags, coordenadas, preservação, fotos/evidências e assina laudo.
- Backend valida o laudo, registra evidências e eventos.
- Projeto aprovado desbloqueia créditos; projeto com problema bloqueia/recalcula.

### R7: Marketplace e compra

- Créditos disponíveis aparecem no marketplace.
- O comprador seleciona quantidade e paga.
- O DOCX muda o modelo: o comprador comum não recebe tokens em wallet externa; propriedade fica no ledger off-chain/omnichannel do SINARCA.
- Backend precisa manter saldos, reservas, compras, taxas, recibos, transações e idempotência.

### R8: Aposentadoria/burn

- Comprador declara compensação, informa quantidade e documentação.
- Backend valida saldo, executa burn/adaptador, registra certificado e evento imutável.
- `src/pages/Dashboard/RetireCredits.tsx` precisa usar o cliente `apiPost` em vez de URL hardcoded.

### R9: Monitoramento, bloqueio e recálculo

- Monitoramento a cada 10 dias compara baseline, NDVI e cobertura.
- Regras documentadas: cobertura vegetal reduzida > 5%, NDVI reduzido > 10%, cicatriz de fogo ou alteração anormal.
- Anomalia bloqueia projeto, trava créditos, remove do marketplace e cria auditoria urgente.
- Problema confirmado gera recálculo e burn automático dos créditos perdidos.

### R10: Tesouraria e co-benefício social

- Colateral financeiro em Tesouro Direto gera rendimento diário.
- Mensalmente `harvestAndDistributeYield` divide yield: 90% para operação SINARCA, 10% para `SocialImpactVault`.
- Backend deve registrar posições de tesouraria, colheitas, distribuição e vínculo com comunidade/projeto.

### R11: Interoperabilidade cross-chain

- Créditos externos em EVM/Polygon podem ser travados em vault.
- Backend captura evento, valida autenticidade e emite wrapped token Stellar para comercialização barata no mercado nacional.
- A fase deve criar portas/adapters e schema; Polygon deve ter tentativa real testnet/RPC quando houver acesso, e produção/mainnet fica futura.

### R12: Segurança, compliance e operação

- Rotas sensíveis precisam de autenticação e autorização por papel.
- Uploads precisam de validação real de arquivo e storage controlado.
- Eventos sensíveis precisam de trilha append-only.
- Segredos ficam apenas no backend/ambiente.
- Deploy precisa ser repetível em Dokploy com API e web separados no mesmo commit.

## Mapeamento para a fase de refatoração

| Requisito | Cobertura na Phase 01 | Observação |
|---|---|---|
| R1 Registro/demarcação | Cobrir backend/schema/API | UI móvel nativa fica fora da fase |
| R2 Baseline | Cobrir schema/API/adapter mock | IA/Copernicus live fica fora da fase |
| R3 Certificação | Cobrir backend/schema/API | Inclui guards de `certifier` |
| R4 Tokenização | Cobrir contrato/adapters/testes e Soroban testnet | Mainnet fica fora |
| R5 Ajuste financeiro DOCX | Cobrir adapters/schema/contratos e tentativa Etherfuse sandbox quando houver acesso | Operação financeira produtiva/Transfero live fica fora |
| R6 Auditoria/desbloqueio | Cobrir backend/schema/API | App móvel nativo fica fora |
| R7 Compra/ledger | Cobrir backend/schema/API | Wallet externa do usuário final não é requisito do MVP |
| R8 Burn/certificado | Cobrir backend/API/frontend acoplado | Certificado PDF real pode ser stub verificável |
| R9 Bloqueio/recálculo | Cobrir backend/schema/API | Monitoramento automático live fica fora |
| R10 Tesouraria/yield | Cobrir schema/serviço/adapters e tentativa sandbox quando houver acesso | Conciliação financeira produtiva fica fora |
| R11 Cross-chain | Cobrir schema/adapters/event contract e tentativa Polygon testnet/RPC quando houver acesso | Listener mainnet fica fora |
| R12 Segurança/deploy | Cobrir guards, env, Docker, testes e staging Dokploy | Operação produtiva manual fica fora |

## Riscos de implementação

- A fase é ampla e toca API, banco, frontend acoplado, contrato Soroban e deploy; os planos precisam ser fatiados por contrato, schema, domínios, adapters e deploy.
- Os testes atuais estão desatualizados (`financials` e `/monetization` não existem mais em `backend/main.py`); o primeiro plano deve transformar isso em suíte de contrato real.
- `docker-compose.yml` atual é YAML inválido; o deploy deve criar `docker-compose.dokploy.yml` novo, sem depender dele.
- `backend/api/*` e `backend/models/*` parecem completos, mas não são runtime ativo; reaproveitar sem auditoria pode reintroduzir bugs.
- Alterações de schema Supabase precisam de tarefa bloqueante `supabase db push` real para evitar falso positivo de build/teste sem banco real.

## Estratégia recomendada

1. Congelar contrato legado com testes e corrigir o frontend acoplado.
2. Criar `backend_app/` com configuração, erros, auth, roles e health.
3. Criar Supabase schema, RLS, seed e repositories.
4. Implementar módulos operacionais persistentes: projetos/tags/baseline, certificação, auditoria, marketplace, ledger, aposentadoria, monitoramento.
5. Implementar adapters financeiros/blockchain e atualizar Soroban para refletir as decisões do DOCX.
6. Preparar deploy Dokploy, env, docs e cutover do frontend para a API nova.

## Validation Architecture

- Contrato HTTP: `uv run pytest -q tests/contract/test_api_v1_contract.py`.
- Integração backend: `uv run pytest -q tests/test_api_integration.py`.
- Frontend: `npm run lint` e `npm run build`.
- Schema: `supabase db push` real; validação local equivalente é apenas diagnóstico quando o push estiver bloqueado.
- Docker/deploy: `docker build -f Dockerfile.api .`, `docker build -f Dockerfile.frontend .` e `docker compose -f docker-compose.dokploy.yml config`.
- Soroban: `cargo test --manifest-path soroban-contract/Cargo.toml` e build WASM quando toolchain estiver disponível.

## RESEARCH COMPLETE
