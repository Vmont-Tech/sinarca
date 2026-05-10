# SINARCA: Sistema Nacional de Rastreabilidade de Créditos Ambientais
## Documento 5: Fluxos de Negócio e Casos de Uso

### 1. Introdução

Este documento descreve os principais fluxos de negócio e os casos de uso detalhados do Sistema Nacional de Rastreabilidade de Créditos Ambientais (SINARCA). **É crucial destacar que o SINARCA atua como uma camada de segurança extra e complementar, projetada para fortalecer o mercado de créditos de carbono voluntários, sem substituir as metodologias de validação e mensuração já existentes ou confrontar regulamentações e instituições estabelecidas.** O objetivo é fornecer uma compreensão clara das interações entre os diferentes atores do sistema e as funcionalidades que o SINARCA oferece para gerenciar o ciclo de vida dos créditos ambientais, desde a demarcação de projetos até a aposentadoria dos créditos, sempre em conformidade com as leis e normas vigentes.

### 2. Atores do Sistema

Os principais atores que interagem com o SINARCA são:

*   **Produtor:** Proprietário da terra onde o projeto de conservação está localizado.
*   **Certificadora:** Entidade responsável por certificar projetos e validar a geração de créditos.
*   **Auditor:** Profissional que realiza inspeções em campo para verificar a integridade dos projetos.
*   **Comprador (Empresa/Cidadão):** Entidade ou indivíduo que adquire créditos ambientais para compensar emissões.
*   **Sistema (SINARCA):** Representa as funcionalidades automatizadas e a lógica de negócio do sistema.

### 3. Fluxos de Negócio

#### 3.1. Fluxo de Registro e Demarcação de Projeto

**Objetivo:** Registrar um novo projeto de conservação no SINARCA e demarcar sua área física.

**Atores:** Produtor, Certificadora, Sistema.

**Passos:**

1.  **Produtor** e **Certificadora** instalam as Tags NFC 424 DNA (QTAGs) nos limites da área do projeto. [1]
2.  A **Certificadora** utiliza o aplicativo móvel do SINARCA para ler as QTAGs, coletando as coordenadas geográficas (latitude e longitude) de cada tag. [1]
3.  O aplicativo móvel envia as coordenadas e o CMAC (Cipher-based Message Authentication Code) gerado pela QTAG para o **Sistema**.
4.  O **Sistema** valida a autenticidade do CMAC da QTAG utilizando a chave mestra correspondente. [2]
5.  O **Sistema** cria uma cerca virtual (geofencing) da área do projeto com base nas coordenadas das QTAGs. [1]
6.  O **Sistema** utiliza imagens de satélite Sentinel-2 para gerar um hash inicial da área, identificando aproximadamente 5000 pontos dentro dela. [1] [3]
7.  O **Sistema** registra o projeto, as coordenadas das QTAGs, a cerca virtual e o hash inicial no banco de dados.
8.  O **Sistema** notifica o **Produtor** e a **Certificadora** sobre o registro bem-sucedido do projeto.

**Casos de Uso:**

*   **CU3.1.1 - Registrar Novo Projeto:** Permite que uma certificadora inicie o processo de registro de um novo projeto, associando-o a um produtor e fornecendo informações básicas.
*   **CU3.1.2 - Demarcar Área com NFC:** Permite que a certificadora utilize o aplicativo móvel para ler as Tags NFC e enviar as coordenadas e o CMAC para o sistema.
*   **CU3.1.3 - Validar Autenticidade da Tag NFC:** O sistema verifica a validade do CMAC da Tag NFC para garantir que não houve clonagem ou falsificação.
*   **CU3.1.4 - Gerar Cerca Virtual e Hash Inicial:** O sistema processa as coordenadas para criar a representação geográfica da área e seu hash de referência.

#### 3.2. Fluxo de Monitoramento Contínuo e Detecção de Anomalias

**Objetivo:** Monitorar continuamente a área do projeto para detectar desmatamento, queimadas ou outras anomalias.

**Atores:** Sistema, Certificadora, Produtor.

**Passos:**

1.  O Sistema (via um scheduler) periodicamente adquire novas imagens de satélite Sentinel-2 para as áreas de projetos ativos, **complementando as verificações de campo e as metodologias de monitoramento existentes.** [3]
2.  O **Sistema** processa as imagens, calcula o NDVI (Normalized Difference Vegetation Index) e gera um hash atual da área. [3]
3.  O **Sistema** compara o hash atual e o NDVI com o hash inicial e os dados históricos para detectar anomalias (desmatamento, queimadas). [1]
4.  Se uma anomalia for detectada, o Sistema automaticamente bloqueia o projeto para comercialização de créditos, **acionando um processo de auditoria que complementa as validações das certificadoras.** [1]
5.  O **Sistema** notifica a **Certificadora** e o **Produtor** sobre o incidente e o bloqueio do projeto, solicitando uma auditoria em campo. [1]

**Casos de Uso:**

*   **CU3.2.1 - Adquirir Imagens de Satélite:** O sistema se conecta à API do Copernicus para obter dados Sentinel-2.
*   **CU3.2.2 - Processar Imagens e Calcular NDVI:** O sistema executa algoritmos de IA para analisar as imagens e calcular o NDVI.
*   **CU3.2.3 - Detectar Anomalias:** O sistema compara os dados atuais com os de referência para identificar desmatamento ou queimadas.
*   **CU3.2.4 - Bloquear Projeto Automaticamente:** Em caso de anomalia, o sistema altera o status do projeto para bloqueado.
*   **CU3.2.5 - Notificar Partes Interessadas:** O sistema envia alertas para a certificadora e o produtor sobre o incidente.

