# PRD — Sinarca Integrity Layer
**Product:** Sinarca  
**Feature:** Integrity Layer / Fraud Prevention & Evidence Verification  
**Status:** Draft for Development  
**Priority:** P0  
**Owner:** Product / Engineering  
**Target:** MVP + incremental hardening

## 1. Context

O Sinarca recebe informações declaradas por partes interessadas, incluindo dados de propriedades, documentos, geofences, direitos territoriais, projetos ambientais e evidências relacionadas.

Esse modelo cria um risco estrutural: uma informação pode ser tecnicamente registrada de forma íntegra na blockchain, mas ser falsa em sua origem.

A blockchain garante:

- integridade;
- imutabilidade;
- autoria;
- timestamp;
- rastreabilidade.

Ela não garante, isoladamente, que o fato declarado é verdadeiro.

Exemplos de fraude que o Sinarca deve prevenir:

- documento fundiário falsificado;
- pessoa declarando ser proprietária sem possuir o direito;
- matrícula cancelada ou inválida;
- uso de CAR como prova de propriedade;
- propriedade ou projeto duplicado;
- sobreposição parcial ou integral de projetos;
- double claiming;
- projeto registrado em território público ou protegido;
- manipulação de geometria;
- documento válido associado à propriedade errada;
- contrato sem validade ou sem averbação;
- reapresentação do mesmo documento por entidades diferentes;
- alteração posterior da situação jurídica da propriedade;
- uso de procuração falsa;
- criação de múltiplas empresas para contornar controles;
- registro de um mesmo benefício ambiental em múltiplas plataformas.

---

# 2. Problema

Atualmente, informações fornecidas pelo usuário podem entrar no sistema como dados aparentemente válidos.

Precisamos mudar o conceito de:

```text
User Input → Fact
```

para:

```text
User Input → Claim → Evidence → Validation → Decision
```

Nenhuma informação crítica fornecida por uma parte interessada deve receber automaticamente status de verificada.

---

# 3. Objetivo

Construir uma camada de confiança denominada:

# Sinarca Integrity Layer

Responsável por validar, correlacionar, classificar e registrar evidências antes que um projeto ou ativo alcance estados de maior confiança dentro do Sinarca.

O sistema deverá:

1. identificar quem está fazendo uma declaração;
2. registrar exatamente o que está sendo declarado;
3. associar evidências;
4. verificar documentos e fontes externas;
5. verificar consistência geográfica;
6. detectar conflitos e duplicidades;
7. calcular risco;
8. permitir revisão independente;
9. registrar todo o processo em trilha auditável;
10. ancorar criptograficamente a decisão final.

---

# 4. Princípios de produto

## 4.1 Claim ≠ Fact

Toda informação fornecida por uma parte interessada começa como uma `Claim`.

Exemplo:

```json
{
  "type": "LAND_RIGHT",
  "claimant": "organization-123",
  "statement": "A organização possui direito de desenvolver projeto sobre esta área",
  "propertyId": "property-456",
  "status": "DECLARED"
}
```

---

## 4.2 Evidência deve possuir origem

Toda evidência deve possuir:

- origem;
- responsável pelo envio;
- data;
- hash;
- versão;
- fonte;
- método de validação.

---

## 4.3 Nenhuma fonte é verdade absoluta

A confiança deve surgir da convergência entre fontes.

Exemplo:

```text
Matrícula
+
CNM
+
SIGEF
+
CAR
+
identidade
+
geometria
+
contrato
+
monitoramento
=
nível de confiança
```

---

## 4.4 Blockchain é camada de prova

A blockchain deve armazenar ou ancorar:

- hash da claim;
- hash das evidências;
- status;
- decisões;
- timestamps;
- identidade dos validadores;
- mudanças de estado.

Documentos sensíveis não devem necessariamente ser gravados diretamente on-chain.

---

# 5. Escopo

## 5.1 Incluído

- Claim Registry
- Evidence Registry
- validação de identidade
- validação documental
- geofence
- detecção de sobreposição
- detecção de projeto duplicado
- regras de double claiming
- integração com fontes oficiais
- score de risco
- workflow de revisão
- trilha de auditoria
- status de confiança
- suspensão de projetos
- revogação
- monitoramento contínuo
- ancoragem blockchain

---

## 5.2 Fora do MVP

Inicialmente não implementar:

