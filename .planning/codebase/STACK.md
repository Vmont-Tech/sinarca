# Stack Tecnológica

**Data da análise:** 2026-05-22

## Linguagens

- **TypeScript:** frontend React/Vite em `src/`.
- **Python 3.11:** backend FastAPI atual em `backend_app/`, com manifesto em `pyproject.toml`.
- **Rust 2021:** contrato Soroban em `soroban-contract/`.
- **CSS/Tailwind:** estilos em `src/index.css`, `src/App.css` e `tailwind.config.js`.

## Runtimes e gerenciadores

- **Node.js:** usado pelo frontend, Vite e Dockerfiles de build.
- **npm:** `package.json` e `package-lock.json`.
- **Python/uv:** `pyproject.toml`, `uv.lock`, `.python-version`, `Dockerfile` e `Dockerfile.api`.
- **Cargo:** `soroban-contract/Cargo.toml` e `soroban-contract/Cargo.lock`.
- **Docker:** `Dockerfile`, `Dockerfile.api`, `Dockerfile.frontend` e `.dockerignore`.

## Frameworks e bibliotecas principais

Frontend:

- React 19
- React DOM
- React Router DOM 7
- Vite 7
- Tailwind CSS
- lucide-react
- `@svg-maps/brazil`

Backend atual:

- FastAPI
- Pydantic v2
- Uvicorn
- `python-multipart`
- `email-validator`
- SQLAlchemy async
- asyncpg
- pwdlib/Argon2

Contrato:

- Soroban SDK 26

## Dependências citadas, mas não consolidadas

Arquivos legados importam pacotes que não estão garantidos pelo manifesto atual:

- `sqlalchemy`
- `python-dotenv`
- `python-jose`
- `passlib`
- `brutils`
- `slowapi`
- `boto3`
- `cryptography`
- `stellar_sdk`
- `requests`

Esses pacotes não devem ser assumidos como base da reconstrução. A nova API deve declarar apenas o que realmente usa.

## Configuração atual

- `VITE_API_URL` controla a URL da API no frontend.
- `vite.config.ts` faz proxy de `/api` para `http://localhost:5680`.
- `CORS_ORIGINS` controla origens permitidas no backend.
- `backend_app/main.py` monta a API ativa.
- `backend_app/core/config.py` centraliza `DATABASE_URL`, JWT, CORS e envs externas.
- `backend_app/adapters/stellar.py` usa env vars `STELLAR_*`.
- Supabase é usado como Postgres via `DATABASE_URL`; o backend não depende de cliente Supabase.

## Scripts úteis

```bash
npm ci
npm run dev
npm run lint
npm run build
uvicorn backend_app.main:app --host 0.0.0.0 --port 5680
uv run pytest -q
docker build -f Dockerfile.api .
docker build -f Dockerfile.frontend .
```

## Requisitos de produção

- API Python/FastAPI reconstruída em `backend_app/`.
- Supabase Postgres local e produção com migrations.
- Frontend Vite servido como estático por Nginx/Caddy.
- `Dockerfile.api` e `Dockerfile.frontend` produtivos.
- Deploy Dokploy com API e web no mesmo gatilho de `main`.
- `.env.example` sem segredos.
