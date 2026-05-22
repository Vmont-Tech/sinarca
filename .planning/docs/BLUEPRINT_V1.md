# Blueprint de Arquitetura SINARCA v1.0

**Sistema Nacional de Rastreabilidade de Créditos Ambientais**
*Powered by QuantumCert®*

## 1. Objetivo do Documento

Este documento define a arquitetura funcional, lógica de navegação, papéis de usuários, comportamento de telas e contrato de UX/UI do ecossistema SINARCA e do Painel SINARCA.

Seu objetivo é:
*   Servir como blueprint oficial para desenvolvimento
*   Garantir consistência, escalabilidade e segurança
*   Orientar a implementação correta por times técnicos
*   Evitar decisões isoladas, retrabalho e conflitos futuros

Este documento deve ser seguido como fonte única de verdade.

## 2. Estrutura do Ecossistema

### 2.1 Separação Conceitual

**SINARCA (Plataforma Pública)**
*   Consulta, transparência, visualização e auditoria social.

**Painel SINARCA (Dashboard Autenticado)**
*   Operações, registros, validações, auditorias e governança.

**Ambos:**
*   Compartilham identidade visual
*   Compartilham dados públicos
*   Possuem permissões e escopos distintos

## 3. Tipos de Usuário (Roles)

### 3.1 Público (Sem Login)
**Permissões:**
*   Consultar registros públicos
*   Visualizar projetos, empresas, certificadoras e auditores
*   Acessar mapa, rankings e feed de eventos
*   Compartilhar links
*   Denunciar anomalias

**Restrições:**
*   Não registrar eventos
*   Não acompanhar projetos
*   Não interagir operacionalmente

### 3.2 Empresa
**Permissões:**
*   Criar perfil público
*   Calcular emissões
*   Comprar / compensar créditos
*   Receber NFT de compensação (burn)
*   Exibir troféus ambientais
*   Acompanhar projetos

### 3.3 Certificadora
**Permissões:**
*   Registrar projetos
*   Emitir MRCA
*   Acompanhar interesse (leads)
*   Visualizar métricas de impacto
*   Manter perfil institucional público

### 3.4 Auditor
**Permissões:**
*   Auditar projetos
*   Assinar relatórios
*   Registrar eventos on-chain
*   Possuir reputação pública
*   Assinatura digital com responsabilidade legal

### 3.5 Administrador (Restrito)
**Permissões:**
*   Governança
*   Moderação
*   Gestão de denúncias
*   Configurações sistêmicas

## 4. Arquitetura de Navegação

### 4.1 Usuário Público
**Rotas principais:**
*   `/` Home pública
*   `/public/consulta`
*   `/public/mapa`
*   `/public/rankings`
*   `/public/projetos`
*   `/perfil/:id`
*   `/login`

*Nunca exigir login para leitura pública.*

### 4.2 Usuário Autenticado (Painel SINARCA)
**Menu principal:**
*   Visão Geral
*   Histórico de MRCA
*   Mapa Brasil
*   Rankings & Impacto
*   Calculadora
*   Meu Perfil
*   Institucional

*Toda ação deve resultar em feedback visual imediato.*

## 5. Contrato Funcional de Botões

### 5.1 Consultar Registros Públicos
**Ação:**
*   Abre tela de busca global
*   Filtros avançados
*   Cards clicáveis

**Resultado:**
*   Página pública do registro

### 5.2 Acompanhar Projeto
**Usuário logado:**
*   Salva projeto
*   Badge "Acompanhando"

**Usuário não logado:**
*   CTA para login

### 5.3 Denunciar Anomalia
*   Público e anônimo
*   Modal estruturado
*   Geração de protocolo

### 5.4 Ver na Blockchain
*   Abre explorer oficial
*   Nova aba
*   Aviso de imutabilidade

## 6. Histórico de MRCA
*Substitui o termo genérico "Diário Oficial Ambiental".*

**Função:**
*   Linha do tempo cronológica
*   Eventos on-chain
*   Filtros por tipo, estado, entidade
*   Links diretos para blockchain

## 7. Rankings & Impacto

**Certificadoras**
*   Projetos ativos
*   Volume total (tCO₂e)
*   Períodos: mensal, trimestral, anual

**Empresas**
*   Volume compensado
*   Progresso vs meta estimada

**Auditores**
*   Projetos auditados
*   Reputação
*   Histórico de assinaturas

## 8. Mapa de Calor – Brasil (MVP)
**Escopo inicial:**
*   Apenas Brasil
*   Visualização por estado

**Legenda:**
*   Vermelho: até 10 tCO₂e
*   Amarelo: 100+ tCO₂e
*   Verde: meta atingida

*Municípios e mapa global entram em fases futuras.*

## 9. Calculadora de Emissões
**Base:**
*   GHG Protocol

**Função:**
*   Estimativa precisa
*   Dados configuráveis
*   Base para metas

*Não obrigatória para uso da plataforma, mas incentivada.*

## 10. NFT de Compensação (Burn)
**Toda compensação gera:**
*   NFT não transferível
*   Troféu público no perfil
*   Evento no feed

**Função:**
*   Reputação
*   Prova social
*   Transparência

## 11. Padrão UI/UX (Obrigatório)
*   Grid consistente
*   Espaçamento amplo
*   Tipografia institucional
*   Microinterações suaves
*   Nada de ruído visual
*   Estética: premium, governamental, confiável.

## 12. Princípios Não Negociáveis
*   Nada acontece fora da blockchain
*   Nenhuma publicação manual
*   Tudo gera evento
*   Transparência acima de marketing
*   Segurança acima de velocidade

## 13. Status
*Documento oficial para execução técnica. Qualquer alteração deve gerar nova versão.*

**Blueprint SINARCA v1.0 – Aprovado para desenvolvimento**