#### 3.3. Fluxo de Auditoria em Campo e Recálculo de Créditos

**Objetivo:** Verificar a situação do projeto após um incidente e recalcular o potencial de créditos.

**Atores:** Auditor, Certificadora, Sistema, Produtor.

**Passos:**

1.  A **Certificadora** designa um **Auditor** para inspecionar o projeto bloqueado.
2.  O **Auditor** utiliza o aplicativo móvel do SINARCA para realizar a inspeção em campo.
3.  O **Auditor** coleta evidências (fotos, vídeos), preenche o laudo e assina digitalmente com biometria e geolocalização. [1]
4.  O aplicativo móvel envia o laudo e a assinatura digital para o **Sistema**.
5.  O **Sistema** valida a assinatura digital do **Auditor** e armazena o laudo da auditoria.
6.  A Certificadora acessa o laudo via interface web do SINARCA e recalcula o potencial de geração de créditos com base no relatório do auditor, **reafirmando o papel da certificadora na mensuração e validação, com o SINARCA fornecendo a ferramenta de rastreabilidade e segurança.** [1]
7.  A **Certificadora** submete o novo valor de créditos ao **Sistema**.
8.  O **Sistema** atualiza a quantidade de créditos do projeto e, se aplicável, ajusta a quantidade de tokens na blockchain (e.g., *burn* de tokens excedentes ou *mint* de novos tokens se houver recuperação). [1]
9.  O **Sistema** altera o status do projeto para liberado (ou outro status apropriado) e notifica o **Produtor** e a **Certificadora**.

**Casos de Uso:**

*   **CU3.3.1 - Realizar Auditoria em Campo:** O auditor utiliza o aplicativo para registrar os achados da inspeção.
*   **CU3.3.2 - Assinar Laudo Digitalmente:** O auditor autentica o laudo com biometria e geolocalização.
*   **CU3.3.3 - Validar Laudo de Auditoria:** O sistema verifica a integridade e autenticidade do laudo e da assinatura.
*   **CU3.3.4 - Recalcular Créditos:** A certificadora ajusta a quantidade de créditos do projeto após a auditoria.
*   **CU3.3.5 - Liberar Projeto:** O sistema reativa o projeto para comercialização com a nova quantidade de créditos.

#### 3.4. Fluxo de Tokenização e Comercialização de Créditos

**Objetivo:** Emitir, disponibilizar e comercializar os créditos ambientais como tokens na Ledger Distribuído.

**Atores:** Certificadora, Comprador, Sistema.

**Passos:**

1.  Após a validação inicial ou recálculo, a **Certificadora** aprova a emissão de créditos para um projeto via interface web do SINARCA.
2.  O Sistema interage com a Ledger Distribuído (via Smart Contracts) para emitir (Mint) os tokens correspondentes à quantidade de créditos aprovada, **garantindo a rastreabilidade e a imutabilidade da comercialização, sem interferir na metodologia de aprovação da certificadora.** [1] [4]
3.  Os tokens são registrados como disponíveis no marketplace do **Sistema**.
4.  O **Comprador** acessa o marketplace do SINARCA e visualiza os projetos e créditos disponíveis em um mapa do Brasil. [1]
5.  O **Comprador** seleciona a quantidade de créditos desejada e realiza a compra.
6.  O **Sistema** processa a transação de compra e transfere os tokens da carteira do projeto para a carteira do **Comprador** na Ledger Distribuído. [1]
7.  O **Sistema** registra a transação de compra no banco de dados e notifica o **Comprador**.

**Casos de Uso:**

*   **CU3.4.1 - Emitir Tokens (Mint):** O sistema cria novos tokens na Ledger Distribuído representando os créditos ambientais.
*   **CU3.4.2 - Listar Créditos no Marketplace:** O sistema exibe os créditos disponíveis para compra, com detalhes do projeto.
*   **CU3.4.3 - Comprar Créditos:** O comprador seleciona e adquire tokens de créditos ambientais.
*   **CU3.4.4 - Transferir Tokens:** O sistema move os tokens do vendedor para o comprador na blockchain.

#### 3.5. Fluxo de Aposentadoria de Créditos (Burn)

**Objetivo:** Retirar os créditos ambientais de circulação após serem utilizados para compensação.

**Atores:** Comprador, Sistema.

**Passos:**

1.  O **Comprador** decide aposentar os créditos que possui em sua carteira, indicando a finalidade da compensação via interface web do SINARCA.
2.  O **Sistema** interage com a Ledger Distribuído (via Smart Contracts) para queimar (Burn) os tokens correspondentes. [1] [4]
3.  O **Sistema** registra a aposentadoria do crédito no banco de dados, incluindo o hash da transação de *burn*.
4.  O **Sistema** notifica o **Comprador** sobre a aposentadoria bem-sucedida dos créditos.

**Casos de Uso:**

*   **CU3.5.1 - Aposentar Créditos (Burn):** O comprador inicia o processo de queima dos tokens para compensação.
*   **CU3.5.2 - Registrar Aposentadoria:** O sistema marca os créditos como aposentados e registra a transação na blockchain.

### 4. Referências

[1] Informações fornecidas pelo usuário na descrição do projeto SINARCA.
[2] NTAG 424 DNA / 424 DNA TagTamper - Advanced security and privacy for trusted IoT applications. NXP Semiconductors. Disponível em: [https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER)
[3] Deforestation Monitoring using Sentinel 2 and xarray – Documentation. Copernicus Data Space Ecosystem. Disponível em: [https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html)
[4] Smart Contracts | Smart Contracts Platform on Blockchain. Blockchain. Disponível em: [https://stellar.org/soroban](https://stellar.org/soroban)
