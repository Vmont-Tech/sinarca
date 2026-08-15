import { apiGet, apiPatch } from './api';

export type CertifierQueueScope = 'main' | 'corrections';
export type CertificationDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
export type PendencyCategory =
    | 'DOCUMENTACAO_INCOMPLETA'
    | 'GEOFENCE_INVALIDA'
    | 'BASELINE_INCONSISTENTE'
    | 'METODOLOGIA_INADEQUADA'
    | 'POTENCIAL_DIVERGENTE'
    | 'OUTRO';

export const PENDENCY_CATEGORY_OPTIONS: Array<{ value: PendencyCategory; label: string }> = [
    { value: 'DOCUMENTACAO_INCOMPLETA', label: 'Documentação incompleta' },
    { value: 'GEOFENCE_INVALIDA', label: 'Geofence/QTAGs inválidas' },
    { value: 'BASELINE_INCONSISTENTE', label: 'Baseline inconsistente' },
    { value: 'METODOLOGIA_INADEQUADA', label: 'Metodologia inadequada' },
    { value: 'POTENCIAL_DIVERGENTE', label: 'Potencial de crédito divergente' },
    { value: 'OUTRO', label: 'Outro' },
];

export const APPROVAL_STATUS_LABELS = ['Certificação aprovada', 'Mint autorizado', 'Aguardando tesouraria'] as const;

export type CertifierQueueResponse = {
    success: boolean;
    total: number;
    projects: any[];
    scope: CertifierQueueScope;
    counts: { main: number; corrections: number };
};

export type CertificationDossierStatus = {
    complete: boolean;
    missing: string[];
    baseline: { present: boolean; capturedAt: string | null; sentinelSceneId: string | null };
    tags: { total: number; valid: number; required: number; complete: boolean };
    documents: { presentTypes: string[]; missingGroups: string[]; complete: boolean };
};

export type CertificationCalculation = {
    suggestedCreditPotential: number;
    formula: string;
    source: string;
    vegetationCoverPct: number | null;
    ndviMean: number | null;
    areaHectares: number | null;
    carbonStock: number | null;
    methodology: string | null;
};

export type CertificationCertificate = {
    documentId: string;
    sha256: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    storagePath: string;
    filename: string | null;
    downloadAvailable: boolean;
};

export type CertificationPendencyItem = {
    id: string;
    category: string;
    description: string;
    status: string;
    producerResponse: string | null;
    respondedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    metadata: Record<string, any>;
};

export type CertificationHistoryEvent = {
    id: string;
    action: string;
    label: string;
    actorRole: string | null;
    actorProfileId: string | null;
    createdAt: string;
    metadata?: Record<string, any>;
    beforeData?: Record<string, any> | null;
    afterData?: Record<string, any> | null;
};

export type CertifierReviewDossier = {
    success: boolean;
    project: any;
    baseline: Record<string, any> | null;
    tags: Array<Record<string, any>>;
    documents: Array<Record<string, any>>;
    dossier: CertificationDossierStatus;
    calculation: CertificationCalculation;
    certifications: Array<Record<string, any>>;
    pendencies: CertificationPendencyItem[];
    treasuryAuthorization: Record<string, any> | null;
    certificate: CertificationCertificate | null;
};

export type CertificationHistoryResponse = {
    success: boolean;
    total: number;
    events: CertificationHistoryEvent[];
    availableEventTypes: Array<{ value: string; label: string }>;
    availableActorRoles: string[];
};

export type CertificationDecisionResult = {
    success: boolean;
    project_id: string;
    new_status: string;
    previous_status: string;
    decision: CertificationDecision;
    credit_potential: number;
    suggested_credit_potential: number;
    certification_id: string;
    certificate: Record<string, any> | null;
    pendency_id: string | null;
    treasury_authorization_id: string | null;
    statusLabels: string[];
};

