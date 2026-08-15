//! Integration tests for Nyquist gap 01-05-T2 (DOC-PDF-7):
//! Soroban must emit lifecycle events and preserve locked balances.
//!
//! This lives under `tests/` (Cargo integration test convention) instead of
//! `#[cfg(test)]` inside `src/contract.rs` / `src/lib.rs`, because those two
//! implementation files are out of scope for this validation pass, and
//! because `SinarcaTokenClient` is not re-exported from the crate root
//! (`lib.rs` only exports `SinarcaToken` and `TokenStatus`). Contract calls
//! below therefore go through `Env::invoke_contract`, which only needs the
//! publicly exported `SinarcaToken` contract type to register the contract.
//!
//! IMPORTANT: `env.events().all()` only holds the events emitted by the most
//! recent top-level contract invocation (each `invoke_contract` call behaves
//! like a fresh on-chain transaction and clears the prior event log). Every
//! assertion on emitted events therefore runs immediately after the single
//! mutating call it verifies, before any other contract call (including
//! read-only view calls) is made.

use std::panic::{catch_unwind, AssertUnwindSafe};

use sinarca_token::SinarcaToken;
use soroban_sdk::{
    testutils::{Address as _, BytesN as _, Events},
    vec, Address, BytesN, Env, IntoVal, Symbol, TryFromVal, Val,
};

fn call<T: TryFromVal<Env, Val>>(
    env: &Env,
    contract_id: &Address,
    func: &str,
    args: soroban_sdk::Vec<Val>,
) -> T {
    env.invoke_contract(contract_id, &Symbol::new(env, func), args)
}

fn setup(env: &Env) -> Address {
    env.register(SinarcaToken, ())
}

fn set_admin(env: &Env, contract_id: &Address, admin: &Address) {
    call::<()>(env, contract_id, "set_admin", vec![env, admin.into_val(env)])
}

fn mint_locked(
    env: &Env,
    contract_id: &Address,
    project_id: &Symbol,
    producer: &Address,
    certifier: &Address,
    hash_baseline: &BytesN<32>,
    amount: i128,
    owner: &Address,
) {
    let args = vec![
        env,
        project_id.into_val(env),
        producer.into_val(env),
        certifier.into_val(env),
        hash_baseline.into_val(env),
        amount.into_val(env),
        owner.into_val(env),
    ];
    call::<()>(env, contract_id, "mint_locked", args)
}

fn balance_of(env: &Env, contract_id: &Address, project_id: &Symbol, owner: &Address) -> i128 {
    let args = vec![env, project_id.into_val(env), owner.into_val(env)];
    call(env, contract_id, "balance_of", args)
}

#[test]
fn mint_locked_emits_event_and_keeps_token_locked() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup(&env);

    let admin = Address::generate(&env);
    set_admin(&env, &contract_id, &admin);

    let producer = Address::generate(&env);
    let certifier = Address::generate(&env);
    let owner = Address::generate(&env);
    let project_id = Symbol::new(&env, "proj1");
    let hash_baseline = BytesN::<32>::random(&env);

    mint_locked(
        &env,
        &contract_id,
        &project_id,
        &producer,
        &certifier,
        &hash_baseline,
        100i128,
        &owner,
    );

    // mint_locked event was published with the expected topic, project id and payload.
    // Checked immediately: any further contract call clears the event log.
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (Symbol::new(&env, "mint_locked"), project_id.clone()).into_val(&env),
                (100i128, owner.clone()).into_val(&env),
            ),
        ]
    );

    // Lock is preserved: balance/supply are correctly recorded for the owner.
    assert_eq!(balance_of(&env, &contract_id, &project_id, &owner), 100i128);
    let supply: i128 = call(
        &env,
        &contract_id,
        "total_supply_of",
        vec![&env, project_id.into_val(&env)],
    );
    assert_eq!(supply, 100i128);
}

