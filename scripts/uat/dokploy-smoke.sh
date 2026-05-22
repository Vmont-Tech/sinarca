#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-${STAGING_API_URL:-}}"
WEB_URL="${WEB_URL:-${STAGING_WEB_URL:-}}"

if [ -z "$API_URL" ]; then
  echo "Defina API_URL ou STAGING_API_URL. Exemplo: API_URL=https://api.sinarca.com.br $0" >&2
  exit 2
fi

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

echo "==> API health"
curl_json "$API_URL/health"

echo "==> Login contra API publicada"
LOGIN_JSON="$(curl -fsS -X POST "$API_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"empresa@sinarca.com.br","dadoLogin":"empresa@sinarca.com.br","password":"empresa","role":"company"}')"
TOKEN="$(printf '%s' "$LOGIN_JSON" | json_field token)"
test -n "$TOKEN"

echo "==> Auth /me"
curl_json "$API_URL/api/v1/auth/me" -H "Authorization: Bearer $TOKEN"

echo "==> Dados principais"
curl_json "$API_URL/api/v1/projects?limit=5"
curl_json "$API_URL/api/v1/marketplace"
curl_json "$API_URL/api/v1/stellar/status"

if [ -n "$WEB_URL" ]; then
  echo "==> Frontend publicado"
  curl -fsS "$WEB_URL/" >/dev/null
fi

echo "OK: smoke Dokploy passou para API=$API_URL WEB=${WEB_URL:-nao-informado}"
