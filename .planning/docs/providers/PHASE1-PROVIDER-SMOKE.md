# Phase 1 Provider Smoke Evidence

**Timestamp:** 2026-05-22T22:33:00Z  
**Scope:** Soroban testnet, Etherfuse sandbox, Polygon testnet/RPC.  
**Safety:** No mainnet command was executed. No production key was present or printed.

## Environment Presence

Secrets were checked only as `SET`/`UNSET`; secret values were not printed.

| Variable | State |
|---|---|
| `STELLAR_ISSUER_SECRET_KEY` | UNSET |
| `STELLAR_DISTRIBUTOR_SECRET_KEY` | UNSET |
| `STELLAR_HORIZON_URL` | UNSET |
| `SOROBAN_RPC_URL` | UNSET |
| `STELLAR_SOROBAN_RPC_URL` | UNSET |
| `SOROBAN_CONTRACT_ID` | UNSET |
| `ETHERFUSE_API_URL` | UNSET |
| `ETHERFUSE_API_KEY` | UNSET |
| `POLYGON_RPC_URL` | UNSET |
| `POLYGON_VAULT_ADDRESS` | UNSET |

Command:

```bash
for name in STELLAR_ISSUER_SECRET_KEY STELLAR_DISTRIBUTOR_SECRET_KEY STELLAR_HORIZON_URL SOROBAN_RPC_URL STELLAR_SOROBAN_RPC_URL SOROBAN_CONTRACT_ID ETHERFUSE_API_URL ETHERFUSE_API_KEY POLYGON_RPC_URL POLYGON_VAULT_ADDRESS; do if [ -n "${(P)name}" ]; then echo "$name=SET"; else echo "$name=UNSET"; fi; done
```

## Soroban testnet

### CLI and Network Discovery

| Command | Result |
|---|---|
| `command -v stellar` | PASS: `/opt/homebrew/bin/stellar` |
| `stellar --version` | PASS: `stellar 26.0.0`, `stellar-xdr 26.0.0` |
| `command -v soroban` | BLOCKED: no `soroban` binary found on PATH; `stellar contract ...` is available. |
| `stellar network ls` | PASS: `local`, `futurenet`, `mainnet`, `testnet` listed. |
| `stellar keys ls` | BLOCKED: command exited 0 but returned no configured identities. |

### Local Contract Build

Initial WASM build attempt:

```bash
cargo build --manifest-path soroban-contract/Cargo.toml --target wasm32-unknown-unknown --release
```

Result: BLOCKED by SDK/toolchain target mismatch.

```text
error[E0463]: can't find crate for `core`
help: consider downloading the target with `rustup target add wasm32-unknown-unknown`
```

After installing `wasm32-unknown-unknown`, the SDK 26 build script rejected that target with this exact error:

```text
Rust compiler 1.82+ with target 'wasm32-unknown-unknown' is unsupported by the Soroban Environment, use 'wasm32v1-none' available with Rust 1.84+.
```

Corrected build attempt:

```bash
rustup target add wasm32v1-none
cargo build --manifest-path soroban-contract/Cargo.toml --target wasm32v1-none --release
```

Result: PASS. Artifact produced locally:

```text
soroban-contract/target/wasm32v1-none/release/sinarca_token.wasm
```

Interface inspection:

```bash
stellar contract info interface --wasm soroban-contract/target/wasm32v1-none/release/sinarca_token.wasm
```

Result: PASS. Interface lists `set_admin`, `mint_locked`, `unlock`, `transfer`, `burn`, `status_of`, `balance_of`, `total_supply_of`, and `total_burned_of`.

### Deploy, Invoke and Status

Deploy command attempted without source account, because no local testnet identity or source account was configured:

```bash
stellar contract deploy --wasm soroban-contract/target/wasm32v1-none/release/sinarca_token.wasm --network testnet
```

Result: BLOCKED.

```text
error: the following required arguments were not provided:
  --source-account <SOURCE_ACCOUNT>

Usage: stellar contract deploy --source-account <SOURCE_ACCOUNT> --wasm <WASM> --network <NETWORK> [-- <CONTRACT_CONSTRUCTOR_ARGS>...]
```

Invoke command attempted only far enough to validate required configuration:

```bash
stellar contract invoke --network testnet
```

Result: BLOCKED.

```text
error: the following required arguments were not provided:
  --id <CONTRACT_ID>
  --source-account <SOURCE_ACCOUNT>
```

Status/read command attempted only far enough to validate required configuration:

```bash
stellar contract read --network testnet
```

Result: BLOCKED.

```text
error: the following required arguments were not provided:
  --id <CONTRACT_ID>
```

### Soroban Blocker

No Soroban testnet contract id, deploy transaction hash, invoke hash, or on-chain status exists from this run. The blocking missing inputs are:

- Local `stellar` identity or `--source-account`/`STELLAR_ACCOUNT` funded on testnet.
- Signing key through local identity, `STELLAR_SIGN_WITH_KEY`, lab, or ledger.
- `SOROBAN_RPC_URL` or equivalent Stellar testnet RPC config if not relying on named `testnet`.
- A deployed `SOROBAN_CONTRACT_ID` for status/read/invoke.

**Impact:** Soroban testnet smoke remains a real external blocker for Phase 1. Mock-mode adapter tests are not provider smoke and are not counted as live evidence.

## Etherfuse

Command:

```bash
if [ -n "$ETHERFUSE_API_URL" ] && [ -n "$ETHERFUSE_API_KEY" ]; then curl -fsS -H "Authorization: Bearer $ETHERFUSE_API_KEY" "$ETHERFUSE_API_URL/status"; else echo "SKIPPED: ETHERFUSE_API_URL or ETHERFUSE_API_KEY unset"; fi
```

Result:

```text
SKIPPED: ETHERFUSE_API_URL or ETHERFUSE_API_KEY unset
```

**Blocker:** Etherfuse sandbox/API smoke could not run without `ETHERFUSE_API_URL` and `ETHERFUSE_API_KEY`.

## Polygon

Command:

```bash
if [ -n "$POLYGON_RPC_URL" ] && [ -n "$POLYGON_VAULT_ADDRESS" ]; then curl -fsS -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$POLYGON_RPC_URL"; else echo "SKIPPED: POLYGON_RPC_URL or POLYGON_VAULT_ADDRESS unset"; fi
```

Result:

```text
SKIPPED: POLYGON_RPC_URL or POLYGON_VAULT_ADDRESS unset
```

**Blocker:** Polygon testnet/RPC smoke could not run without `POLYGON_RPC_URL` and `POLYGON_VAULT_ADDRESS`. A source lock transaction hash is also required to validate a real lock-and-mint event.

## Provider Smoke Status

| Provider | Status | Evidence |
|---|---|---|
| Soroban testnet | BLOCKED | CLI present, WASM builds with `wasm32v1-none`, interface inspection passes, but deploy/invoke/status cannot run without source account and contract id. |
| Etherfuse | BLOCKED | API URL/key absent; no sandbox call was made. |
| Polygon | BLOCKED | RPC/vault absent; no testnet RPC call was made. |

## Next Actions

1. Configure a funded Stellar testnet source identity for `stellar contract deploy`.
2. Deploy `sinarca_token.wasm` to Soroban testnet and record contract id, deploy hash and account public key.
3. Invoke `set_admin`, `mint_locked`, `unlock` or `status_of` on testnet and record hashes/status.
4. Add Etherfuse sandbox URL/key and rerun the status/confirmation call.
5. Add Polygon testnet RPC/vault plus a real source lock transaction hash and rerun validation.
