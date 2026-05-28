# Phase 04: certification-workbench - Log de Discussão

> **Trilha de auditoria apenas.** Não usar como entrada para planejamento, pesquisa ou execução.
> As decisões canônicas estão em `04-CONTEXT.md`; este log preserva alternativas consideradas.

**Data:** 2026-05-27
**Fase:** 04-certification-workbench
**Áreas discutidas:** Revisão detalhada, Decisão técnica, Certificado/referência, Mint bloqueado, Histórico de decisões

---

## Revisão detalhada

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Página dedicada por projeto | Abrir uma rota própria para revisar o projeto. | |
| Painel lateral a partir da fila | Manter fila central e abrir detalhes em drawer. | |
| Card expansível na própria fila | Seguir o padrão da área do auditor. | ✓ |

**Escolha do usuário:** card expansível na própria fila, como na área do auditor.
**Notas:** o card expandido deve usar abas internas. Sem baseline, quatro QTAGs/geofence e documentos obrigatórios, a certificadora não decide; gera pendência estruturada para o produtor/origem e marca o projeto como pendente.

---

## Decisão técnica

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Formulário completo por decisão | Campos próprios para aprovar, reprovar e pedir ajustes. | ✓ |
| Formulário simples + campos avançados opcionais | Fluxo rápido, menos auditável. | |
| Checklist técnico obrigatório antes da decisão | Critérios técnicos determinam a decisão. | |

**Escolha do usuário:** formulário completo por decisão.
**Notas:** aprovação usa potencial sugerido pelo sistema e editável com justificativa. Reprovação e ajustes exigem categoria + descrição obrigatória. Decisão registrada não é editada; correções entram como nova decisão/evento auditável. Solicitar ajustes move o projeto para fila separada de "aguardando retorno do produtor", com contador no dashboard.

---

## Certificado/referência

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Upload de certificado/documento assinado | Anexar arquivo real validado pelo backend. | ✓ |
| Referência documental obrigatória | Informar hash, URL ou número externo. | |
| Ambos aceitos | Exigir upload ou referência externa. | |

**Escolha do usuário:** upload obrigatório de PDF.
**Notas:** nesta fase o certificado aceita PDF apenas. Deve aparecer no dossiê interno e público, com visibilidade adequada. Se o upload falhar, a aprovação não conclui. Ideia futura: template de certificado, preenchimento automático com dados do sistema e assinatura digital pela certificadora.

---

## Mint bloqueado

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Preparar status e registro operacional, sem executar provider | Certificação autoriza mint e tesouraria executa depois. | ✓ |
| Tentar adapter quando credenciais existirem | Mistura certificação com provider/blockchain. | |
| Acionar sempre o fluxo completo de mint bloqueado | Invade Phase 8. | |

**Escolha do usuário:** certificação autoriza a emissão/mint, mas não executa; a execução fica para tesouraria em fila própria.
**Notas:** a aprovação mostra status `Certificação aprovada`, `Mint autorizado` e `Aguardando tesouraria`. A fila da tesouraria recebe pacote mínimo de autorização. Aprovação e pendência de tesouraria são atômicas.

---

## Histórico de decisões

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Certificadora + produtor + dossiê público limitado | Trilha completa interna e transparência pública limitada. | ✓ |
| Só certificadora/admin | Mais restrito. | |
| Totalmente público | Máxima transparência, risco de exposição. | |

**Escolha do usuário:** certificadora e produtor veem trilha completa; público vê dossiê limitado.
**Notas:** entram todos os eventos da certificação. Notas internas completas ficam visíveis para certificadora, admin, produtor e tesouraria; público vê apenas o dossiê público. Histórico deve ter linha do tempo por projeto e filtros básicos por tipo de evento/status e ator.

---

## Discrição do Agente

- Definir nomes técnicos de tabelas, DTOs, endpoints e componentes.
- Definir composição exata das abas internas, desde que preserve as decisões canônicas do contexto.

## Ideias Adiadas

- Área futura para template de certificado, preenchimento automático com dados do sistema e assinatura digital pela certificadora.
- Execução real de mint/provider pela tesouraria/blockchain.
- Console completo de tesouraria/admin.
