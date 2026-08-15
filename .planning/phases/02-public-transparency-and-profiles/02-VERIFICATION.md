---
phase: "02"
slug: "public-transparency-and-profiles"
status: passed
date: 2026-08-15
---

# Phase 02 Verification

Data original: 2026-05-26 (implementação). Verificação completa fechada em 2026-08-15.
Branch: `feat/fase-2-transparencia-perfis` (implementação) → `feat/fase-4-certification-workbench` (verificação).

## Cobertura (2026-08-15)

1. **Nyquist (`02-VALIDATION.md`)** — cobertura de teste automatizado auditada; 2 gaps corrigidos (comando obsoleto, bug de métricas zeradas no perfil próprio).
2. **UAT (`02-UAT.md`)** — 10/10 testes passados, verificados via API contra o backend local (dossiê público, filtros de transação, mascaramento de perfil, cadastro/bloqueio de admin, persistência de edição).
3. **Segurança (`02-SECURITY.md`)** — 21 ameaças verificadas no código atual: 18 já fechadas, 2 corrigidas nesta rodada (métrica fabricada em `AuditorProfile.tsx`, sessão expirada não notificava `AuthContext`), 1 aceita como risco documentado (duplicação de lógica entre páginas de perfil). `threats_open: 0`.

Durante a verificação, foi descoberto que o container Docker local (`sinarca-sinarca-api-1`) estava rodando código de 2026-05-27 (~2,5 meses desatualizado). Containers reconstruídos (`docker compose build && up -d --force-recreate`) e evidências re-confirmadas contra o código atual.

## Resultado

Phase 02 implementada localmente para os planos `02-01` a `02-05`.

## Escopo Validado

- Navegação pública usa rotas limpas e mantém redirect de compatibilidade para `/public/*`.
- Páginas legais/institucionais não publicam placeholders de cidade, contato ou DPO.
- Canais provisórios:
  - contato geral: `contato@sinarca.com.br`
  - suporte: `suporte@sinarca.com.br`
  - DPO: `dpo@sinarca.com.br`
  - compliance/ética: `compliance@sinarca.com.br`
- Dossiê público agregado: `/api/v1/projects/{id}/public-dossier`.
- Explorer público: `/api/v1/transactions` com filtros por projeto, hash, tipo, comprador e status.
- Detalhe público de transação: `/api/v1/transactions/{hash_or_id}`.
- Perfis públicos minimizados: `/api/v1/profiles/{id}`.
- Catálogo público inclui produtores via `/api/v1/producers`.
- Cadastro público cobre produtor, empresa, auditor e certificadora; cadastro admin público permanece bloqueado.
- Edição de perfil persiste nome, e-mail, organização, telefone, documento e avatar/logo.

## Evidências Automatizadas

```bash
DATABASE_URL='postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres' JWT_SECRET_KEY='local-dev-secret-key-for-sinarca-32bytes' uv run --with pytest --with httpx pytest -q tests/contract/test_api_v1_contract.py
```

Resultado: `7 passed in 0.62s`.

```bash
npm run build
```

Resultado: build Vite concluído com sucesso. Aviso residual: chunk principal acima de 500 kB.

```bash
npx tsc -b
```

Resultado: falha por dívida legada fora do escopo da Phase 2. Categorias observadas:

- imports não usados em componentes legados;
- tipos quebrados em `src/services/impact-engine/*`;
- tipos incompletos em telas legadas como `AddProject`, perfis antigos e `GlobalMap`.

## Evidências Manuais Locais

Serviços usados:

- API dev: `http://127.0.0.1:5681`
- Web dev: `http://127.0.0.1:5173`
- Supabase local: `http://127.0.0.1:54323`

Smokes HTTP:

```bash
curl -fsS 'http://127.0.0.1:5681/api/v1/projects/PRC-2024-002/public-dossier'
curl -fsS 'http://127.0.0.1:5681/api/v1/transactions?project_id=PRC-2024-002&type=received&buyer=comp-001&status=completed&limit=2'
curl -fsS 'http://127.0.0.1:5681/api/v1/profiles/prod-001'
curl -fsS 'http://127.0.0.1:5681/api/v1/producers'
```

Rotas verificadas no browser integrado:

- `/projeto/PRC-2024-002`
- `/feed`
- `/perfil/prod-001`
- `/login` em desktop e mobile
- `/privacidade`

Console do browser: sem erro de runtime; apenas mensagem informativa do React DevTools.

## Pendências Fora do Escopo

- `main` está protegida contra push direto; planejamento e implementação precisam entrar via PR.
- Provisionamento e gestão admin permanecem na Phase 9.
- Operação completa de DPO/LGPD, retenção e anonimização permanece na Phase 10.
- Limpeza global de `tsc -b` deve ser tratada como dívida técnica transversal ou fase de qualidade.
