# Phase 10: security-compliance-and-data-governance

## Origem

Criada em 2026-05-26 após conferência do roadmap contra `.planning/docs/bible/`.

## Escopo

- Fechar requisitos não funcionais da Bible: desempenho, disponibilidade, escalabilidade, recuperação de desastre, acessibilidade, manutenibilidade e documentação.
- Operacionalizar LGPD/GDPR: DPO/contato, direitos do titular, consentimento, retenção, exclusão/anonimização off-chain e minimização de dados.
- Fechar segurança transversal: MFA, RBAC, menor privilégio, segredos, HSM/KMS ou bloqueio documentado, criptografia em trânsito/repouso, plano PQC e auditoria de smart contracts.
- Definir controles de AML/CFT/KYC ou decisão explícita de escopo para pagamentos, tokens e compradores.
- Formalizar prevenção a fraude, dupla contagem e greenwashing com evidências auditáveis.
- Criar runbooks de segurança, resposta a incidentes, auditoria externa, backup/restore e manutenção.

## Fora de escopo

- Construir as telas de negócio das Phases 2-9.
- Operação mainnet produtiva sem decisão explícita.
- Certificação metodológica de créditos; o SINARCA permanece como camada tecnológica complementar.

## Regras de aceite

- A fase deve incluir seção "Cobertura do checklist" no `PLAN.md`, cobrindo a regra transversal e requisitos de segurança/compliance que atravessam os itens 1-12.
- Cada compromisso jurídico ou de privacidade publicado precisa ter mecanismo operacional, responsável ou bloqueio explícito.
- Dados pessoais não devem ser gravados on-chain; referências públicas devem usar identificadores, hashes ou agregações quando aplicável.
- Requisitos de segurança sem credencial ou infraestrutura externa devem falhar fechado.
- Produção exige evidência mínima de backup/restore, monitoramento, logs e resposta a incidente.
