//! SINARCA Soroban Contract
//!
//! Fluxo operacional (rastreabilidade de créditos ambientais):
//! - Mint: cria tokens em BLOQUEADO
//! - Unlock: somente `certifier` muda para DISPONIVEL
//! - Transfer: BLOQUEADO impede transferência
//! - Burn:
//!   - DISPONIVEL: permitido apenas ao detentor (`from`)
//!   - BLOQUEADO: permitido ao detentor (`from`) **ou** ao `admin`
//!
//! Este contrato usa SDK 26 do Soroban no estilo de armazenamento do próprio SDK:
//! - `env.storage().persistent()` para dados por projeto/balances
//! - auth via `Address::require_auth()`

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol,
};

// ----------------------------
// Tipos
// ----------------------------

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum TokenStatus {
    BLOQUEADO = 0,
    DISPONIVEL = 1,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct ProjectMeta {
    pub project_id: Symbol,
    pub producer: Address,
    pub certifier: Address,
    pub hash_baseline: BytesN<32>,
}

#[contract]
pub struct SinarcaToken;

// ----------------------------
// Keys (todas determinísticas)
// ----------------------------

fn admin_key() -> Symbol {
    symbol_short!("ADMIN")
}

fn status_key() -> Symbol {
    symbol_short!("STATUS")
}

fn meta_key() -> Symbol {
    symbol_short!("META")
}

fn supply_key() -> Symbol {
    symbol_short!("SUPPLY")
}

fn burned_key() -> Symbol {
    symbol_short!("BURNED")
}

fn bal_key() -> Symbol {
    symbol_short!("BAL")
}

// ----------------------------
// Storage helpers
// ----------------------------

// status: Symbol(project_id)
fn status_of_internal(env: &Env, project_id: Symbol) -> TokenStatus {
    let k = (status_key(), project_id);
    env.storage()
        .persistent()
        .get::<_, TokenStatus>(&k)
        .unwrap_or(TokenStatus::BLOQUEADO)
}

fn set_status_internal(env: &Env, project_id: Symbol, st: TokenStatus) {
    let k = (status_key(), project_id);
    env.storage().persistent().set(&k, &st);
}

fn get_meta_internal(env: &Env, project_id: Symbol) -> ProjectMeta {
    let k = (meta_key(), project_id);
    env.storage()
        .persistent()
        .get::<_, ProjectMeta>(&k)
        .unwrap_or_else(|| panic!("PROJECT_NOT_FOUND"))
}

fn set_meta_internal(env: &Env, project_id: Symbol, meta: &ProjectMeta) {
    let k = (meta_key(), project_id);
    env.storage().persistent().set(&k, meta);
}

fn get_supply_internal(env: &Env, project_id: Symbol) -> i128 {
    let k = (supply_key(), project_id);
    env.storage()
        .persistent()
        .get::<_, i128>(&k)
        .unwrap_or(0i128)
}

fn set_supply_internal(env: &Env, project_id: Symbol, amount: i128) {
    let k = (supply_key(), project_id);
    env.storage().persistent().set(&k, &amount);
}

fn get_burned_internal(env: &Env, project_id: Symbol) -> i128 {
    let k = (burned_key(), project_id);
    env.storage()
        .persistent()
        .get::<_, i128>(&k)
        .unwrap_or(0i128)
}

fn set_burned_internal(env: &Env, project_id: Symbol, amount: i128) {
    let k = (burned_key(), project_id);
    env.storage().persistent().set(&k, &amount);
}

fn get_balance_internal(env: &Env, project_id: Symbol, owner: &Address) -> i128 {
    let k = (bal_key(), project_id, owner);
    env.storage()
        .persistent()
        .get::<_, i128>(&k)
        .unwrap_or(0i128)
}

fn set_balance_internal(env: &Env, project_id: Symbol, owner: &Address, amount: i128) {
    let k = (bal_key(), project_id, owner);
    env.storage().persistent().set(&k, &amount);
}

fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<Symbol, Address>(&admin_key())
        .unwrap_or_else(|| panic!("ADMIN_NOT_SET"))
}

// ----------------------------
// Contrato
// ----------------------------

#[contractimpl]
impl SinarcaToken {
    /// Inicializa o admin (registry). Deve ser chamado 1 vez.
    pub fn set_admin(env: Env, admin: Address) {
        // init única em instance storage (admin pequeno e global)
        let inst = env.storage().instance();
        if inst.has(&admin_key()) {
            panic!("ADMIN_ALREADY_SET");
        }

        // admin assina a inicialização
        admin.require_auth();
        inst.set(&admin_key(), &admin);
    }

