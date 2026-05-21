# SINARCA: Sistema Nacional de Rastreabilidade de Créditos Ambientais
## Documento 3: Arquitetura Técnica Detalhada

### 1. Introdução

Este documento descreve a arquitetura técnica detalhada do Sistema Nacional de Rastreabilidade de Créditos Ambientais (SINARCA), abordando os componentes de software e hardware, as tecnologias empregadas, os fluxos de dados e as integrações entre os módulos. **É fundamental compreender que o SINARCA atua como uma camada de segurança extra e complementar, projetada para fortalecer o mercado de créditos de carbono voluntários, sem substituir as metodologias de validação e mensuração já existentes ou confrontar regulamentações e instituições estabelecidas.** O objetivo é fornecer um guia técnico abrangente para a equipe de desenvolvimento, garantindo a consistência e a robustez da implementação, sempre em conformidade com as leis e normas vigentes.

### 2. Visão Geral da Arquitetura

A arquitetura do SINARCA é baseada em um modelo de microsserviços e APIs, com uma forte ênfase em segurança, escalabilidade e resiliência. As principais camadas de interação são:

*   **Camada de Borda (Edge Layer):** Interação física com as Tags NFC e coleta de dados primários.
*   **Camada de Processamento (Processing Layer):** Ingestão, processamento e análise de dados de satélite e NFC.
*   **Camada de Serviços (Services Layer):** Lógica de negócio, APIs, autenticação e gerenciamento de dados.
*   **Camada de Persistência (Persistence Layer):** Armazenamento de dados transacionais e imutáveis (blockchain).
*   **Camada de Apresentação (Presentation Layer):** Interfaces de usuário (Web, Mobile).

### 3. Componentes e Tecnologias

#### 3.1. Camada Física/IoT

*   **Tags NFC 424 DNA (QTAGs):**
    *   **Função:** Identificação física inviolável de áreas de projeto. Armazenam um UID (Unique Identifier) e permitem a geração de mensagens SUN (Secure Unique NFC).
    *   **Tecnologia:** NXP NTAG 424 DNA. Utiliza criptografia AES-128 para autenticação e geração de CMAC (Cipher-based Message Authentication Code) dinâmico. [1]
    *   **Interação:** Lidas por dispositivos móveis (smartphones) equipados com NFC.
*   **Dispositivos Móveis (Smartphones/Tablets):**
    *   **Função:** Leitura das Tags NFC, coleta de coordenadas GPS, captura de evidências fotográficas e envio de dados para o backend.
    *   **Tecnologia:** Aplicativo móvel nativo (Android/iOS) ou PWA (Progressive Web App) com acesso a hardware NFC e GPS.

#### 3.2. Camada de Monitoramento (Satélite/IA)

*   **Plataforma de Observação da Terra (Copernicus Data Space Ecosystem):**
    *   **Função:** Fornecimento de imagens de satélite Sentinel-2 para as áreas de projeto.
    *   **Tecnologia:** API Sentinel Hub para acesso programático a dados Sentinel-2. [2]
    *   **Dados:** Bandas espectrais B02 (Azul), B03 (Verde), B04 (Vermelho) e B08 (Infravermelho Próximo - NIR) para cálculo de NDVI.
*   **Motor de Inteligência Artificial (IA):**
    *   **Função:** Análise de imagens de satélite para detecção de desmatamento, queimadas e outras anomalias. Geração de hash de área.
    *   **Tecnologia:** Modelos de Machine Learning (e.g., redes neurais convolucionais) treinados em dados geoespaciais. Implementado em Python com bibliotecas como TensorFlow/PyTorch, scikit-learn, xarray e rioxarray para processamento de dados geoespaciais. [2]
    *   **Processamento:** Cálculo de NDVI, análise de séries temporais, detecção de mudanças e classificação de cobertura do solo.

#### 3.3. Camada de Backend (Core/Lógica de Negócio)

*   **Microsserviços:**
    *   **Função:** Modularização da lógica de negócio, como gerenciamento de usuários, projetos, auditorias, marketplace e integração com blockchain.
    *   **Tecnologia:** Linguagens de programação como Python (com frameworks como FastAPI ou Django REST Framework) ou Node.js (com Express.js). Containerização com Docker e orquestração com Kubernetes para escalabilidade e resiliência.
*   **APIs RESTful:**
    *   **Função:** Interface de comunicação entre os microsserviços, frontend e sistemas externos.
    *   **Padrões:** RESTful, JSON para troca de dados, OAuth2/JWT para autenticação e autorização.
*   **Banco de Dados Relacional (PostgreSQL):**
    *   **Função:** Armazenamento de dados transacionais, como informações de usuários, projetos, certificadoras, auditores, histórico de eventos e dados do marketplace.
    *   **Tecnologia:** PostgreSQL, escolhido pela robustez, escalabilidade e suporte a dados geoespaciais (PostGIS).
