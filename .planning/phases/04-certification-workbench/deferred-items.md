# Deferred Items — Phase 04 certification-workbench

## 04-03

- **`Dockerfile.frontend` fora do escopo do plano 04-03.** `git status` já mostrava `Dockerfile.frontend` modificado antes desta execução (mudança local não commitada, não relacionada a certificação). `uv run pytest tests/contract -q` falha em
  `test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service`
  porque o arquivo local não tem mais a linha `proxy_pass http://sinarca-api:5680/api/`. Não foi
  tocado nem revertido por este plano — está fora do escopo de `04-03` (Dockerfile de deploy não
  está em `files_modified`). Requer decisão do usuário sobre se a mudança local no Dockerfile é
  intencional antes de qualquer commit futuro que a inclua.
