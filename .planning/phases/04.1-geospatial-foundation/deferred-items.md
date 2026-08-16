# Deferred Items — Phase 04.1 geospatial-foundation

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Test failure (pre-existing, out of scope) | `tests/contract/test_backend_runtime_cutover.py::test_frontend_container_proxies_api_requests_to_backend_service` fails — expects `proxy_pass http://sinarca-api:5680/api/` in `Dockerfile.frontend`, which the current file does not contain. Confirmed pre-existing (fails identically on a clean `git stash` of this plan's changes), unrelated to `project_boundaries`/PostGIS. | Not fixed — out of scope for 04.1-01 (scope boundary: only fix issues directly caused by this plan's changes) | 04.1-01 |