*   **Serviço de Autenticação e Autorização:**
    *   **Função:** Gerenciamento de identidades, autenticação de usuários (incluindo biometria e geolocalização para auditores) e controle de acesso baseado em papéis (RBAC).
    *   **Tecnologia:** Keycloak, Auth0 ou implementação customizada com JWT. Integração com serviços de biometria (e.g., APIs de reconhecimento facial/digital) e GPS para validação de localização.
*   **Serviço de Notificação:**
    *   **Função:** Envio de notificações (e-mail, SMS, push) para usuários sobre status de projetos, incidentes e auditorias.
    *   **Tecnologia:** Serviços de terceiros (e.g., SendGrid, Twilio, Firebase Cloud Messaging) ou implementação própria com filas de mensagens (e.g., RabbitMQ, Kafka).

#### 3.4. Camada Blockchain (Registro/Tokenização)

*   **Rede Blockchain:**
    *   **Função:** Plataforma blockchain para emissão, transferência e queima (burn) de tokens de créditos ambientais.
    *   **Tecnologia:** Blockchain Network, escolhida pela velocidade, baixo custo de transação e capacidade de emissão de ativos. [3]
*   **Smart Contracts (Smart Contracts):**
    *   **Função:** Lógica programável para automatizar o ciclo de vida dos tokens de crédito (mint, transfer, burn) e garantir a conformidade com as regras de negócio.
    *   **Tecnologia:** Smart Contracts, a plataforma de smart contracts da Blockchain, que permite a criação de contratos em Rust. [3]
*   **Integração com Blockchain:**
    *   **Função:** Conexão segura e eficiente entre o backend e a rede Blockchain.
    *   **Tecnologia:** Blockchain SDK (para Python, Node.js, etc.) para interagir com a rede Blockchain e os smart contracts do Smart Contracts.

#### 3.5. Camada de Apresentação

*   **Aplicação Web (Marketplace/Dashboard):**
    *   **Função:** Interface para produtores, certificadoras, auditores, empresas e cidadãos visualizarem projetos, comprarem créditos e acompanharem o status.
    *   **Tecnologia:** Frontend desenvolvido com React, Vue.js ou Angular. Utilização de bibliotecas de mapas (e.g., Leaflet, Mapbox GL JS) para visualização geoespacial dos projetos.
*   **Aplicativo Móvel (para Auditores/Produtores):**
    *   **Função:** Ferramenta para coleta de dados em campo, leitura de NFC, registro de auditorias e acesso a informações do projeto offline.
    *   **Tecnologia:** React Native, Flutter ou desenvolvimento nativo (Kotlin/Swift).

### 4. Fluxos de Dados e Integrações

#### 4.1. Fluxo de Registro de Projeto e Demarcação

1.  **Produtor/Certificadora** utiliza o **Aplicativo Móvel** para ler as **Tags NFC 424 DNA** in loco, coletando coordenadas e gerando o CMAC. [1]
2.  O **Aplicativo Móvel** envia as coordenadas e o CMAC para o **Microsserviço de Projetos** via **API RESTful**.
3.  O **Microsserviço de Projetos** valida o CMAC com a **Chave Mestra** (armazenada de forma segura) e armazena as coordenadas no **Banco de Dados Relacional**.
4.  O **Microsserviço de Projetos** aciona o **Motor de IA** para criar a cerca virtual e o hash inicial da área, utilizando a **API Sentinel Hub** para obter imagens Sentinel-2. [2]
5.  O **Motor de IA** retorna o hash e a cerca virtual, que são armazenados no **Banco de Dados Relacional**.

#### 4.2. Fluxo de Monitoramento e Detecção de Anomalias

1.  Um **Scheduler** (e.g., Cron Job, Kubernetes CronJob) aciona periodicamente o **Microsserviço de Monitoramento**.
2.  O **Microsserviço de Monitoramento** consulta o **Banco de Dados Relacional** para obter as áreas de projeto ativas.
3.  Para cada área, o **Microsserviço de Monitoramento** solicita novas imagens Sentinel-2 via **API Sentinel Hub** e as envia ao **Motor de IA**.
4.  O **Motor de IA** calcula o NDVI e compara com o hash inicial e séries temporais para detectar desmatamento/queimadas. [2]
5.  Se uma anomalia for detectada, o **Motor de IA** notifica o **Microsserviço de Projetos**.
6.  O **Microsserviço de Projetos** atualiza o status do projeto para 
bloqueado e o **Serviço de Notificação** é acionado para alertar a certificadora e o produtor.

#### 4.3. Fluxo de Emissão e Comercialização de Créditos