    pub fn mint_locked(
        env: Env,
        project_id: Symbol,
        producer: Address,
        certifier: Address,
        hash_baseline: BytesN<32>,
        amount: i128,
        initial_owner: Address,
    ) {
        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }

        let admin = get_admin(&env);
        admin.require_auth();

        // evita mint repetido do mesmo project_id
        // (como o status começa BLOQUEADO e só muda em unlock,
        // basta checar se meta já existe)
        let _ = status_of_internal(&env, project_id.clone());
        // se meta existir, bloqueia
        if env
            .storage()
            .persistent()
            .has(&((meta_key(), project_id.clone()),))
        {
            panic!("PROJECT_ALREADY_MINTED");
        }


        let meta = ProjectMeta {
            project_id: project_id.clone(),
            producer,
            certifier,
            hash_baseline,
        };

        set_meta_internal(&env, project_id.clone(), &meta);
        set_status_internal(&env, project_id.clone(), TokenStatus::BLOQUEADO);
        set_supply_internal(&env, project_id.clone(), amount);
        set_burned_internal(&env, project_id.clone(), 0i128);

        let prev = get_balance_internal(&env, project_id.clone(), &initial_owner);
        set_balance_internal(&env, project_id, &initial_owner, prev + amount);
    }

    /// Unlock: somente a certificadora do projeto pode desbloquear.
    pub fn unlock(env: Env, project_id: Symbol) {
        let meta = get_meta_internal(&env, project_id.clone());
        meta.certifier.require_auth();

        let st = status_of_internal(&env, project_id.clone());
        if st == TokenStatus::DISPONIVEL {
            return;
        }
        set_status_internal(&env, project_id, TokenStatus::DISPONIVEL);
    }

    /// Transfer: bloqueada quando BLOQUEADO.
    pub fn transfer(env: Env, project_id: Symbol, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }

        let st = status_of_internal(&env, project_id.clone());
        if st == TokenStatus::BLOQUEADO {
            panic!("TOKEN_LOCKED");
        }

        // Transfer precisa de auth do detentor do saldo.
        from.require_auth();

        let from_bal = get_balance_internal(&env, project_id.clone(), &from);
        if from_bal < amount {
            panic!("INSUFFICIENT_BALANCE");
        }

        set_balance_internal(&env, project_id.clone(), &from, from_bal - amount);
        let to_bal = get_balance_internal(&env, project_id.clone(), &to);
        set_balance_internal(&env, project_id, &to, to_bal + amount);
    }

    /// Burn:
    /// - DISPONIVEL: permitido apenas ao detentor (`from`)
    /// - BLOQUEADO: permitido ao detentor (`from`) **ou** ao `admin`
    pub fn burn(
        env: Env,
        project_id: Symbol,
        from: Address,
        operator: Address,
        amount: i128,
    ) {
        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }

        let st = status_of_internal(&env, project_id.clone());
        let admin = get_admin(&env);

        match st {
            TokenStatus::DISPONIVEL => {
                // consumo/compensação: somente detentor
                if operator != from {
                    panic!("UNAUTHORIZED_BURN");
                }
                operator.require_auth();
            }
            TokenStatus::BLOQUEADO => {
                // penalidade automática: detentor OU admin/oráculo
                if operator != from && operator != admin {
                    panic!("UNAUTHORIZED_BURN");
                }
                operator.require_auth();
            }
        }

        let from_bal = get_balance_internal(&env, project_id.clone(), &from);
        if from_bal < amount {
            panic!("INSUFFICIENT_BALANCE");
        }

        set_balance_internal(&env, project_id.clone(), &from, from_bal - amount);

        let burned = get_burned_internal(&env, project_id.clone());
        set_burned_internal(&env, project_id, burned + amount);
    }


    // -----------------
    // Views
    // -----------------

    pub fn status_of(env: Env, project_id: Symbol) -> TokenStatus {
        status_of_internal(&env, project_id)
    }

    pub fn balance_of(env: Env, project_id: Symbol, owner: Address) -> i128 {
        get_balance_internal(&env, project_id, &owner)
    }

    pub fn total_supply_of(env: Env, project_id: Symbol) -> i128 {
        get_supply_internal(&env, project_id)
    }

    pub fn total_burned_of(env: Env, project_id: Symbol) -> i128 {
        get_burned_internal(&env, project_id)
    }
}