export const fetchCertifierQueue = async (scope: CertifierQueueScope): Promise<CertifierQueueResponse> => {
    const response = await apiGet<CertifierQueueResponse>(`/certifier/queue?scope=${scope}`);
    if (!response) {
        throw new Error('Fila da certificadora sem resposta da API.');
    }
    return response;
};

export const fetchCertifierReview = async (projectId: string): Promise<CertifierReviewDossier> => {
    const response = await apiGet<CertifierReviewDossier>(`/certifier/projects/${encodeURIComponent(projectId)}/review`);
    if (!response) {
        throw new Error('Dossiê de certificação sem resposta da API.');
    }
    return response;
};

// NOTA: `GET /certifier/projects/{id}/history` retorna uma lista JSON no nível raiz
// (documentado em 04-05-SUMMARY.md como desvio deliberado de contrato — o teste imutável
// tests/test_certifier_workbench.py consome a rota como array), não o envelope
// CertificationHistoryResponse descrito na prosa original do plano. Esta função monta o
// envelope no cliente a partir da lista bruta, derivando `availableEventTypes`/
// `availableActorRoles` da própria resposta.
export const fetchCertificationHistory = async (
    projectId: string,
    filters?: { eventType?: string; actorRole?: string },
): Promise<CertificationHistoryResponse> => {
    const params = new URLSearchParams();
    if (filters?.eventType) params.set('event_type', filters.eventType);
    if (filters?.actorRole) params.set('actor_role', filters.actorRole);
    const query = params.toString();
    const events = await apiGet<CertificationHistoryEvent[]>(
        `/certifier/projects/${encodeURIComponent(projectId)}/history${query ? `?${query}` : ''}`,
    );
    const list = events || [];

    const eventTypeMap = new Map<string, string>();
    const actorRoleSet = new Set<string>();
    list.forEach((event) => {
        eventTypeMap.set(event.action, event.label || event.action);
        if (event.actorRole) actorRoleSet.add(event.actorRole);
    });

    return {
        success: true,
        total: list.length,
        events: list,
        availableEventTypes: Array.from(eventTypeMap.entries()).map(([value, label]) => ({ value, label })),
        availableActorRoles: Array.from(actorRoleSet.values()),
    };
};

export const decideCertification = async (projectId: string, input: {
    decision: CertificationDecision;
    methodology?: string;
    creditPotential?: number;
    creditPotentialAdjustmentReason?: string;
    notes: string;
    rejectionCategory?: PendencyCategory;
    certificate?: File | null;
}): Promise<CertificationDecisionResult> => {
    const body = new FormData();
    body.append('decision', input.decision);
    if (input.methodology) body.append('methodology', input.methodology);
    if (input.creditPotential !== undefined && !Number.isNaN(input.creditPotential)) body.append('credit_potential', String(input.creditPotential));
    if (input.creditPotentialAdjustmentReason) body.append('credit_potential_adjustment_reason', input.creditPotentialAdjustmentReason);
    body.append('notes', input.notes);
    if (input.rejectionCategory) body.append('rejection_category', input.rejectionCategory);
    if (input.certificate) body.append('certificate', input.certificate);
    const response = await apiPatch<CertificationDecisionResult>(`/certifier/projects/${encodeURIComponent(projectId)}/decision`, body);
    if (!response) throw new Error('Decisão da certificadora sem resposta da API.');
    return response;
};

export const decisionErrorMessage = (error: unknown, decision: CertificationDecision): string => {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('Dossiê incompleto')) return raw;
    if (decision === 'APPROVE' && (raw.includes('Storage') || raw.includes('certificado') || raw.includes('Certificado') || raw.includes('PDF')))
        return 'Não foi possível anexar o certificado. A aprovação não foi concluída — verifique o arquivo PDF e tente novamente.';
    if (decision === 'APPROVE' && (raw.includes('tesouraria') || raw.includes('API indisponível')))
        return 'Não foi possível registrar a autorização para a tesouraria. A aprovação foi revertida — tente novamente.';
    return raw;
};
