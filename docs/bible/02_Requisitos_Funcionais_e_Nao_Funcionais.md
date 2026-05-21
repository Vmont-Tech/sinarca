# SINARCA: Sistema Nacional de Rastreabilidade de Créditos Ambientais
## Documento 2: Requisitos Funcionais e Não Funcionais

### 1. Introdução

Este documento detalha os requisitos funcionais e não funcionais para o desenvolvimento do Sistema Nacional de Rastreabilidade de Créditos Ambientais (SINARCA). **É fundamental reiterar que o SINARCA atua como uma camada de segurança extra e complementar, não substituindo as metodologias de validação e mensuração de créditos já existentes no mercado, nem confrontando regulamentações ou instituições estabelecidas.** Os requisitos funcionais descrevem as funcionalidades que o sistema deve oferecer aos seus usuários para garantir a comercialização segura dos créditos no mercado voluntário, enquanto os requisitos não funcionais especificam critérios de qualidade, desempenho, segurança e outras características operacionais do sistema, sempre em conformidade com as leis e normas vigentes.

### 2. Requisitos Funcionais

Os requisitos funcionais do SINARCA são categorizados pelos principais módulos e interações do sistema.

#### 2.1. Módulo de Registro e Demarcação de Projetos

*   **RF1.1 - Registro de Produtor/Certificadora:** O sistema deve permitir que produtores e certificadoras se cadastrem, fornecendo informações relevantes para a identificação e validação, **atuando como um parceiro tecnológico para agregar segurança e transparência aos seus processos já existentes.** [1]
*   **RF1.2 - Registro de Projeto:** O sistema deve permitir o registro de novos projetos de conservação, associando-os a uma certificadora e a um produtor, **complementando as informações já validadas pelas metodologias de certificação.** [1]
*   **RF1.3 - Coleta de Coordenadas NFC:** O sistema deve ser capaz de receber e processar as coordenadas geográficas (latitude e longitude) coletadas in loco pelas Tags NFC 424 DNA. [1]
*   **RF1.4 - Criação de Cerca Virtual (Geofencing):** Com base nas coordenadas das Tags NFC, o sistema deve criar automaticamente uma cerca virtual que delimita a área do projeto. [1]
*   **RF1.5 - Geração de Hash de Área:** O sistema deve gerar um hash único para a área demarcada, identificando aproximadamente 5000 pontos dentro dela, para monitoramento futuro. [1]
*   **RF1.6 - Validação de Autenticidade NFC:** O sistema deve validar a autenticidade das Tags NFC 424 DNA utilizando o mecanismo SUN (Secure Unique NFC) e chaves mestras para verificar o CMAC (Cipher-based Message Authentication Code) a cada leitura. [2]

#### 2.2. Módulo de Monitoramento e Detecção de Anomalias

*   **RF2.1 - Aquisição de Imagens de Satélite:** O sistema deve integrar-se com a API do Copernicus (Sentinel-2) para adquirir imagens de satélite da área do projeto. [3]
*   **RF2.2 - Cálculo de NDVI:** O sistema deve calcular o Índice de Vegetação por Diferença Normalizada (NDVI) para a área do projeto, utilizando as bandas B08 (NIR) e B04 (Red) das imagens Sentinel-2. [3]
*   **RF2.3 - Detecção Automática de Desmatamento/Queimada:** A inteligência artificial do sistema deve analisar o NDVI e outras métricas para detectar automaticamente incidentes de desmatamento ou queimada, **fornecendo uma camada de monitoramento contínuo que complementa as auditorias periódicas.** [1]
*   **RF2.4 - Bloqueio Automático de Projeto:** Em caso de detecção de incidente, o sistema deve bloquear automaticamente o projeto para comercialização de créditos. [1]
*   **RF2.5 - Notificação de Incidente:** O sistema deve notificar a certificadora e o produtor sobre o bloqueio do projeto e a necessidade de auditoria. [1]

#### 2.3. Módulo de Auditoria e Recálculo de Créditos

*   **RF3.1 - Registro de Auditoria em Campo:** O sistema deve permitir que auditores registrem os resultados de suas inspeções em campo. [1]
*   **RF3.2 - Autenticação de Auditor:** O auditor deve autenticar-se no sistema utilizando assinatura digital biométrica e geolocalizada, atrelando seu CPF ao laudo. [1]
*   **RF3.3 - Recálculo de Potencial de Crédito:** A certificadora deve ser capaz de recalcular o potencial de geração de créditos após um incidente, com base no laudo da auditoria. [1]
*   **RF3.4 - Liberação de Projeto:** Após o recálculo e validação pela certificadora, o sistema deve permitir a liberação do projeto com a nova quantidade de créditos. [1]

#### 2.4. Módulo de Tokenização e Blockchain

*   **RF4.1 - Emissão (Mint) de Tokens:** O sistema deve interagir com a Ledger Distribuído (via Smart Contracts) para emitir tokens de créditos ambientais, representando a quantidade de créditos informada pela certificadora, **sempre com base nas validações e mensurações realizadas pelas metodologias existentes no mercado.** [1] [4]
*   **RF4.2 - Transferência de Tokens:** O sistema deve permitir a transferência de tokens entre carteiras na Ledger Distribuído. [1]
*   **RF4.3 - Aposentadoria (Burn) de Tokens:** O sistema deve executar o processo de *burn* dos tokens na Ledger Distribuído quando um crédito é utilizado para compensação. [1]
*   **RF4.4 - Rastreabilidade de Transações:** Todas as transações de tokens devem ser registradas na Ledger Distribuído, garantindo rastreabilidade e transparência. [1]

