# Auditoria de cobertura da Bible por fases

**Data:** 2026-05-26
**Escopo:** comparação de `.planning/docs/bible/` contra `.planning/ROADMAP.md`.

## Veredito

O roadmap cobria o ciclo funcional principal, mas deixava alguns compromissos da Bible implícitos. A cobertura foi ajustada com:

- ampliação das Phases 2, 3, 5, 6 e 9;
- criação da **Phase 10: security-compliance-and-data-governance**;
- manutenção da Phase 1 como base técnica concluída.

## Mapeamento

| Documento da Bible | Cobertura no roadmap | Observação |
|---|---|---|
| `01_Visao_Geral_e_Arquitetura.md` e `01_visao_geral.md` | Phases 2-8 e Phase 10 | Núcleo funcional coberto; posicionamento "camada complementar" agora entra em Phase 2/10. |
| `02_Requisitos_Funcionais_e_Nao_Funcionais.md` | Phases 3, 5, 6, 8 e 10 | RFs cobertos; RNFs de desempenho, disponibilidade, DR, acessibilidade, segurança e compliance ficam na Phase 10. |
| `03_Arquitetura_Tecnica_Detalhada.md` | Phases 1, 3, 5, 8, 9 e 10 | Campo/mobile/NFC foi explicitado nas Phases 3/5; segredos, HSM/KMS, MFA e PQC ficam na Phase 10. |
| `04_Modelagem_de_Dados_e_Entidades.md` | Phases 1-8 | Entidades principais cobertas por base técnica e fases funcionais; divergências finas de modelo devem ser tratadas nos planos de cada fase. |
| `05_Fluxos_de_Negocio_e_Casos_de_Uso.md` | Phases 3-8 | Registro/demarcação, monitoramento, auditoria, tokenização, compra e burn cobertos; notificações reforçadas em Phase 5/9. |
| `06_Guia_Implementacao_e_Roadmap.md` | Phases 1, 3, 5, 6, 8, 9 e 10 | Roadmap da Bible traduzido para a estrutura atual; app móvel/PWA, pagamentos, suporte e operação foram explicitados. |
| `07_Seguranca_Compliance_e_Qualidade.md` | Phase 10 | Antes estava disperso; agora tem fase própria. |
| `08_Como_Operamos_Dados.md` | Phase 10 | Governança, retenção, direitos do titular, anonimização e compartilhamento ficam na fase transversal. |
| `09_Auditoria_e_Compliance.md` | Phases 2, 5, 8 e 10 | Auditoria de campo/blockchain está coberta; AML/CFT, auditoria externa e riscos regulatórios ficam na Phase 10. |
| `10_Termos_de_Uso.md` | Phases 2 e 10 | Publicação entra na Phase 2; operacionalização dos compromissos entra na Phase 10. |
| `11_Suporte_Juridico.md` | Phases 2 e 10 | Copy e página pública entram na Phase 2; governança e limites de responsabilidade entram na Phase 10. |
| `12_Politica_de_Privacidade.md` | Phases 2 e 10 | Página pública entra na Phase 2; DPO, direitos, retenção e anonimização entram na Phase 10. |
| `13_Quem_Somos_O_Que_Fazemos_e_Como_Fazemos.md` | Phase 2 | Conteúdo institucional e posicionamento público entram na experiência pública. |
| `Roteiro_Video_Institucional_SINARCA.md` | Phase 2 | Conteúdo institucional pode ser tratado como asset/copy pública. |

## Itens que estavam subcobertos

1. **Cliente de campo mobile/PWA para NFC e auditoria:** reforçado nas Phases 3 e 5.
2. **Pagamentos/settlement:** reforçado na Phase 6 para não simular compra silenciosamente.
3. **Privacidade/LGPD/DPO/retenção/anonimização:** coberto pela Phase 10.
4. **AML/CFT/KYC e risco regulatório:** coberto pela Phase 10.
5. **MFA, HSM/KMS, segredos e PQC:** coberto pela Phase 10.
6. **Disponibilidade, backup/DR, performance, acessibilidade e qualidade:** coberto pela Phase 10.
7. **Auditoria externa e smart contract audit:** coberto pela Phase 10, com dependência operacional na Phase 8.

## Decisão

Não reabrir a Phase 1. A Bible passa a ser coberta por Phases 2-10, com os requisitos transversais concentrados na Phase 10 e os fluxos de campo distribuídos nas fases funcionais correspondentes.

O checklist operacional em `.planning/docs/FLOW_SCREEN_CHECKLIST_AUDIT.md` continua sendo a base de aceite das Phases 2-10. A Bible complementa o checklist com requisitos técnicos, jurídicos, de segurança, privacidade e operação; ela não substitui a matriz checklist -> fases.
