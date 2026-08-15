---
phase: "03"
slug: "project-origination-and-documents"
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-26
---

# Phase 03 — UI Design Contract

> Contrato visual e de interação para a originação de projetos SINARCA.

## UI/UX Pro Max Gate

Esta fase tem UI e deve aplicar `ui-ux-pro-max` junto com `gsd-ui-phase`. Regras bloqueantes para execução:

- Acessibilidade primeiro: contraste AA, foco visível, labels persistentes e mensagens de erro próximas ao campo.
- Toque e interação: controles clicáveis com alvo mínimo de 44px, espaçamento mínimo de 8px e feedback visual em loading/success/error.
- Formulário longo: wizard com indicador de etapa, navegação de voltar previsível e preservação de dados preenchidos após erro.
- Responsividade: mobile-first, sem scroll horizontal, preview com dimensão estável para evitar layout shift.
- Feedback: erros devem dizer causa e recuperação; múltiplos erros devem aparecer em resumo e também no campo.
- Performance visual: reservar espaço para upload/geofence e evitar animações decorativas ou dependentes de largura/altura.

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | lucide-react |
| Font | Herdar stack atual do app |

## Spacing Scale

Declarado em múltiplos de 4px:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gaps de ícones e microcopy |
| sm | 8px | Separação de campos compactos |
| md | 16px | Gaps de grid e inputs |
| lg | 24px | Padding de grupos do formulário |
| xl | 32px | Separação entre etapas |
| 2xl | 48px | Quebra entre wizard e painel lateral |
| 3xl | 64px | Espaçamento de página quando necessário |

Exceptions: manter classes existentes quando a alteração for apenas incremental em `AddProject.tsx`, mas novos painéis não devem usar `rounded-3xl`; usar raio máximo `rounded-lg` ou `rounded-xl` quando o padrão existente impedir churn excessivo.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 700 | 1.25 |
| Section heading | 14px | 800 | 1.25 |
| Page heading | 24px | 800 | 1.2 |
| Numeric/geocode | 12px | 600 monospace | 1.35 |

Regras:

- Não usar fonte escalada por viewport.
- Não usar letter-spacing negativo.
- Labels técnicos como `CMAC`, `SUN`, `QTAG`, `A/B/C/D` podem usar uppercase.
- Mensagens de erro devem dizer o problema e a ação esperada.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#ffffff` / `#f9fafb` | Formulário, campos e superfícies |
| Secondary (30%) | `#111827` / `#374151` | Texto principal e cabeçalhos |
| Accent (10%) | `#16a34a` ou token `primary` atual | Step ativo, confirmação, geofence válida |
| Warning | `#d97706` | NFC/SUN/Sentinel bloqueado ou manual |
| Destructive | `#dc2626` | Erros de validação e remoção de documento/tag |

Accent reservado para:

- etapa ativa do wizard;
- borda/linha do polígono válido;
- CTA principal de envio;
- badges de status persistido.

## Layout e Fluxo

`AddProject` deve sair de formulário único para wizard operacional de quatro blocos, sem virar landing page:

1. **Projeto** — produtor responsável, nome, município, UF, bioma, metodologia, área e estoque.
2. **QTAGs e geofence** — quatro vértices A/B/C/D, coordenadas, UID, CMAC, status de captura e preview do polígono.
3. **Documentos** — legal, CAR/KML/SHP/PDF quando suportado e inventário florestal, com upload real e lista de anexos.
4. **Revisão e envio** — resumo, bloqueios técnicos SUN/Sentinel, aceite e submissão.

O preview de geofence deve ficar no mesmo viewport do bloco de QTAGs em desktop e abaixo da lista em mobile. A área deve ter dimensão estável (`aspect-ratio`) para evitar salto de layout quando o polígono aparece.

## Estados Obrigatórios

| State | UI behavior |
|---|---|
| Sem certificadoras | Exibir erro bloqueante e CTA de tentar novamente; não permitir envio |
| Menos de 4 QTAGs | Bloquear avanço para revisão e listar vértices faltantes |
| NFC indisponível | Mostrar status "captura manual" ou "hardware indisponível"; não chamar isso de validação criptográfica |
| Geolocalização negada | Permitir digitação manual de lat/lng, com aviso persistente |
| Upload pendente | Mostrar item local como "não enviado"; envio final bloqueado se documento obrigatório não persistiu |
| Upload enviado | Mostrar tipo, nome, tamanho, hash truncado e status persistido |
| Erro API 401/403/422/5xx | Usar mensagens de `api.ts` e preservar dados preenchidos |
| Múltiplos erros de formulário | Exibir resumo no topo da etapa e mensagens junto aos campos afetados |
| Botão assíncrono | Desabilitar durante a requisição e manter largura/altura estáveis |

## Copywriting Contract

| Element | Copy |
|---------|------|
| Page title | `Adicionar projeto` |
| Primary CTA | `Criar projeto` |
| Secondary CTA | `Salvar rascunho local` somente se implementado; caso contrário, não exibir |
| QTAG empty state | `Registre os quatro vértices para gerar a geofence.` |
| NFC unsupported | `Este navegador não permite leitura NFC aqui. Use captura manual ou um dispositivo compatível.` |
| SUN blocked | `Validação SUN/CMAC real bloqueada por credenciais ou hardware. O CMAC informado será registrado como evidência declarada.` |
| Document empty state | `Envie os documentos obrigatórios antes de criar o projeto.` |
| Submit error | `Não foi possível criar o projeto. Revise os campos destacados e tente novamente.` |
| Success | `Projeto criado e enviado para a fila da certificadora.` |

## Componentes e Ícones

- Usar `lucide-react` para ações:
  - `MapPinned` ou `MapPin` para geofence/coordenadas.
  - `ScanLine` ou `Radio` para NFC/QTAG.
  - `Upload`, `FileText`, `Trash2`, `CheckCircle2`, `AlertTriangle`.
- Botões de ação técnica devem usar ícone + texto quando a ação não for óbvia.
- Remoção de QTAG/documento usa `Trash2` com tooltip/title, não botão textual longo.

## Acessibilidade e Responsividade

- Todos os inputs precisam de `label` textual persistente.
- Erros devem ser associados visualmente ao campo e aparecer em texto.
- O primeiro campo inválido deve receber foco ou ficar claramente destacado após tentativa de avanço/envio.
- Controles de upload, captura, remoção e navegação de etapa devem ter alvo mínimo de 44px.
- Ícones isolados precisam de `aria-label` ou `title`.
- Estados não podem depender só de cor; usar texto/ícone junto.
- Inputs numéricos de coordenada devem aceitar sinal negativo e casas decimais.
- Em mobile, a ordem é: campos do vértice, botão de captura, status, preview.
- Botões não podem mudar de tamanho ao alternar loading/success.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registry | none | blocked unless explicitly approved |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-26
