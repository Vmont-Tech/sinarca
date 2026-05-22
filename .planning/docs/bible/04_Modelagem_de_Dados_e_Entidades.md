# SINARCA: Sistema Nacional de Rastreabilidade de Créditos Ambientais
## Documento 4: Modelagem de Dados e Entidades

### 1. Introdução

Este documento detalha a modelagem de dados e as principais entidades do Sistema Nacional de Rastreabilidade de Créditos Ambientais (SINARCA). **É importante ressaltar que a estrutura de dados foi projetada para suportar o papel do SINARCA como uma camada de segurança extra e complementar, integrando-se com as informações provenientes das metodologias de validação e mensuração de créditos já existentes no mercado, sem substituí-las.** A modelagem de dados é fundamental para organizar e estruturar as informações de forma eficiente, garantindo a integridade, consistência e rastreabilidade dos dados em todo o sistema. A abordagem visa suportar as operações transacionais do backend e a integração com a Ledger Distribuído, sempre em conformidade com as leis e normas vigentes.

### 2. Entidades Principais

As principais entidades do SINARCA refletem os atores e os componentes tecnológicos envolvidos no processo de rastreabilidade de créditos ambientais.

#### 2.1. Usuário (User)

Representa qualquer indivíduo ou organização que interage com o sistema SINARCA. Pode ser um Produtor, Certificadora, Auditor, Comprador (Empresa/Cidadão) ou Administrador.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único do usuário. | PK, Não Nulo | |
| `nome` | VARCHAR(255) | Nome completo ou razão social do usuário. | Não Nulo | |
| `email` | VARCHAR(255) | Endereço de e-mail do usuário. | Não Nulo, Único | |
| `senha_hash` | VARCHAR(255) | Hash da senha do usuário. | Não Nulo | |
| `tipo_usuario` | ENUM | Tipo de usuário (Produtor, Certificadora, Auditor, Comprador, Admin). | Não Nulo | |
| `cpf_cnpj` | VARCHAR(14) | CPF ou CNPJ do usuário. | Único | |
| `endereco` | TEXT | Endereço completo do usuário. | | |
| `telefone` | VARCHAR(20) | Telefone de contato. | | |
| `data_cadastro` | TIMESTAMP | Data e hora do cadastro do usuário. | Não Nulo | |
| `ativo` | BOOLEAN | Indica se o usuário está ativo no sistema. | Não Nulo, Default: TRUE | |

#### 2.2. Produtor (Producer)

Representa o proprietário da terra onde o projeto de conservação está localizado.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único do produtor. | PK, Não Nulo | FK para `User.id` |
| `id_usuario` | UUID | Referência ao usuário associado. | FK, Não Nulo | `User` (1:1) |

#### 2.3. Certificadora (Certifier)

Organização responsável por certificar os projetos e validar a geração de créditos ambientais.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único da certificadora. | PK, Não Nulo | FK para `User.id` |
| `id_usuario` | UUID | Referência ao usuário associado. | FK, Não Nulo | `User` (1:1) |
| `registro_licenca` | VARCHAR(50) | Número de registro ou licença da certificadora. | Único | |

#### 2.4. Auditor (Auditor)

Profissional responsável por realizar auditorias em campo e verificar a integridade dos projetos.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único do auditor. | PK, Não Nulo | FK para `User.id` |
| `id_usuario` | UUID | Referência ao usuário associado. | FK, Não Nulo | `User` (1:1) |
| `registro_profissional` | VARCHAR(50) | Número de registro profissional do auditor. | Único | |
| `chave_biometrica` | TEXT | Chave pública ou hash da biometria do auditor. | | |

#### 2.5. Projeto (Project)

