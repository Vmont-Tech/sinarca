# Phase 02: public-transparency-and-profiles

## Objetivo

Fechar a experiência pública e de identidade básica do SINARCA usando dados persistidos: rotas públicas limpas, dossiê público completo de projeto, explorer de transações, perfis públicos por papel, cadastro por perfil, edição de perfil, páginas legais/institucionais e estados de erro amigáveis.

## Origem

Criada em 2026-05-26 a partir da auditoria `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` e da conferência contra `.planning/docs/bible/`.

## Fontes canônicas

- `.planning/ROADMAP.md`
- `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md`
- `.planning/docs/BIBLE_PHASE_COVERAGE_AUDIT.md`
- `.planning/docs/BLUEPRINT_V1.md`
- `.planning/docs/bible/10_Termos_de_Uso.md`
- `.planning/docs/bible/11_Suporte_Juridico.md`
- `.planning/docs/bible/12_Politica_de_Privacidade.md`
- `.planning/docs/bible/13_Quem_Somos_O_Que_Fazemos_e_Como_Fazemos.md`
- `.planning/phases/01-backend-rebuild/API-CONTRACT.md`
- `.planning/phases/01-backend-rebuild/DATA-MODEL.md`

## Discussão fechada em 2026-05-26

A fase foi discutida em modo orientado por documentos. Não houve pergunta bloqueante porque o checklist operacional, a auditoria da Bible e o roadmap já definem o recorte: a Phase 2 deve fechar transparência pública e identidade de usuários, sem reabrir originação, marketplace, tesouraria, admin operacional ou governança LGPD completa.

## Escopo

- Fechar navegação pública e CTAs com URLs limpas.
- Completar dossiê público do projeto com dados persistidos.
- Criar explorer de transações com filtros por projeto, hash, tipo de evento, comprador e status.
- Criar perfis públicos por papel: produtor, empresa, auditor e certificadora.
- Completar cadastro por perfil para produtor, empresa, auditor e certificadora.
- Completar edição de perfil persistida: nome, telefone, organização, documento e avatar.
- Padronizar erros amigáveis de auth, sessão expirada e API indisponível.
- Publicar Termos de Uso, Política de Privacidade, suporte jurídico, contato/DPO e conteúdo institucional usando `contato@sinarca.com.br` como canal provisório.
- Garantir copy pública clara: o SINARCA é camada tecnológica complementar, não certificadora, auditor independente ou consultoria jurídica.
- Garantir que todo dado demonstrativo de tela venha de `supabase/seed.sql` ou de `/api/v1`.

## Fora de escopo

- Originação completa de projeto, QTAGs obrigatórias na UI, geofence e documentos do produtor, que ficam na Phase 3.
- Bancada detalhada da certificadora, que fica na Phase 4.
- Auditoria de campo, evidências, NDVI/anomalias e desbloqueio operacional, que ficam na Phase 5.
- Marketplace, carteira, aposentadoria e certificado de impacto, que ficam na Phase 6.
- Inventário de emissões e vínculo com compensação, que fica na Phase 7.
- Consoles de tesouraria/blockchain/providers, que ficam na Phase 8.
- Provisionamento admin, gestão de usuários/papéis e console operacional, que ficam na Phase 9.
- Operacionalização completa de LGPD/GDPR, retenção, anonimização, AML/CFT, MFA e controles transversais, que fica na Phase 10.

## Implementação atual observada

- `src/App.tsx` já expõe rotas públicas limpas para `/consulta`, `/feed`, `/mapa-brasil`, `/mapa-nacional`, `/rankings`, `/sobre`, `/projeto/:id`, `/tx/:hash` e `/perfil/:id`; `/public/*` redireciona por compatibilidade.
- `src/pages/Dashboard/PublicExplorer.tsx` consome `/transactions`, mas filtra principalmente em memória e não cobre projeto, comprador e status como contrato de API/UI.
- `src/pages/Dashboard/MrcaDetails.tsx` carrega projeto por `/projects/{id}`, mas ainda exibe documentos, auditoria e rede blockchain com conteúdo fixo ou legado.
- `src/pages/Dashboard/UserProfile.tsx` monta perfis a partir de empresas, auditores e certificadoras; produtores não têm catálogo público e a atividade fica vazia.
- `src/pages/Login.tsx` oferece cadastro público para produtor, auditor e empresa; `certifier` existe no backend e no `AuthContext`, mas não aparece no seletor.
- `src/pages/Dashboard/Settings.tsx` edita nome, e-mail, organização e telefone; documento e avatar não têm fluxo real na UI.
- `backend_app/modules/projects/routes.py` expõe `/projects`, `/projects/{id}`, `/certifiers`, `/auditors` e `/companies`; não há `/producers` nem dossiê público agregado.
- `backend_app/modules/marketplace/routes.py` expõe `/transactions`, mas sem filtros de query nem detalhe por hash.
- `supabase/seed.sql` já contém organizações, perfis, projetos, tags, baselines, certificações, auditorias, documentos, chain events e ledger entries úteis para a fase.

## Decisões de planejamento

1. A fase será dividida em cinco planos: navegação/legal, contrato público de API, dossiê/explorer UI, perfis públicos/rankings e auth/perfil.
2. O dossiê público deve consumir dados agregados ou endpoints específicos de `/api/v1`; qualquer ausência de dado deve aparecer como estado vazio ou bloqueio explícito, não como texto fixo.
3. O explorer deve evoluir para filtros de backend e UI, com detalhe por hash/ID como fonte para recibos públicos futuros.
4. Perfis públicos devem usar o catálogo de organizações/perfis do banco e incluir produtores.
5. Cadastro público continua limitado a papéis não-admin. Admin permanece sem cadastro público e será tratado em Phase 9.
6. Conteúdo legal/institucional da Bible pode ser publicado na Phase 2, mas operações completas de DPO, direitos do titular, retenção e anonimização ficam na Phase 10.
7. Enquanto não houver canal definitivo, a implementação deve usar `contato@sinarca.com.br` para contato, suporte e DPO provisórios.

## Regras de aceite

- Todo `PLAN.md` da fase deve incluir seção "Cobertura do checklist".
- Itens 1 e 2 do checklist devem estar cobertos ou explicitamente fora de escopo com justificativa.
- Nenhum dado demonstrativo novo pode vir de mock runtime no frontend.
- Dados públicos devem vir do banco/seed via `/api/v1`.
- `/public/*` pode permanecer apenas como redirect de compatibilidade.
- As telas públicas precisam ter estados de loading, vazio, erro de API e não encontrado.
- A conclusão da fase exige UAT manual dos fluxos públicos, cadastro por papel, edição de perfil e erros de auth.

## Riscos

- O dossiê público depende de expor dados hoje espalhados em `project_tags`, `project_baselines`, `certifications`, `audits`, `documents`, `environmental_credits`, `chain_events` e `ledger_entries`.
- Dados pessoais em perfis e transações precisam respeitar minimização e limites de privacidade; ajustes profundos de governança ficam na Phase 10, mas a Phase 2 não pode expor documento sensível sem decisão explícita.
- Páginas legais atuais podem conter placeholders de cidade, e-mail e DPO; a execução deve substituir e-mail/DPO por `contato@sinarca.com.br` e evitar inventar foro/cidade.
- Alguns componentes públicos ainda têm design de dashboard e cards muito arredondados; se houver mudança de UI, validar em desktop e mobile antes de concluir.
