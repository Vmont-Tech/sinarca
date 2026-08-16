# Deferred Items — Phase 04.2

Out-of-scope failures discovered during execution but not fixed (per executor scope boundary: only fix issues directly caused by the current task's changes).

## 04.2-01

| Item | File | Status | Notes |
|------|------|--------|-------|
| `test_frontend_container_proxies_api_requests_to_backend_service` fails | `tests/contract/test_backend_runtime_cutover.py`, `Dockerfile.frontend` | Pre-existing, confirmed via `git stash` before this plan's changes | `Dockerfile.frontend` nginx config does not contain `proxy_pass http://sinarca-api:5680/api/`; unrelated to Integrity Layer schema work. Not fixed here. |