- certificação oficial de créditos;
- substituição de auditor jurídico;
- custódia de valores;
- seguro obrigatório;
- avaliação jurídica automatizada por IA como decisão final;
- integração com todas as certificadoras internacionais;
- garantia absoluta de propriedade.

Esses elementos podem entrar em versões posteriores.

---

# 6. Entidades principais

## Project

```text
Project
- id
- organizationId
- name
- type
- status
- integrityStatus
- riskScore
- createdAt
- updatedAt
```

---

## Property

```text
Property
- id
- projectId
- name
- country
- state
- municipality
- areaHa
- geometry
- centroid
- propertyRegistry
- CNM
- CAR
- SIGEF
- integrityStatus
```

---

## Claim

```text
Claim
- id
- projectId
- propertyId
- claimantId
- type
- statement
- validFrom
- validTo
- status
- confidenceScore
- createdAt
```

Tipos iniciais:

```text
LAND_OWNERSHIP
LAND_POSSESSION
RIGHT_TO_OPERATE
CARBON_RIGHT
PROJECT_AUTHORIZATION
CONTRACT_VALIDITY
ENVIRONMENTAL_ATTRIBUTE
```

---

## Evidence

```text
Evidence
- id
- claimId
- type
- source
- sourceType
- documentId
- hash
- validationStatus
- validationMethod
- issuedAt
- expiresAt
- verifiedAt
```

---

## Conflict

```text
Conflict
- id
- projectId
- relatedProjectId
- type
- severity
- overlapPercentage
- detectedAt
- status
```

Tipos:

```text
GEOSPATIAL_OVERLAP
DUPLICATE_PROPERTY
DOUBLE_CLAIM
DUPLICATE_DOCUMENT
IDENTITY_CONFLICT
RIGHTS_CONFLICT
EXTERNAL_REGISTRY_CONFLICT
```

---

# 7. Estados de confiança

O Sinarca deve separar claramente cadastro de validação.

Estados:

```text
DECLARED
IDENTITY_VERIFIED
EVIDENCE_PENDING
EVIDENCE_VERIFIED
UNDER_REVIEW
INDEPENDENTLY_VERIFIED
VERIFIED
ON_HOLD
SUSPENDED
REVOKED
REJECTED
```

### DECLARED

Dados fornecidos pelo usuário.

Não houve validação independente.

### IDENTITY_VERIFIED

Identidade do solicitante validada.

Não implica validação da propriedade.

### EVIDENCE_VERIFIED

Evidências principais passaram pelas verificações disponíveis.

### VERIFIED

Projeto passou por todos os controles exigidos pelo seu risk profile.

### ON_HOLD

Projeto possui inconsistência que precisa ser investigada.

### SUSPENDED

Projeto temporariamente impedido de realizar determinadas ações.

### REVOKED

Validação anteriormente concedida foi retirada.

---

# 8. Identity Layer

Antes de um projeto poder solicitar verificação:

## Pessoa física

Validar:

- CPF;
- nome;
- data de nascimento;
- prova de vida quando necessário;
- assinatura digital;
- identidade do titular.

## Pessoa jurídica

Validar:

- CNPJ;
- razão social;
- situação cadastral;
- representantes;
- poderes legais;
- beneficiário final quando necessário.

## Representação

Caso uma pessoa opere em nome do proprietário:

```text
Proprietário
    ↓
Representante
    ↓
Procuração
    ↓
Validação
```

Status:

```text
UNVERIFIED
VERIFIED
EXPIRED
REVOKED
```

---

# 9. Document Integrity

Todo documento enviado deverá gerar:

```text
SHA-256
timestamp
uploader
organization
claim
mime-type
file-size
version
```

O sistema deverá detectar:

- mesmo hash utilizado anteriormente;
- documentos visualmente semelhantes;
- metadados inconsistentes;
- documento alterado;
- documento vencido;
- identificação de emissor;
- documentos associados a propriedades diferentes.

---

# 10. Validação fundiária

Para propriedades brasileiras, o pipeline deverá ser estruturado para consultar:

```text
ONR / CNM
SIGEF / INCRA
CAR / SICAR
Registro de Imóveis
outras bases oficiais disponíveis
```

Cada consulta deve gerar uma `ExternalEvidence`.

Exemplo:

