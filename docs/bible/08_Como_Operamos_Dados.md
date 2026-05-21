# SINARCA: Sistema Nacional de Rastreabilidade de Créditos Ambientais
## Documento 8: Como Operamos Dados?

### 1. Introdução

No SINARCA, a operação de dados é um pilar fundamental para garantir a integridade, a transparência e a segurança do mercado de créditos ambientais. **É importante ressaltar que a operação de dados do SINARCA é projetada para atuar como uma camada de segurança extra e complementar, sem substituir as metodologias de validação e mensuração de créditos já existentes no mercado.** Este documento detalha as políticas e práticas que regem a coleta, o processamento, o armazenamento e o uso dos dados dentro do sistema, em conformidade com as regulamentações vigentes e as melhores práticas de governança de dados. Nosso compromisso é com a proteção da privacidade, a segurança da informação e a utilização ética dos dados para promover um impacto ambiental positivo, **sempre em estrita observância das leis e normas vigentes e sem confrontar instituições estabelecidas.**

### 2. Princípios de Governança de Dados

O SINARCA adota os seguintes princípios para a governança de dados:

*   **Legalidade, Finalidade e Transparência:** Todos os dados são coletados e processados para propósitos legítimos e específicos, com total transparência sobre seu uso e em conformidade com a legislação aplicável, como a Lei Geral de Proteção de Dados (LGPD) no Brasil e o General Data Protection Regulation (GDPR) na Europa. [1] [2]
*   **Minimização de Dados:** Coletamos apenas os dados estritamente necessários para a execução de nossas operações e para o cumprimento de nossos objetivos.
*   **Qualidade dos Dados:** Empregamos esforços contínuos para garantir que os dados sejam precisos, completos e atualizados.
*   **Segurança e Confidencialidade:** Implementamos medidas de segurança robustas para proteger os dados contra acesso não autorizado, perda, alteração ou destruição.
*   **Responsabilização:** Somos responsáveis pelas operações de tratamento de dados e demonstramos conformidade com as leis de proteção de dados.

### 3. Tipos de Dados Coletados

O SINARCA coleta diferentes categorias de dados, essenciais para o funcionamento do sistema:

#### 3.1. Dados de Identificação e Cadastro

*   **Usuários (Produtores, Certificadoras, Auditores, Compradores):** Nome completo, CPF/CNPJ, endereço de e-mail, telefone, endereço físico, informações de registro profissional (para certificadoras e auditores). Estes são considerados **dados pessoais** quando vinculados a indivíduos. [1]

#### 3.2. Dados Geoespaciais e de Monitoramento

*   **Coordenadas NFC:** Latitude e longitude coletadas pelas Tags NFC 424 DNA nos limites dos projetos. [3]
*   **Cercas Virtuais (Geofencing):** Geometrias que delimitam as áreas dos projetos.
*   **Imagens de Satélite:** Dados brutos e processados do Sentinel-2 (Copernicus) para monitoramento ambiental. [4]
*   **Hashes de Área:** Identificadores únicos gerados por IA para as áreas dos projetos, refletindo seu estado ambiental.
*   **Dados de Auditoria:** Geolocalização do auditor no momento da inspeção, evidências fotográficas/vídeos e laudos textuais.

#### 3.3. Dados de Transação e Blockchain

*   **Informações de Créditos:** Quantidade, unidade (tCO2e), status (disponível, aposentado).
*   **Transações na Blockchain:** Hashes de transação (mint, transfer, burn), endereços de carteira (públicos), valores transacionados. [5]
*   **Dados de Marketplace:** Histórico de compras e vendas de créditos.

### 4. Como os Dados são Utilizados

Os dados coletados pelo SINARCA são utilizados para as seguintes finalidades:

*   **Registro e Gestão de Projetos:** Para cadastrar e gerenciar projetos de conservação, incluindo a demarcação de áreas e a associação a produtores e certificadoras.
*   **Monitoramento Ambiental:** Para realizar o monitoramento contínuo das áreas de projeto via satélite e IA, detectando desmatamento ou queimadas.
*   **Validação e Autenticação:** Para validar a autenticidade das Tags NFC e as assinaturas digitais biométricas dos auditores, **complementando os processos de verificação das certificadoras.**
*   **Emissão e Rastreabilidade de Créditos:** Para tokenizar créditos ambientais na Ledger Distribuído, rastrear sua titularidade e gerenciar seu ciclo de vida (mint, transfer, burn), **fornecendo uma camada de segurança e rastreabilidade adicional à comercialização dos créditos.**
*   **Operação do Marketplace:** Para facilitar a compra e venda de créditos ambientais por empresas e cidadãos.
*   **Auditoria e Compliance:** Para suportar processos de auditoria, garantir a conformidade com regulamentações e prevenir fraudes, **atuando como um mecanismo de verificação independente e complementar aos processos existentes.**
*   **Melhoria do Sistema:** Para analisar padrões de uso, identificar áreas de melhoria e desenvolver novas funcionalidades.