1.  A **Certificadora** aprova a emissão de créditos para um projeto validado via **Aplicação Web**.
2.  A **Aplicação Web** envia a requisição para o **Microsserviço de Projetos**.
3.  O **Microsserviço de Projetos** interage com o **Microsserviço de Blockchain**.
4.  O **Microsserviço de Blockchain** utiliza o **Blockchain SDK** para invocar o *smart contract* (Smart Contracts) de *Mint* na **Rede Blockchain**, emitindo os tokens de crédito. [3]
5.  Os detalhes da transação (hash, quantidade, etc.) são registrados no **Banco de Dados Relacional**.
6.  Os tokens ficam disponíveis no **Marketplace** da **Aplicação Web** para compra.

#### 4.4. Fluxo de Compra e Aposentadoria de Créditos

1.  **Empresa/Cidadão** seleciona créditos no **Marketplace** da **Aplicação Web** e inicia o processo de compra.
2.  A **Aplicação Web** interage com o **Microsserviço de Marketplace**.
3.  O **Microsserviço de Marketplace** processa o pagamento e aciona o **Microsserviço de Blockchain** para transferir os tokens para a carteira do comprador na **Rede Blockchain**.
4.  Quando o comprador decide aposentar o crédito, ele inicia o processo na **Aplicação Web**.
5.  A **Aplicação Web** envia a requisição para o **Microsserviço de Blockchain**.
6.  O **Microsserviço de Blockchain** invoca o *smart contract* (Smart Contracts) de *Burn* na **Rede Blockchain**, removendo os tokens de circulação. [3]
7.  O registro da aposentadoria é armazenado no **Banco de Dados Relacional** e na **Rede Blockchain**.

#### 4.5. Fluxo de Auditoria e Recálculo

1.  Após um projeto ser bloqueado, a **Certificadora** designa um **Auditor**.
2.  O **Auditor** utiliza o **Aplicativo Móvel** para realizar a inspeção em campo.
3.  O **Aplicativo Móvel** coleta a assinatura digital biométrica e geolocalizada do **Auditor** e os dados do laudo.
4.  O **Aplicativo Móvel** envia os dados do laudo para o **Microsserviço de Auditoria** via **API RESTful**.
5.  O **Microsserviço de Auditoria** valida a autenticidade do auditor e armazena o laudo no **Banco de Dados Relacional**.
6.  A **Certificadora** acessa o laudo via **Aplicação Web** e recalcula o potencial de crédito.
7.  A **Certificadora** submete o novo valor ao **Microsserviço de Projetos**.
8.  O **Microsserviço de Projetos** atualiza a quantidade de créditos e, se aplicável, aciona o **Microsserviço de Blockchain** para ajustar a quantidade de tokens (e.g., *burn* de tokens excedentes ou *mint* de novos tokens se houver recuperação).
9.  O **Microsserviço de Projetos** altera o status do projeto para liberado e o **Serviço de Notificação** informa as partes interessadas.

### 5. Considerações de Segurança

*   **Criptografia Pós-Quântica (PQC):** Implementação de algoritmos de criptografia resistentes a ataques quânticos, conforme recomendações do NIST PQC-2024, para proteger a comunicação e o armazenamento de dados sensíveis. **Nosso papel é ser o parceiro tecnológico que oferece uma camada de segurança extra para a comercialização de créditos ambientais, complementando as metodologias e instituições já existentes no mercado voluntário.** [4]
*   **Segurança das Tags NFC:** Utilização do mecanismo SUN (Secure Unique NFC) das Tags NFC 424 DNA para garantir que cada leitura seja única e autenticada criptograficamente, prevenindo clonagem e falsificação. [1]
*   **Autenticação Multifator (MFA):** Implementação de MFA para todos os usuários, com ênfase em biometria e geolocalização para auditores, garantindo a identidade e a presença física.
*   **Segurança da Blockchain:** A rede Blockchain oferece segurança inerente através de seu protocolo de consenso (FBA - Federated Byzantine Agreement), garantindo a imutabilidade e a resistência a ataques. Os *smart contracts* (Smart Contracts) serão auditados para garantir a ausência de vulnerabilidades.
*   **Proteção de Chaves:** As chaves criptográficas (incluindo a chave mestra para validação NFC e chaves da blockchain) serão armazenadas em Hardware Security Modules (HSM) ou serviços de gerenciamento de chaves (KMS) para máxima segurança.

### 6. Referências

[1] NTAG 424 DNA / 424 DNA TagTamper - Advanced security and privacy for trusted IoT applications. NXP Semiconductors. Disponível em: [https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER)
[2] Deforestation Monitoring using Sentinel 2 and xarray – Documentation. Copernicus Data Space Ecosystem. Disponível em: [https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html)
[3] Smart Contracts | Smart Contracts Platform on Blockchain. Blockchain. Disponível em: [https://stellar.org/soroban](https://stellar.org/soroban)
[4] Informações fornecidas pelo usuário na descrição do projeto SINARCA e no documento técnico. (Referência ao NIST PQC-2024)
