# CHANGELOG_BLOCKCHAIN

## 2026-05-22
- **Arquivo Alterado:** `CHANGELOG_BLOCKCHAIN.md`
- **Mudança Técnica:** Criação do arquivo de changelog dedicado à evolução da integração blockchain/Soroban.
- **Justificativa baseada no Fluxo SINARCA:** Necessário para rastrear mudanças que garantam as fases operacionais (Mint→Unlock→Transfer→Burn) e conformidade na blockchain Stellar.
- **Status On-chain:** N/A (documentação/infra do processo)

## 2026-05-22
- **Arquivos Alterados:** `soroban-contract/Cargo.toml`, `soroban-contract/src/contract.rs`
- **Mudança Técnica (o que foi feito):**
  - Foi criado/organizado o crate Soroban para produzir o artefato WASM com ABI explícita dos métodos do contrato.
  - Foi refatorado o contrato para cumprir **compliance on-chain** diretamente nas regras de autorização e no estado persistido do projeto.
  - Estrutura de armazenamento baseada no padrão do SDK:
    - `env.storage().persistent()` para dados por `project_id` (status, meta, supply, burned, balances).
    - `env.storage().instance()` para o **admin global** (registry) do contrato.
  - Endurecimento do fluxo de estado:
    - `unlock(project_id)`: somente a **certifier** registrada em `meta` pode mudar o status para `DISPONIVEL`.
    - `transfer(project_id, from, to, amount)`: se status estiver `BLOQUEADO`, a transação **falha** (`panic!("TOKEN_LOCKED")`). Quando `DISPONIVEL`, exige auth do detentor via `from.require_auth()`.
    - `burn(project_id, from, operator, amount)`: aplica permissão por status:
      - Se `DISPONIVEL`: somente o **detentor** pode queimar (exige `operator == from` e `operator.require_auth()`).
      - Se `BLOQUEADO`: permite queima pelo **detentor** (`operator == from`) **ou** pelo **admin global** (`operator == admin`), e em ambos os casos exige `operator.require_auth()`.
- **Por que isso foi necessário (justificativa baseada no Fluxo SINARCA):**
  - O SINARCA depende de um ciclo operacional estrito: **Mint → Unlock → Transfer → Burn**.
  - O compliance precisa ser “impossível de burlar” apenas no backend: por isso as regras foram implementadas na própria execução do contrato Soroban.
  - O resultado garante que:
    - tokens em **BLOQUEADO** não podem ser transferidos;
    - o desbloqueio (**Unlock**) só ocorre quando a certificadora autoriza;
    - a aposentadoria/queima (**Burn**) obedece a matriz de permissões definida (detentor vs admin) conforme o status on-chain.
- **Status On-chain (o que falta):**
  - O contrato está compilável e o WASM é gerado localmente, mas a **implantação (deploy) e a integração completa do backend** (invocação RPC real, FeeWallet e patrocínio de reservas) ainda estão pendentes. 


## 2026-05-22
- **Arquivo Alterado:** `soroban-contract/src/contract.rs`
- **Mudança Técnica:** Blindagem do fluxo de `Mint` conforme SINARCA:
  - adicionado `admin` global (registry) armazenado on-chain;
  - `mint_locked` agora exige `env.invoker() == admin` (panic `UNAUTHORIZED_MINT`);
  - adicionado `set_admin` (inicialização única; falha com `ADMIN_ALREADY_SET` e `UNAUTHORIZED_SET_ADMIN`).
- **Justificativa baseada no Fluxo SINARCA:** impede mint arbitrário (inviolabilidade do ciclo de vida completo Mint→Unlock→Transfer→Burn).
- **Status On-chain:** ainda pendente de deploy.