### 5. Segurança dos Dados

Implementamos medidas de segurança técnicas e organizacionais avançadas para proteger os dados:

*   **Criptografia:** Utilização de criptografia pós-quântica (NIST PQC-2024) para dados em trânsito e em repouso, protegendo contra ameaças atuais e futuras. [2]
*   **Controle de Acesso:** Acesso restrito aos dados com base no princípio do menor privilégio e autenticação multifator (MFA) para todos os usuários.
*   **Anonimização e Pseudonimização:** Sempre que possível, dados pessoais são anonimizados ou pseudonimizados para reduzir riscos de privacidade.
*   **Auditorias de Segurança:** Realização periódica de auditorias de segurança, testes de penetração e varreduras de vulnerabilidade.
*   **Proteção de Chaves:** Armazenamento seguro de chaves criptográficas em Hardware Security Modules (HSM) ou serviços de gerenciamento de chaves (KMS).

### 6. Compartilhamento de Dados

O SINARCA compartilha dados apenas nas seguintes circunstâncias e com as devidas salvaguardas:

*   **Com Parceiros e Prestadores de Serviço:** Dados podem ser compartilhados com parceiros tecnológicos (e.g., provedores de serviços de nuvem, APIs de satélite) estritamente para a operação do sistema, sob contratos que garantem a proteção dos dados.
*   **Com Autoridades Legais:** Em resposta a solicitações legais válidas ou para cumprir obrigações regulatórias.
*   **Dados Públicos da Blockchain:** Informações de transações na Ledger Distribuído são inerentemente públicas e transparentes. No entanto, dados pessoais sensíveis não são armazenados diretamente na blockchain. [5]
*   **Dados Agregados e Anonimizados:** Dados podem ser compartilhados de forma agregada e anonimizada para fins de pesquisa, relatórios de mercado ou demonstração de impacto ambiental, sem identificar indivíduos.

### 7. Retenção de Dados

Os dados são retidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, incluindo obrigações legais, regulatórias e contratuais. Após esse período, os dados são descartados de forma segura ou anonimizados permanentemente.

### 8. Direitos dos Titulares dos Dados

Em conformidade com a LGPD e o GDPR, os titulares dos dados possuem os seguintes direitos em relação aos seus dados pessoais:

*   **Direito de Acesso:** Obter confirmação sobre o tratamento de seus dados e acesso a eles.
*   **Direito de Retificação:** Solicitar a correção de dados incompletos, inexatos ou desatualizados.
*   **Direito de Exclusão (Direito ao Esquecimento):** Solicitar a exclusão de seus dados pessoais, salvo exceções legais. É importante notar que dados registrados na blockchain são imutáveis, mas dados pessoais vinculados a eles no sistema off-chain podem ser excluídos ou anonimizados.
*   **Direito à Portabilidade:** Receber seus dados pessoais em um formato estruturado e de uso comum.
*   **Direito de Oposição:** Opor-se ao tratamento de seus dados em determinadas circunstâncias.
*   **Direito de Revogar o Consentimento:** Retirar o consentimento a qualquer momento, sem afetar a legalidade do tratamento realizado antes da revogação.

Para exercer esses direitos, os titulares podem entrar em contato com o Encarregado de Dados (DPO) do SINARCA através dos canais de comunicação disponíveis em nossa Política de Privacidade.

### 9. Referências

[1] Lei Geral de Proteção de Dados Pessoais (LGPD) - Lei nº 13.709/2018.
[2] General Data Protection Regulation (GDPR) - Regulation (EU) 2016/679.
[3] NTAG 424 DNA / 424 DNA TagTamper - Advanced security and privacy for trusted IoT applications. NXP Semiconductors. Disponível em: [https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications:NTAG424DNA_TAGTAMPER)
[4] Deforestation Monitoring using Sentinel 2 and xarray – Documentation. Copernicus Data Space Ecosystem. Disponível em: [https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html](https://documentation.dataspace.copernicus.eu/notebook-samples/sentinelhub/deforestation_monitoring_with_xarray.html)
[5] Smart Contracts | Smart Contracts Platform on Blockchain. Blockchain. Disponível em: [https://stellar.org/soroban](https://stellar.org/soroban)