#[test]
fn transfer_is_rejected_while_locked_and_balances_are_unchanged() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup(&env);

    let admin = Address::generate(&env);
    set_admin(&env, &contract_id, &admin);

    let producer = Address::generate(&env);
    let certifier = Address::generate(&env);
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let project_id = Symbol::new(&env, "proj2");
    let hash_baseline = BytesN::<32>::random(&env);

    mint_locked(
        &env,
        &contract_id,
        &project_id,
        &producer,
        &certifier,
        &hash_baseline,
        50i128,
        &owner,
    );

    // Still BLOQUEADO (unlock was never called) -> transfer must fail closed.
    let transfer_args = vec![
        &env,
        project_id.into_val(&env),
        owner.into_val(&env),
        recipient.into_val(&env),
        10i128.into_val(&env),
    ];
    let env_for_call = env.clone();
    let contract_id_for_call = contract_id.clone();
    let result = catch_unwind(AssertUnwindSafe(|| {
        call::<()>(&env_for_call, &contract_id_for_call, "transfer", transfer_args)
    }));
    assert!(result.is_err(), "transfer succeeded despite locked token");

    // Locked balance must be preserved exactly across the failed call.
    assert_eq!(balance_of(&env, &contract_id, &project_id, &owner), 50i128);
    assert_eq!(
        balance_of(&env, &contract_id, &project_id, &recipient),
        0i128
    );
}

#[test]
fn unlock_emits_event_then_transfer_emits_event_and_moves_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup(&env);

    let admin = Address::generate(&env);
    set_admin(&env, &contract_id, &admin);

    let producer = Address::generate(&env);
    let certifier = Address::generate(&env);
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let project_id = Symbol::new(&env, "proj3");
    let hash_baseline = BytesN::<32>::random(&env);

    mint_locked(
        &env,
        &contract_id,
        &project_id,
        &producer,
        &certifier,
        &hash_baseline,
        75i128,
        &owner,
    );

    call::<()>(
        &env,
        &contract_id,
        "unlock",
        vec![&env, project_id.into_val(&env)],
    );

    // unlock event was published for this project id, checked before any other call.
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (Symbol::new(&env, "unlock"), project_id.clone()).into_val(&env),
                ().into_val(&env),
            ),
        ]
    );

    call::<()>(
        &env,
        &contract_id,
        "transfer",
        vec![
            &env,
            project_id.into_val(&env),
            owner.into_val(&env),
            recipient.into_val(&env),
            30i128.into_val(&env),
        ],
    );

    // transfer event was published, checked before any other call.
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (Symbol::new(&env, "transfer"), project_id.clone()).into_val(&env),
                (owner.clone(), recipient.clone(), 30i128).into_val(&env),
            ),
        ]
    );

    // Balances reflect the transfer accurately (nothing lost/duplicated).
    assert_eq!(balance_of(&env, &contract_id, &project_id, &owner), 45i128);
    assert_eq!(
        balance_of(&env, &contract_id, &project_id, &recipient),
        30i128
    );
}

#[test]
fn burn_emits_event_and_locked_penalty_burn_preserves_remaining_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup(&env);

    let admin = Address::generate(&env);
    set_admin(&env, &contract_id, &admin);

    let producer = Address::generate(&env);
    let certifier = Address::generate(&env);
    let owner = Address::generate(&env);
    let project_id = Symbol::new(&env, "proj4");
    let hash_baseline = BytesN::<32>::random(&env);

    mint_locked(
        &env,
        &contract_id,
        &project_id,
        &producer,
        &certifier,
        &hash_baseline,
        40i128,
        &owner,
    );

    // Still BLOQUEADO: admin (operator != from) may burn as a penalty.
    call::<()>(
        &env,
        &contract_id,
        "burn",
        vec![
            &env,
            project_id.into_val(&env),
            owner.into_val(&env),
            admin.into_val(&env),
            15i128.into_val(&env),
        ],
    );

    // burn event was published, checked before any other call.
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (Symbol::new(&env, "burn"), project_id.clone()).into_val(&env),
                (owner.clone(), admin.clone(), 15i128).into_val(&env),
            ),
        ]
    );

    // Remaining locked balance is preserved (not wiped out entirely).
    assert_eq!(balance_of(&env, &contract_id, &project_id, &owner), 25i128);
    let burned: i128 = call(
        &env,
        &contract_id,
        "total_burned_of",
        vec![&env, project_id.into_val(&env)],
    );
    assert_eq!(burned, 15i128);
}