```json
{
  "source": "ONR",
  "query": "CNM-XXXX",
  "result": "ACTIVE",
  "queriedAt": "2026-08-14T18:00:00Z",
  "resultHash": "..."
}
```

---

# 11. Regra específica do CAR

O CAR não pode ser classificado como evidência suficiente de propriedade.

Regra:

```text
CAR existente
≠
propriedade comprovada
```

O sistema deverá apresentar explicitamente:

> Cadastro ambiental confirmado. Este registro não comprova titularidade fundiária.

---

# 12. Geospatial Integrity Engine

Todo projeto deve possuir um polígono georreferenciado.

Formato recomendado interno:

```text
PostGIS Geometry
SRID 4326
```

Também suportar:

- GeoJSON;
- KML;
- WKT;
- lista de latitude/longitude.

---

# 13. Canonical Geometry

Após submissão, o Sinarca deverá gerar uma geometria canônica.

```text
user polygon
    ↓
geometry validation
    ↓
normalization
    ↓
canonical polygon
    ↓
hash
```

A geometria canônica não deve ser silenciosamente alterada.

Qualquer alteração gera:

```text
geometry version N+1
```

---

# 14. Validações geométricas

Executar automaticamente:

```sql
ST_IsValid()
ST_Area()
ST_Intersects()
ST_Overlap()
ST_Contains()
ST_Within()
```

Verificar:

- self-intersection;
- geometria inválida;
- área zero;
- vértices duplicados;
- fechamento do polígono;
- área informada vs área calculada;
- inconsistências de projeção.

---

# 15. Detecção de overlap

Ao cadastrar propriedade ou projeto:

```text
New polygon
    ↓
Compare Sinarca polygons
    ↓
ST_Intersects
```

Se houver interseção:

```text
overlapArea =
ST_Area(
    ST_Intersection(projectA, projectB)
)
```

Calcular:

```text
overlapPercentage
```

---

# 16. Regra inicial de severidade

Sugestão:

```text
0%                  → CLEAR

>0% até 1%          → INFO

>1% até 5%          → LOW

>5% até 20%         → MEDIUM

>20% até 50%        → HIGH

>50%                → CRITICAL
```

Esses thresholds deverão ser configuráveis.

---

# 17. Overlap não significa necessariamente fraude

A análise deverá considerar:

```text
geometria
+
tipo de projeto
+
direito reivindicado
+
período
+
atributo ambiental
```

Exemplo permitido:

```text
Projeto A:
Agrofloresta

Projeto B:
Monitoramento de biodiversidade
```

Mesma propriedade pode ser legítima.

Exemplo crítico:

```text
Projeto A:
Carbon Forest Preservation
2027–2037

Projeto B:
Carbon Forest Preservation
2028–2038
```

Nesse caso:

```text
DOUBLE_CLAIM_RISK = CRITICAL
```

---

# 18. Spatial Claims Registry

Criar uma entidade dedicada:

```text
SpatialClaim
```

Campos:

```text
id
geometry
projectId
propertyId
claimType
environmentalAttribute
validFrom
validTo
status
```

Isso permitirá identificar conflitos mesmo quando os projetos forem de organizações diferentes.

---

# 19. Double Claiming Engine

A regra deverá analisar simultaneamente:

```text
Área
+
benefício/atributo
+
período
+
claim
```

Exemplo:

```pseudo
IF
  intersects(projectA, projectB)
AND
  same_environmental_attribute
AND
  periods_overlap
THEN
  create DOUBLE_CLAIM conflict
```

---

# 20. Duplicate Detection

O sistema deverá procurar duplicidade utilizando:

### Exata

- CNM;
- matrícula;
- CAR;
- SIGEF;
- CPF/CNPJ;
- hash do documento;
- endereço;
- coordenadas.

### Aproximada

- nomes similares;
- OCR;
- proximidade geográfica;
- geometria semelhante;
- documentos semanticamente semelhantes.

---

# 21. Risk Engine

Cada projeto deverá possuir:

```text
Integrity Risk Score
0–100
```

Onde:

```text
0 = baixo risco
100 = risco máximo
```

---

# 22. Exemplos de sinais de risco

### +10

CAR sem matrícula.

### +20

Matrícula recentemente alterada.

### +30

SIGEF diverge da geometria.

### +50

Matrícula cancelada.

### +50

Projeto overlap >50%.

### +60