Representa uma área de conservação que gera créditos ambientais, **complementando as informações e validações das metodologias de certificação existentes.**

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único do projeto. | PK, Não Nulo | |
| `nome` | VARCHAR(255) | Nome do projeto. | Não Nulo | |
| `descricao` | TEXT | Descrição detalhada do projeto. | | |
| `id_produtor` | UUID | Referência ao produtor responsável. | FK, Não Nulo | `Producer` (N:1) |
| `id_certificadora` | UUID | Referência à certificadora do projeto. | FK, Não Nulo | `Certifier` (N:1) |
| `area_hectares` | DECIMAL(10,2) | Área total do projeto em hectares. | Não Nulo | |
| `status` | ENUM | Status atual do projeto (Ativo, Bloqueado, Auditado, Finalizado). | Não Nulo, Default: Ativo | |
| `hash_area_inicial` | VARCHAR(255) | Hash inicial da área gerado pela IA. | Não Nulo | |
| `cerca_virtual_geojson` | JSONB | Geometria da cerca virtual em formato GeoJSON. | Não Nulo | |
| `data_inicio` | DATE | Data de início do projeto. | Não Nulo | |
| `data_fim_prevista` | DATE | Data prevista para o fim do projeto. | | |
| `data_bloqueio` | TIMESTAMP | Data e hora do bloqueio do projeto (se aplicável). | | |
| `motivo_bloqueio` | TEXT | Motivo do bloqueio do projeto. | | |

#### 2.6. Tag NFC (NfcTag)

Representa uma Tag NFC 424 DNA utilizada para demarcar o território do projeto.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único da tag. | PK, Não Nulo | |
| `id_projeto` | UUID | Referência ao projeto associado. | FK, Não Nulo | `Project` (N:1) |
| `uid_nfc` | VARCHAR(32) | UID (Unique Identifier) da Tag NFC. | Não Nulo, Único | |
| `latitude` | DECIMAL(9,6) | Latitude da localização da tag. | Não Nulo | |
| `longitude` | DECIMAL(9,6) | Longitude da localização da tag. | Não Nulo | |
| `data_instalacao` | TIMESTAMP | Data e hora da instalação da tag. | Não Nulo | |
| `chave_mestra_hash` | VARCHAR(255) | Hash da chave mestra usada para validar o CMAC da tag. | Não Nulo | |

#### 2.7. Dados de Satélite (SatelliteData)

Armazena informações sobre as imagens de satélite processadas para cada projeto.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único dos dados de satélite. | PK, Não Nulo | |
| `id_projeto` | UUID | Referência ao projeto. | FK, Não Nulo | `Project` (N:1) |
| `data_imagem` | DATE | Data da aquisição da imagem de satélite. | Não Nulo | |
| `url_imagem_bruta` | TEXT | URL para a imagem de satélite bruta (se armazenada externamente). | | |
| `ndvi_medio` | DECIMAL(5,4) | Valor médio do NDVI para a área do projeto na data da imagem. | | |
| `hash_area_atual` | VARCHAR(255) | Hash da área gerado pela IA na data da imagem. | | |
| `anomalia_detectada` | BOOLEAN | Indica se uma anomalia (desmatamento/queimada) foi detectada. | Default: FALSE | |
| `detalhes_anomalia` | TEXT | Descrição da anomalia detectada. | | |

#### 2.8. Crédito Ambiental (EnvironmentalCredit)

Representa um crédito ambiental tokenizado na Ledger Distribuído.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único do crédito. | PK, Não Nulo | |
| `id_projeto` | UUID | Referência ao projeto que gerou o crédito. | FK, Não Nulo | `Project` (N:1) |
| `quantidade` | DECIMAL(18,8) | Quantidade de créditos (tokens). | Não Nulo | |
| `unidade` | VARCHAR(10) | Unidade do crédito (e.g., tCO2e). | Não Nulo, Default: 'tCO2e' | |
| `data_emissao` | TIMESTAMP | Data e hora da emissão (mint) do token. | Não Nulo | |
| `hash_transacao_mint` | VARCHAR(64) | Hash da transação de mint na Blockchain. | Não Nulo, Único | |
| `status_token` | ENUM | Status do token (Disponível, Em Negociação, Aposentado). | Não Nulo, Default: Disponível | |
| `data_aposentadoria` | TIMESTAMP | Data e hora da aposentadoria (burn) do token. | | |
| `hash_transacao_burn` | VARCHAR(64) | Hash da transacao de burn na Blockchain. | Único | |

