from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def application_files() -> list[Path]:
    roots = [
        ROOT / "backend_app",
        ROOT / "src",
        ROOT / "supabase",
        ROOT / ".env.example",
        ROOT / "Dockerfile",
        ROOT / "Dockerfile.api",
        ROOT / "Dockerfile.frontend",
        ROOT / "docker-compose.yml",
        ROOT / "docker-compose.dokploy.yml",
        ROOT / ".planning/codebase",
        ROOT / ".planning/docs/deployment",
    ]
    files: list[Path] = []
    allowed_suffixes = {
        ".css",
        ".dockerignore",
        ".env",
        ".example",
        ".html",
        ".js",
        ".json",
        ".md",
        ".py",
        ".sql",
        ".toml",
        ".ts",
        ".tsx",
        ".yml",
        ".yaml",
    }
    for root in roots:
        if root.is_file():
            files.append(root)
            continue
        files.extend(
            path
            for path in root.rglob("*")
            if path.is_file()
            and "__pycache__" not in path.parts
            and path.suffix in allowed_suffixes
        )
    return files


def test_runtime_artifacts_use_backend_app_only() -> None:
    assert not (ROOT / "backend").exists()
    assert not (ROOT / "backend/main.py").exists()
    assert not (ROOT / "backend/mock_data.py").exists()

    for path in [
        "Dockerfile",
        "Dockerfile.api",
        "docker-compose.yml",
        "docker-compose.dokploy.yml",
        ".planning/docs/deployment/LOCAL-UAT-DOKPLOY.md",
        ".planning/docs/deployment/PHASE1-STAGING-SMOKE.md",
    ]:
        text = read(path)
        assert "backend.main" not in text, f"{path} still references backend.main"
        assert "backend/main.py" not in text, f"{path} still references backend/main.py"


def test_frontend_container_proxies_api_requests_to_backend_service() -> None:
    dockerfile = read("Dockerfile.frontend")
    compose = read("docker-compose.yml")
    dokploy_compose = read("docker-compose.dokploy.yml")

    assert "location /api/" in dockerfile
    assert "proxy_pass http://sinarca-api:5680/api/" in dockerfile
    assert "proxy_set_header Authorization $http_authorization" in dockerfile
    assert "client_max_body_size 10m" in dockerfile
    assert '${WEB_PORT:-5173}:80' in compose
    assert '${WEB_PORT:-80}:80' in dokploy_compose


def test_backend_app_auth_has_no_in_memory_profile_fallback() -> None:
    repository = read("backend_app/modules/profiles/repository.py")
    service = read("backend_app/modules/auth/service.py")

    assert "InMemoryProfileRepository" not in repository
    assert "profile_repository =" not in repository
    assert "get_profile_repository()" not in service


def test_application_runtime_contains_no_mock_contracts() -> None:
    offenders = []
    for path in application_files():
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        if "mock" in text:
            offenders.append(str(path.relative_to(ROOT)))

    assert offenders == []