Mesmo direito ambiental reivindicado por outro projeto.

### +80

Documento identificado como falsificado.

### +100

Propriedade confirmadamente inexistente.

---

# 23. Risk Classes

```text
0–20
LOW

21–40
MODERATE

41–60
HIGH

61–80
VERY_HIGH

81–100
CRITICAL
```

---

# 24. Workflow automático

```text
Project Submitted

      ↓

Identity verification

      ↓

Document validation

      ↓

Property validation

      ↓

Geospatial validation

      ↓

Duplicate search

      ↓

Double claiming search

      ↓

External registry checks

      ↓

Risk Engine

      ↓

┌───────────────────────────────┐
│ LOW                           │
│ Automated Approval Candidate │
└───────────────────────────────┘

┌───────────────────────────────┐
│ MODERATE/HIGH                 │
│ Manual Review                │
└───────────────────────────────┘

┌───────────────────────────────┐
│ VERY HIGH / CRITICAL          │
│ ON HOLD                      │
└───────────────────────────────┘
```

---

# 25. Human Review

Criar módulo:

```text
Integrity Review Console
```

O analista deve visualizar:

- projeto;
- organização;
- proprietário;
- mapa;
- documentos;
- conflitos;
- fontes externas;
- risk score;
- justificativas do score;
- histórico.

Ações:

```text
APPROVE
REQUEST_EVIDENCE
ON_HOLD
REJECT
ESCALATE
SUSPEND
```

Toda ação exige:

```text
reviewer
timestamp
reason
```

---

# 26. Four-Eyes Principle

Projetos classificados como HIGH ou superior não podem ser aprovados por uma única pessoa.

Fluxo:

```text
Reviewer A
     ↓
Reviewer B
     ↓
APPROVED
```

Nenhuma pessoa deve conseguir:

```text
submeter
+
validar
+
aprovar
```

o mesmo projeto.

---

# 27. Independent Verification

O sistema deverá futuramente permitir organizações externas atuarem como:

```text
Verifier
Auditor
Certifier
Legal Reviewer
Technical Reviewer
```

Cada organização terá permissões específicas.

---

# 28. Evidence Ledger

Criar ledger imutável de evidências.

Exemplo:

```text
Evidence #382
Document received
14 Aug 2026 15:41

Evidence #383
CNM checked
14 Aug 2026 15:42

Evidence #384
SIGEF geometry retrieved
14 Aug 2026 15:43

Evidence #385
Overlap detected
14 Aug 2026 15:43

Evidence #386
Manual review requested
14 Aug 2026 16:02
```

---

# 29. Audit Trail

Registrar obrigatoriamente:

```text
actor
action
resource
previousState
newState
timestamp
IP
device/session
reason
```

Eventos críticos deverão ser imutáveis.

---

# 30. Blockchain Anchoring

Não armazenar obrigatoriamente todos os documentos on-chain.

Armazenar:

```text
document hash
claim hash
geometry hash
evidence bundle hash
decision hash
timestamp
```

Exemplo:

```text
Evidence Bundle
     ↓
Merkle Tree
     ↓
Merkle Root
     ↓
Blockchain
```

Isso reduz custo e melhora privacidade.

---

# 31. Evidence Bundle

Para cada decisão relevante, gerar:

```json
{
  "project": "...",
  "claim": "...",
  "geometryHash": "...",
  "evidence": [],
  "riskScore": 18,
  "decision": "VERIFIED",
  "reviewers": [],
  "timestamp": "..."
}
```

Gerar hash desse conjunto.

---

# 32. Monitoramento pós-aprovação

Verificação não deve ser considerada eterna.

O sistema deverá permitir revalidação periódica.

Exemplos:

```text
CNM
SIGEF
CAR
sanções
situação da empresa
monitoramento geoespacial
```

---

# 33. Integrity Watch

Job periódico:

```text
Verified Projects
      ↓
External checks
      ↓
Changes?
```

Se não:

```text
NO_CHANGE
```

Se sim:

```text
INTEGRITY_EVENT
```

---

# 34. Eventos críticos

Exemplos:

```text
PROPERTY_REGISTRATION_CANCELLED

LAND_OWNER_CHANGED

GEOMETRY_CHANGED

NEW_PROJECT_OVERLAP

LEGAL_RESTRICTION

EXTERNAL_REGISTRY_CONFLICT

DOUBLE_CLAIM_DETECTED
```