#### 2.5. Módulo de Marketplace

*   **RF5.1 - Visualização de Projetos no Mapa:** O sistema deve exibir um mapa do Brasil com a localização (ponto) de cada projeto registrado, baseado nas coordenadas das Tags NFC. [1]
*   **RF5.2 - Listagem de Créditos Disponíveis:** O marketplace deve listar os créditos ambientais disponíveis para compra, com informações detalhadas sobre o projeto. [1]
*   **RF5.3 - Compra de Créditos:** Empresas e cidadãos devem ser capazes de comprar créditos ambientais em qualquer quantidade. [1]
*   **RF5.4 - Gerenciamento de Carteira:** Os usuários devem ter uma carteira digital para visualizar e gerenciar seus tokens de créditos ambientais. [1]

### 3. Requisitos Não Funcionais

Os requisitos não funcionais definem as qualidades e restrições do sistema.

#### 3.1. Desempenho

*   **RNF3.1.1 - Tempo de Resposta:** O tempo de resposta para operações críticas (registro de tags, detecção de incidentes, emissão de tokens) deve ser inferior a 3 segundos. [1]
*   **RNF3.1.2 - Escalabilidade:** O sistema deve ser capaz de escalar para suportar um grande volume de projetos, usuários e transações na blockchain. [1]
*   **RNF3.1.3 - Processamento de Imagens:** O processamento de imagens de satélite e o cálculo de NDVI devem ser eficientes para permitir monitoramento quase em tempo real. [3]

#### 3.2. Segurança

*   **RNF3.2.1 - Proteção Criptográfica:** O sistema deve utilizar criptografia robusta para proteger dados sensíveis, incluindo algoritmos pós-quânticos (NIST PQC-2024) para proteção futura. [1]
*   **RNF3.2.2 - Autenticação Forte:** Todos os usuários (produtores, certificadoras, auditores, compradores) devem ser autenticados de forma segura, preferencialmente com múltiplos fatores (e.g., biometria para auditores). [1]
*   **RNF3.2.3 - Integridade de Dados:** Os dados armazenados e transmitidos devem garantir integridade, especialmente as informações de geolocalização e os registros na blockchain. [1]
*   **RNF3.2.4 - Prevenção de Fraudes:** O sistema deve ser projetado para prevenir fraudes, dupla contagem e *greenwashing* através da rastreabilidade e imutabilidade, **atuando como uma camada de segurança extra para a comercialização segura desses créditos no mercado voluntário.** [1]

#### 3.3. Confiabilidade

*   **RNF3.3.1 - Disponibilidade:** O sistema deve ter uma disponibilidade mínima de 99.9% para os serviços críticos (monitoramento, marketplace, blockchain). [1]
*   **RNF3.3.2 - Recuperação de Desastres:** O sistema deve possuir mecanismos de recuperação de desastres para garantir a continuidade das operações em caso de falhas. [1]
*   **RNF3.3.3 - Tolerância a Falhas:** Componentes críticos devem ser tolerantes a falhas para minimizar interrupções. [1]

#### 3.4. Usabilidade

*   **RNF3.4.1 - Interface Intuitiva:** A interface do usuário deve ser intuitiva e fácil de usar para todos os perfis de usuários. [1]
*   **RNF3.4.2 - Acessibilidade:** O sistema deve ser acessível para usuários com diferentes necessidades, seguindo padrões de acessibilidade web. [1]

#### 3.5. Manutenibilidade

*   **RNF3.5.1 - Modularidade:** O sistema deve ser construído com uma arquitetura modular para facilitar a manutenção e a evolução. [1]
*   **RNF3.5.2 - Documentação:** Todos os componentes do sistema devem ser bem documentados para facilitar a compreensão e a manutenção. [1]

#### 3.6. Compliance e Regulamentação

*   **RNF3.6.1 - Conformidade Legal:** O sistema deve estar em conformidade com todas as leis e regulamentações brasileiras e internacionais aplicáveis ao mercado de créditos ambientais, **operando estritamente no mercado de créditos voluntários e sem confrontar regulamentações ou infringir leis, normas e ou confrontar instituições já existentes.** [1]
*   **RNF3.6.2 - Auditoria Externa:** O sistema deve ser auditável por entidades externas para garantir a conformidade e a integridade dos processos. [1]

### 4. Referências

[1] Informações fornecidas pelo usuário na descrição do projeto SINARCA.
[2] NTAG 424 DNA / 424 DNA TagTamper - Advanced security and privacy for trusted IoT applications. NXP Semiconductors. Disponível em: [https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER)
[3] Deforestation Monitoring using Sentinel 2 and xarray – Documentation. Copernicus Data Space Ecosystem. Disponível em: [https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html)
[4] Smart Contracts | Smart Contracts Platform on Blockchain. Blockchain. Disponível em: [https://stellar.org/soroban](https://stellar.org/soroban)