#### 2.9. Transação de Crédito (CreditTransaction)

Registra todas as operações de compra e venda de créditos no marketplace.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único da transação. | PK, Não Nulo | |
| `id_credito` | UUID | Referência ao crédito ambiental transacionado. | FK, Não Nulo | `EnvironmentalCredit` (N:1) |
| `id_comprador` | UUID | Referência ao usuário comprador. | FK, Não Nulo | `User` (N:1) |
| `id_vendedor` | UUID | Referência ao usuário vendedor (Certificadora ou outro Comprador). | FK, Não Nulo | `User` (N:1) |
| `quantidade` | DECIMAL(18,8) | Quantidade de créditos transacionados. | Não Nulo | |
| `valor_unitario` | DECIMAL(10,2) | Valor unitário do crédito na transação. | Não Nulo | |
| `moeda` | VARCHAR(5) | Moeda da transação (e.g., BRL, USD). | Não Nulo, Default: 'BRL' | |
| `data_transacao` | TIMESTAMP | Data e hora da transação. | Não Nulo | |
| `hash_transacao_stellar` | VARCHAR(64) | Hash da transação na Ledger Distribuído. | Não Nulo, Único | |
| `tipo_transacao` | ENUM | Tipo de transação (Compra, Venda, Transferência, Aposentadoria). | Não Nulo | |

#### 2.10. Auditoria (Audit)

Registra os detalhes de cada auditoria realizada em um projeto.

| Campo | Tipo de Dados | Descrição | Restrições | Relacionamentos |
| :---- | :---------- | :-------- | :--------- | :-------------- |
| `id` | UUID | Identificador único da auditoria. | PK, Não Nulo | |
| `id_projeto` | UUID | Referência ao projeto auditado. | FK, Não Nulo | `Project` (N:1) |
| `id_auditor` | UUID | Referência ao auditor responsável. | FK, Não Nulo | `Auditor` (N:1) |
| `data_auditoria` | TIMESTAMP | Data e hora da realização da auditoria. | Não Nulo | |
| `latitude_auditoria` | DECIMAL(9,6) | Latitude da localização da auditoria. | Não Nulo | |
| `longitude_auditoria` | DECIMAL(9,6) | Longitude da localização da auditoria. | Não Nulo | |
| `laudo_texto` | TEXT | Texto do laudo da auditoria. | Não Nulo | |
| `evidencias_url` | JSONB | URLs para evidências (fotos, vídeos) da auditoria. | | |
| `status_projeto_pos_auditoria` | ENUM | Status do projeto após a auditoria (Liberado, Bloqueado, Recalculado). | Não Nulo | |
| `assinatura_digital` | TEXT | Assinatura digital do auditor (hash da biometria + dados do laudo). | Não Nulo | |

### 3. Considerações sobre a Blockchain

Os dados relacionados à blockchain (hashes de transação, status de tokens) serão armazenados no banco de dados relacional para facilitar consultas e integrações com o backend. No entanto, a fonte da verdade para a imutabilidade e rastreabilidade desses dados será sempre a própria rede Blockchain. Os *smart contracts* (Smart Contracts) serão responsáveis por gerenciar a lógica de emissão, transferência e queima dos tokens, garantindo a consistência entre o estado do sistema e o estado da blockchain.

### 4. Referências

[1] Informações fornecidas pelo usuário na descrição do projeto SINARCA.
[2] NTAG 424 DNA / 424 DNA TagTamper - Advanced security and privacy for trusted IoT applications. NXP Semiconductors. Disponível em: [https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER)
[3] Deforestation Monitoring using Sentinel 2 and xarray – Documentation. Copernicus Data Space Ecosystem. Disponível em: [https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html)
[4] Smart Contracts | Smart Contracts Platform on Blockchain. Blockchain. Disponível em: [https://stellar.org/soroban](https://stellar.org/soroban)