---

# 35. Auto Hold

Determinados eventos devem suspender automaticamente o status de confiança.

Exemplo:

```pseudo
IF property.registration.status == CANCELLED
THEN
    project.status = ON_HOLD
```

---

# 36. Denúncias

Criar mecanismo de:

```text
Report Project
```

Permitindo:

- proprietário;
- comunidade;
- órgão público;
- auditor;
- terceiro interessado;

denunciar inconsistências.

Tipos:

```text
OWNERSHIP_DISPUTE
DUPLICATE_PROJECT
FALSE_DOCUMENT
COMMUNITY_CONFLICT
ENVIRONMENTAL_VIOLATION
OTHER
```

---

# 37. Tratamento de denúncia

```text
Report
   ↓
Triage
   ↓
Risk assessment
   ↓
Possible ON HOLD
   ↓
Investigation
   ↓
Decision
```

Denúncia por si só não deve automaticamente provar fraude.

---

# 38. Modelo de permissões

Perfis:

```text
PROJECT_OWNER
PROJECT_OPERATOR
PROPERTY_OWNER
VERIFIER
AUDITOR
INTEGRITY_ANALYST
INTEGRITY_ADMIN
SYSTEM_ADMIN
```

---

# 39. Segregação de funções

Exemplo:

| Ação | Proponente | Analista | Auditor |
|---|---:|---:|---:|
| Criar claim | ✅ | | |
| Enviar evidência | ✅ | | |
| Validar automaticamente | Sistema | | |
| Aprovar baixo risco | | ✅ | |
| Aprovar alto risco | | ✅ | ✅ |
| Revogar | | | ✅ |

---

# 40. Status público do projeto

Externamente, mostrar claramente:

```text
Declared
Verified
Under Review
On Hold
Suspended
Revoked
```

Nunca utilizar apenas:

```text
Certified
```

sem explicar exatamente o escopo.

---

# 41. Trust Badge

Exemplo:

```text
SINARCA VERIFIED

Identity          ✓
Land Evidence     ✓
Geofence          ✓
Overlap Check     ✓
Rights            ✓
Independent Audit ✓

Verified:
14 Aug 2026

Last Checked:
14 Aug 2026
```

---

# 42. Explainability

Todo score ou bloqueio deverá possuir explicação humana.

Ruim:

```text
Risk Score: 78
```

Bom:

```text
Risk Score: 78 — Critical

Reasons:

+40 Property overlap: 67%
+20 Registry mismatch
+15 Owner identity mismatch
+3 Recently modified evidence
```

---

# 43. API

Endpoints iniciais sugeridos:

```http
POST /projects

POST /projects/:id/claims

POST /claims/:id/evidence

GET /projects/:id/integrity

GET /projects/:id/conflicts

GET /projects/:id/evidence

GET /projects/:id/audit

POST /projects/:id/review

POST /projects/:id/report

POST /projects/:id/hold

POST /projects/:id/revoke
```

---

# 44. Endpoint de overlap

```http
POST /integrity/geometry/check
```

Request:

```json
{
  "geometry": {},
  "claimType": "CARBON_RIGHT",
  "validFrom": "2027-01-01",
  "validTo": "2037-12-31"
}
```

Response:

```json
{
  "valid": true,
  "overlaps": [
    {
      "projectId": "PRJ-912",
      "percentage": 37.4,
      "severity": "HIGH"
    }
  ]
}
```

---

# 45. Banco de dados

Recomendação:

```text
PostgreSQL
+
PostGIS
```

Índice obrigatório:

```sql
CREATE INDEX idx_properties_geometry
ON properties
USING GIST (geometry);
```

---

# 46. Componentes arquiteturais

```text
                Sinarca

                   │

      ┌────────────┴────────────┐
      │                         │
 Identity Service        Project Service
      │                         │
      └────────────┬────────────┘
                   │
              Claim Service
                   │
                   ▼
            Evidence Service
                   │
          ┌────────┼─────────┐
          │        │         │
       Docs      APIs      Geo
          │        │         │
          └────────┼─────────┘
                   ▼
             Integrity Engine
                   │
          ┌────────┴────────┐
          │                 │
     Risk Engine      Conflict Engine
          │                 │
          └────────┬────────┘
                   ▼
             Review Workflow
                   │
                   ▼
             Evidence Ledger
                   │
                   ▼
            Blockchain Anchor
```

