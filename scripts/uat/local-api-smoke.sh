#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:5680}"
RUN_MUTATING_UAT="${RUN_MUTATING_UAT:-false}"

json_field() {
  local field="$1"
  node -e '
    const field = process.argv[1];
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      const data = JSON.parse(input);
      const value = field.split(".").reduce((obj, key) => obj && obj[key], data);
      if (value === undefined || value === null) process.exit(2);
      process.stdout.write(String(value));
    });
  ' "$field"
}

step() {
  printf '\n==> %s\n' "$1"
}

curl_json() {
  curl -fsS "$@" | node -e '
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      JSON.parse(input);
      process.stdout.write(input);
    });
  ' >/dev/null
}

step "Health"
curl_json "$API_URL/health"

step "Login empresa"
LOGIN_JSON="$(curl -fsS -X POST "$API_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"empresa@sinarca.com.br","dadoLogin":"empresa@sinarca.com.br","password":"empresa","role":"company"}')"
TOKEN="$(printf '%s' "$LOGIN_JSON" | json_field token)"
test -n "$TOKEN"

step "Auth /me"
curl_json "$API_URL/api/v1/auth/me" -H "Authorization: Bearer $TOKEN"

step "Projetos e detalhe"
curl_json "$API_URL/api/v1/projects?limit=5"
curl_json "$API_URL/api/v1/projects/PRC-2024-002"

step "Catalogos"
curl_json "$API_URL/api/v1/certifiers"
curl_json "$API_URL/api/v1/auditors"
curl_json "$API_URL/api/v1/companies"

step "Inventario"
curl_json "$API_URL/api/v1/inventory"
curl_json -X POST "$API_URL/api/v1/inventory/declare" \
  -H 'Content-Type: application/json' \
  -d '{"escopo_1":10,"escopo_2":20,"escopo_3":30}'

step "Filas operacionais"
curl_json "$API_URL/api/v1/certifier/queue"
curl_json "$API_URL/api/v1/audit/queue"

step "Marketplace, Stellar status e transacoes"
curl_json "$API_URL/api/v1/marketplace"
curl_json "$API_URL/api/v1/stellar/status"
curl_json "$API_URL/api/v1/transactions"

if [ "$RUN_MUTATING_UAT" = "true" ]; then
  step "UAT mutavel: compra e aposentadoria"
  curl_json -X POST "$API_URL/api/v1/marketplace/buy" \
    -H 'Content-Type: application/json' \
    -d '{"project_id":"PRC-2024-002","buyer_id":"comp-001","quantidade":1,"unit_price_brl":28.5}'
  curl_json -X POST "$API_URL/api/v1/marketplace/compensate" \
    -H 'Content-Type: application/json' \
    -d '{"buyer_id":"comp-001","emissions_data":{"scope1":1,"scope2":0,"scope3":0,"total":1},"credits_to_use":[{"project_id":"PRC-2024-002","amount":1}]}'
fi

printf '\nOK: smoke local passou em %s\n' "$API_URL"
