//! SINARCA Soroban Contract (template)
//!
//! Objetivo: suportar o fluxo operacional SINARCA com estado on-chain:
//! - Projeto (id), metadados (produtor, certificadora, hash_baseline)
//! - Status on-chain: BLOQUEADO / DISPONÍVEL
//! - Supply (total_minted, total_burned) e balanços por detentor
//! - Entradas operacionais: mint_locked, unlock, transfer, burn
//!
//! Observação: este arquivo é um *template* inicial. Requer integração com
//! tooling Soroban e ajustes conforme o SDK versionado no repositório.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, BytesN, Env, Address, Vec, String,
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
    pub project_id: String,
    pub producer: Address,
    pub certifier: Address,
    pub hash_baseline: BytesN<32>,
}

// ----------------------------
// Contrato
// ----------------------------

#[contract]
pub struct SinarcaToken {
    // status on-chain do projeto
    // key: project_id
    status: soroban_sdk::storage::Map<String, TokenStatus>,

    // metadados on-chain
    metas: soroban_sdk::storage::Map<String, ProjectMeta>,

    // supply por projeto
    total_supply: soroban_sdk::storage::Map<String, i128>,

    // supply queimado (opcional, para auditoria)
    total_burned: soroban_sdk::storage::Map<String, i128>,

    // saldo por (project_id, owner)
    // key composto: (project_id, owner)
    balances: soroban_sdk::storage::Map<BytesN<32>, i128>,
}

fn balance_key(env: &Env, project_id: &String, owner: &Address) -> BytesN<32> {
    // hash simples e determinístico como chave composta
    let mut data = Vec::<u8>::new(env);
    data.append(project_id.to_bytes());
    data.append(owner.serialize(env).as_slice());
    // usa sha256 via sdk (Disponível no ambiente soroban)
    BytesN::<32>::from_slice(env, &soroban_sdk::crypto::sha256(&data).to_vec())
}

#[contractimpl]
impl SinarcaToken {
    /// Inicializa metadados do projeto e cria saldo(s) travados.
    /// Regras (conforme fluxo):
    /// - MINT cria tokens em estado BLOQUEADO.
    /// - Os tokens só podem ser transferidos após unlock.
    pub fn mint_locked(
        env: Env,
        project_id: String,
        producer: Address,
        certifier: Address,
        hash_baseline: BytesN<32>,
        amount: i128,
        // saldo inicial para um detentor (tipicamente a conta do contrato/issuer)
        initial_owner: Address,
    ) {
        let st = self_status(&env, project_id.clone());
        if st.is_some() {
            panic!("PROJECT_ALREADY_MINTED");
        }

        let meta = ProjectMeta {
            project_id: project_id.clone(),
            producer,
            certifier,
            hash_baseline,
        };

        self.metas.set(project_id.clone(), meta);
        self.status.set(project_id.clone(), TokenStatus::BLOQUEADO);
        self.total_supply.set(project_id.clone(), amount);
        self.total_burned.set(project_id.clone(), 0i128);

        let key = balance_key(&env, &project_id, &initial_owner);
        let prev = self.balances.get(key.clone()).unwrap_or(0i128);
        self.balances.set(key, prev + amount);
    }

    /// Unlock após auditoria => status on-chain muda para DISPONÍVEL.
    /// Controle de permissão (ex.: only SINARCA oracle/admin).
    pub fn unlock(env: Env, project_id: String) {
        // TODO: implementar checagem de permissão (ex.: invocador autorizado)
        let current = self.status.get(project_id.clone());
        if current.is_none() {
            panic!("PROJECT_NOT_FOUND");
        }
        if current.unwrap() == TokenStatus::DISPONIVEL {
            return;
        }
        self.status.set(project_id, TokenStatus::DISPONIVEL);
    }

    /// Transfer obedece bloqueio:
    /// - se status do projeto == BLOQUEADO => aborta
    pub fn transfer(env: Env, project_id: String, from: Address, to: Address, amount: i128) {
        let status = self.status.get(project_id.clone()).unwrap_or(TokenStatus::BLOQUEADO);
        if status == TokenStatus::BLOQUEADO {
            panic!("TOKEN_LOCKED");
        }

        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }

        let from_key = balance_key(&env, &project_id, &from);
        let to_key = balance_key(&env, &project_id, &to);

        let from_bal = self.balances.get(from_key.clone()).unwrap_or(0i128);
        if from_bal < amount {
            panic!("INSUFFICIENT_BALANCE");
        }

        self.balances.set(from_key, from_bal - amount);
        let to_bal = self.balances.get(to_key.clone()).unwrap_or(0i128);
        self.balances.set(to_key, to_bal + amount);
    }

    /// Burn para compensação/penalidade.
    /// - Reduz saldo do detentor
    /// - Atualiza total_burned / supply
    pub fn burn(env: Env, project_id: String, from: Address, amount: i128) {
        // TODO: implementar permissão (ex.: somente carteira/contrato autorizado ou assinatura do detentor via client)
        if amount <= 0 {
            panic!("INVALID_AMOUNT");
        }
        let from_key = balance_key(&env, &project_id, &from);
        let from_bal = self.balances.get(from_key.clone()).unwrap_or(0i128);
        if from_bal < amount {
            panic!("INSUFFICIENT_BALANCE");
        }

        self.balances.set(from_key, from_bal - amount);
        let burned = self.total_burned.get(project_id.clone()).unwrap_or(0i128);
        self.total_burned.set(project_id, burned + amount);
        // total_supply pode ser mantido imutável e supply efetivo = total_supply - total_burned
    }

    /// Views
    pub fn status_of(env: Env, project_id: String) -> TokenStatus {
        self.status.get(project_id).unwrap_or(TokenStatus::BLOQUEADO)
    }

    pub fn balance_of(env: Env, project_id: String, owner: Address) -> i128 {
        let key = balance_key(&env, &project_id, &owner);
        self.balances.get(key).unwrap_or(0i128)
    }

    pub fn total_supply_of(env: Env, project_id: String) -> i128 {
        self.total_supply.get(project_id).unwrap_or(0i128)
    }

    pub fn total_burned_of(env: Env, project_id: String) -> i128 {
        self.total_burned.get(project_id).unwrap_or(0i128)
    }
}

impl SinarcaToken {
    fn status_of_internal(env: &Env, project_id: String) -> Option<TokenStatus> {
        // placeholder
        let _ = env;
        let _ = project_id;
        None
    }
}

// Helper (apenas para template; em implementação final removemos)
fn self_status(_env: &Env, _project_id: String) -> Option<TokenStatus> {
    None
}