---

# 47. Event-driven architecture

Eventos recomendados:

```text
project.created

claim.created

evidence.added

evidence.verified

geometry.updated

conflict.detected

risk.updated

review.requested

review.completed

project.verified

project.on_hold

project.suspended

project.revoked
```

---

# 48. Observabilidade

Todas as validações devem produzir métricas.

Exemplos:

```text
integrity.claims.total

integrity.evidence.validation.success

integrity.evidence.validation.failure

integrity.overlap.detected

integrity.double_claim.detected

integrity.projects.on_hold

integrity.projects.revoked
```

---

# 49. Segurança

Documentos potencialmente contêm dados sensíveis.

Implementar:

- encryption at rest;
- encryption in transit;
- URLs temporárias;
- RBAC;
- MFA para usuários privilegiados;
- audit logs;
- secrets management;
- retenção configurável;
- segregação por tenant.

---

# 50. Requisitos LGPD

Aplicar:

```text
data minimization
purpose limitation
access control
retention policy
auditability
```

Não colocar PII diretamente em blockchain pública.

Preferir:

```text
PII → encrypted storage

Blockchain → cryptographic proof
```

---

# 51. Fraud Graph

Fase posterior recomendada.

Construir grafo ligando:

```text
Pessoa
Empresa
Propriedade
Documento
Projeto
Conta
Verificador
```

Exemplo:

```text
Pessoa X
 ├─ Empresa A
 ├─ Empresa B
 └─ Empresa C

todas associadas à mesma propriedade.
```

Isso pode revelar fraudes coordenadas.

---

# 52. Sentinel / Satellite Integrity

A camada de integridade poderá utilizar imagens de satélite para verificar consistência temporal.

Não serve para comprovar propriedade.

Serve para validar claims ambientais.

Exemplos:

```text
forest cover
land use
vegetation
deforestation
fire
water
```

---

# 53. Temporal Baseline

No momento da criação do projeto:

```text
T0
```

criar baseline da área.

Armazenar:

```text
imagery source
capture date
NDVI
land-cover metrics
geometry
hash
```

Posteriormente comparar:

```text
T0
T1
T2
T3
```

---

# 54. Critérios de aceitação do MVP

O MVP estará funcional quando:

- [ ] Toda submissão gera uma Claim.
- [ ] Claims possuem status próprio.
- [ ] Documentos recebem SHA-256.
- [ ] Geofence é obrigatória para projetos territoriais.
- [ ] Geometrias ficam armazenadas em PostGIS.
- [ ] Sistema detecta overlaps internos.
- [ ] Percentual de overlap é calculado.
- [ ] Conflitos ficam persistidos.
- [ ] Um Risk Score inicial é gerado.
- [ ] Projetos HIGH podem ser colocados em review.
- [ ] Projetos CRITICAL entram automaticamente em ON_HOLD.
- [ ] Toda decisão gera audit log.
- [ ] Evidências possuem proveniência.
- [ ] O sistema diferencia DECLARED de VERIFIED.
- [ ] Mudanças de geofence criam nova versão.
- [ ] Hash das evidências pode ser ancorado na blockchain.

---

# 55. Fases de implementação

## Fase 1 — Foundation

**P0**

Implementar:

- Claim model;
- Evidence model;
- status;
- SHA-256;
- audit log;
- versionamento;
- PostGIS.

---

## Fase 2 — Geospatial Integrity

**P0**

Implementar:

- canonical geometry;
- geofence;
- overlap;
- percentual;
- conflitos;
- mapa de conflitos.

---

## Fase 3 — Integrity Risk

**P0**

Implementar:

- risk rules;
- score;
- severity;
- auto hold;
- explainability.

---

## Fase 4 — Review Workflow

**P1**

Implementar:

- Integrity Console;
- manual review;
- four-eyes;
- request additional evidence;
- approve/reject/hold.

---

## Fase 5 — External Registry Verification

**P1**

Começar por:

```text
ONR/CNM
SIGEF
CAR
```

quando APIs ou meios oficiais de consulta permitirem automação.

---

## Fase 6 — Blockchain Evidence

**P1**

Implementar:

- evidence bundle;
- Merkle tree;
- evidence root;
- blockchain anchoring;
- verification endpoint.

