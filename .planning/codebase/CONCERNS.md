# Preocupações do Codebase

**Data da análise:** 2026-05-22

## Dívidas técnicas

### Runtime legado aposentado ainda aparece em histórico Git

- **Problema:** artefatos históricos podem reaparecer em cherry-picks ou merges.
- **Arquivos:** `backend_app/*`, `Dockerfile*`, `docker-compose*.yml`.
- **Impacto:** reintroduzir runtime antigo quebraria o contrato de Postgres como fonte durável.
- **Ação:** manter `tests/contract/test_backend_runtime_cutover.py` como guarda do cutover.

### Manifesto Python incompleto para os módulos legados

- **Problema:** `pyproject.toml` e `uv.lock` cobrem o app ativo, mas módulos históricos importavam pacotes não declarados.
- **Pacotes citados em código:** `sqlalchemy`, `passlib`, `python-jose`, `brutils`, `slowapi`, `boto3`, `cryptography`, `stellar_sdk`, `requests`.
- **Impacto:** importações limpas falham e tornam perigoso reaproveitar arquivos por aparência.
- **Ação:** declarar dependências apenas para a nova API e classificar legado como referência, código morto ou fonte de requisito.

### Modelo SQLAlchemy inconsistente

- **Problema:** auth/seed esperam campos como `username`, `hashed_password` e `role`, enquanto modelos usam `nome`, `senha_hash` e `tipo_usuario`.
- **Impacto:** ligar os routers atuais ao banco pode quebrar em runtime e gerar schema divergente.
- **Ação:** criar schema canônico no Supabase e mapear nomes antigos apenas em migrations/fixtures.

### Persistência sem ciclo de migração

- **Problema:** há `create_all()` e modelos, mas não há Alembic, migrations versionadas, seed idempotente, rollback ou política de produção.
- **Impacto:** alta chance de drift entre local e produção.
- **Ação:** introduzir Supabase CLI local, SQL versionado, Alembic e seed controlado.

### TypeScript não é validado pelo build

- **Problema:** `npm run build` usa Vite e pode passar mesmo com falhas de `tsc`.
- **Impacto:** regressões de contrato frontend/backend podem chegar ao deploy.
- **Ação:** adicionar `typecheck` e incluir `tsc --noEmit` nos gates antes da troca de API.

### Artefatos gerados pesados no repositório

- **Problema:** `soroban-contract/target` está versionado e é muito grande; `novas telas painel/` contém exports de design.
- **Impacto:** buscas, clones e CI ficam ruidosos/lentos.
- **Ação:** planejar cleanup separado, com `.gitignore` e remoção cuidadosa de artefatos gerados.

## Bugs e fragilidades conhecidas

### Stellar/Soroban externos dependem de credenciais

- **Sintoma:** sem chaves e RPCs reais, operações externas precisam permanecer em modo local/sandbox explícito.
- **Arquivos:** `backend_app/adapters/stellar.py`, `backend_app/adapters/etherfuse.py`, `backend_app/adapters/polygon.py`.
- **Mitigação:** manter contratos de adapter e persistir eventos gerados pelos serviços de domínio.

### Código Stellar real é inalcançável/parcial

- **Sintoma:** há bloco de SDK após retorno antecipado em `burn_credit()` e referência a variável fora de escopo.
- **Mitigação:** substituir por adapter explícito com contratos de transfer, burn, mint e status.

### `docker-compose.yml` não é confiável

- **Sintoma:** validação de compose falha por YAML inválido.
- **Impacto:** Dokploy/Compose não deve usar esse arquivo como base.
- **Mitigação:** criar `docker-compose.dokploy.yml` limpo.

### Healthcheck e portas não estão alinhados

- **Sintoma:** `Dockerfile` combinado expõe porta 80, `Dockerfile.api` usa 5680 e o compose aponta para rotas/portas inconsistentes.
- **Mitigação:** definir um contrato único: API em `/health`, web estático separado e Supabase fora dos containers.

### Aposentadoria ignora `VITE_API_URL`

- **Sintoma:** `src/pages/Dashboard/RetireCredits.tsx` chama localhost diretamente.
- **Mitigação:** usar `apiPost('/marketplace/compensate', ...)`.

### Testes estão desatualizados

- **Sintoma:** `pytest`/`httpx` não estão no manifesto; alguns testes esperam endpoints ou campos que não existem mais.
- **Mitigação:** transformar os testes em suíte de contrato antes do rebuild.

## Segurança

### Auth precisa seguir evoluindo para produção

- **Risco:** a fase atual usa auth própria com Argon2/JWT, mas ainda precisa endurecimento de refresh token, rotação e política de produção.
- **Ação:** evoluir auth própria ou Supabase Auth com contrato explícito e testes de papéis.

### Refresh token e rotação

- **Risco:** auth própria já usa JWT, mas ainda precisa estratégia produtiva de refresh/rotação/revogação.
- **Ação:** definir refresh token persistido ou migrar para Supabase Auth em fase explícita.

### Rotas de negócio sem autorização suficiente

- **Risco:** marketplace, auditoria, certificação e inventário mutam estado sem guards robustos.
- **Ação:** implementar `require_user`, `require_role` e testes de acesso negado.

### Upload superficial

- **Risco:** upload lê arquivo inteiro em memória, confia em `content_type` e não persiste em storage controlado.
- **Ação:** validar extensão, magic bytes, tamanho, hash, auth e storage.

### Segredos e variáveis

- **Risco:** não há `.env.example`; Docker/compose têm valores locais inline.
- **Ação:** criar contrato de env sem segredos, falhar rápido em produção e usar secrets do Dokploy/Supabase.

## Performance e escala

- O bundle Vite já emite aviso de chunk grande; adicionar lazy routes antes de expandir páginas pesadas.
- Páginas buscam listas grandes e remapeiam no cliente; a API nova deve expor paginação/filtros.
- Repositórios em memória não devem ser reintroduzidos; dados críticos ficam em Postgres.
- Uploads são memory-bound; storage deve ser externo.
- Não há rate limiting ativo na API que roda.

## Bloqueios para produção

- Autenticação e autorização produtivas.
- Schema canônico em Supabase com migrations.
- Contrato `/api/v1` congelado por testes.
- Deploy Dokploy repetível com API e web no mesmo gatilho.
- Auditoria persistente para compras, decisões, aposentadorias e eventos blockchain.