---

## Fase 7 — Continuous Integrity

**P2**

Implementar:

- revalidação;
- monitoring jobs;
- Integrity Events;
- Sentinel;
- alertas.

---

## Fase 8 — Fraud Intelligence

**P2**

Implementar:

- fraud graph;
- similarity detection;
- entity relationships;
- anomaly detection;
- cross-registry checking.

---

# 56. Prioridade de backlog

## P0 — obrigatório antes de escalar

```text
Claim Registry
Evidence Registry
Evidence Hashing
Audit Trail
Geofence
PostGIS
Overlap Detection
Duplicate Check
Risk Score
ON_HOLD
Status público
```

---

## P1 — confiança institucional

```text
ONR
SIGEF
CAR
Independent Review
Four Eyes
Blockchain Evidence Bundle
External Verification APIs
```

---

## P2 — diferencial competitivo

```text
Satellite Monitoring
Fraud Graph
AI Document Analysis
Cross-registry Detection
Continuous Verification
Risk Intelligence
```

---

# 57. Métricas de sucesso

## Produto

```text
% projetos VERIFIED

% projetos enviados para review

% conflitos detectados automaticamente

tempo médio de verificação

tempo médio de resolução de conflito
```

## Fraude

```text
documentos duplicados detectados

geofences conflitantes detectadas

double claims detectados

projetos suspensos

projetos revogados

fraudes detectadas antes da validação
```

## Eficiência

```text
% verificações automáticas

% revisões manuais

custo médio de validação

external API cost / project
```

---

# 58. North Star Metric

Sugestão:

> **Percentage of verified projects with independently corroborated evidence and zero unresolved critical integrity conflicts.**

---

# 59. Requisito jurídico de produto

O sistema deverá registrar claramente que:

> Dados enviados por terceiros constituem declarações até serem submetidos aos processos de verificação aplicáveis.

O Sinarca não deverá utilizar terminologia que implique garantia absoluta de propriedade ou autenticidade quando não houver base suficiente para isso.

---

# 60. Termos e responsabilidades

Antes da submissão, o responsável deve declarar que:

- possui autorização para fornecer os dados;
- as informações são verdadeiras segundo seu conhecimento;
- possui direitos alegados;
- não omitiu conflito material;
- permite validação em bases externas;
- entende que informações falsas podem gerar suspensão;
- aceita auditoria;
- aceita revogação de status;
- responde por informações fraudulentas fornecidas deliberadamente.

---

# 61. Definition of Done — Project Integrity

Um projeto somente poderá receber `VERIFIED` se:

```text
Identity             PASS
Required Evidence    PASS
Geometry             PASS
Duplicate Check      PASS
Overlap Analysis     PASS
Double Claim         PASS
Risk                 ACCEPTABLE
Required Review      PASS
Audit Trail          COMPLETE
```

Se qualquer requisito obrigatório retornar:

```text
FAIL
```

o projeto não recebe `VERIFIED`.

---

# 62. Regra arquitetural fundamental

O desenvolvimento deve respeitar esta regra:

```text
Blockchain does not determine truth.
Blockchain proves what was evaluated,
by whom,
using which evidence,
and when.
```

A verdade operacional do Sinarca deverá nascer da combinação de:

```text
Identity
+
Claims
+
Evidence
+
External Sources
+
Geospatial Validation
+
Independent Verification
+
Continuous Monitoring
+
Immutable Provenance
```

---

# 63. Resultado esperado

O Sinarca deixa de ser apenas:

> um registro blockchain de projetos.

E passa a operar como:

> **uma infraestrutura de confiança para ativos ambientais e territoriais, capaz de demonstrar a origem, as evidências, os conflitos, as verificações e a evolução de cada claim ao longo do tempo.**

Esse desenho também protege o Sinarca institucionalmente.

Caso uma fraude seja descoberta posteriormente, deve ser possível reconstruir:

```text
quem declarou
↓
o que declarou
↓
quais documentos apresentou
↓
quais fontes foram consultadas
↓
quais verificações foram executadas
↓
quais conflitos existiam
↓
quem tomou a decisão
↓
qual era o estado das evidências naquele momento
↓
quando o projeto foi suspenso ou revogado
```

Essa trilha será uma das principais defesas técnicas, reputacionais e jurídicas da plataforma.