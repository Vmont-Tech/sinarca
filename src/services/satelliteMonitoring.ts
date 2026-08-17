import { apiGet, apiPatch } from './api';

// Cliente tipado das rotas satelitais expostas por backend_app/modules/satellite/routes.py
// (Plan 05-07). Os tipos abaixo espelham EXATAMENTE os serializadores reais
// (observation_item/event_item/pendency_item/integrity_summary), nao a prosa
// do plano — divergencias entre a prosa e o codigo ja mergeado foram
// resolvidas a favor do codigo (05-09-SUMMARY.md documenta o desvio).

export type SatelliteObservation = {
    id: string;
    sceneId: string;
    satellite: string;
    product: string;
    processingVersion: string;
    observedAt: string;
    cloudCoverage: number | null;
    ndviMean: number | null;
    ndviMin: number | null;
    ndviMax: number | null;
    ndmiMean: number | null;
    nbrMean: number | null;
    validPixelPercentage: number | null;
};

export type SatelliteEventEvidence = {
    id: string;
    kind: 'BEFORE_IMAGE' | 'AFTER_IMAGE' | 'STATISTICS_SNAPSHOT';
    sha256: string;
    capturedAt: string | null;
    mimeType: string;
};

export type EnvironmentalEventStatus = 'DETECTED' | 'ANALYZED' | 'CONFIRMED' | 'DISMISSED';
export type EnvironmentalEventType = 'VEGETATION_LOSS' | 'VEGETATION_RECOVERY' | 'POSSIBLE_FIRE';
export type EnvironmentalEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EnvironmentalEventAnomaly = {
    id: string;
    indexName: string;
    valueBefore: number | null;
    valueAfter: number | null;
    dropRatio: number | null;
    reason: string | null;
};

export type EnvironmentalEvent = {
    id: string;
    type: EnvironmentalEventType;
    status: EnvironmentalEventStatus;
    severity: EnvironmentalEventSeverity;
    confidence: number | null;
    affectedAreaHa: number | null;
    ndviBefore: number | null;
    ndviAfter: number | null;
    summary: string | null;
    detectedAt: string | null;
    analyzedAt: string | null;
    decidedAt: string | null;
    decisionNotes: string | null;
    clearedAt: string | null;
    clearanceNotes: string | null;
    correlation: Record<string, unknown> | null;
    anomaly: EnvironmentalEventAnomaly | null;
    evidence: SatelliteEventEvidence[];
};

export type SatelliteJobSummary = {
    jobType: string;
    status: string;
    errorMessage: string | null;
    finishedAt: string | null;
};

// D-14: eventsByStatus so contem chaves com contagem > 0 — nunca assumir os
// 4 status sempre presentes.
export type SatelliteSummary = {
    latestObservation: SatelliteObservation | null;
    observationCount: number;
    baselineSource: string | null;
    sentinelStatus: string | null;
    lastJob: SatelliteJobSummary | null;
    eventsByStatus: Partial<Record<EnvironmentalEventStatus, number>>;
    blocked?: boolean;
    blockedReason?: string;
};

export type CreditAdjustmentPendencyStatus = 'OPEN' | 'RESOLVED' | 'CANCELLED';

export type CreditAdjustmentPendency = {
    id: string;
    projectEventId: string | null;
    category: string;
    description: string;
    affectedAreaHa: number | null;
    status: CreditAdjustmentPendencyStatus;
    producerResponse: string | null;
    respondedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    metadata: Record<string, unknown>;
};

export type IntegritySignal = { code: string; weight: number; reason: string; publicSafe: boolean };

export type IntegritySummary = {
    integrityStatus: string;
    publicStatus: string;
    riskScore: number | null;
    riskClass: string | null;
    autoHold: boolean;
    assessedAt: string | null;
    trigger: string | null;
    conflictCount: number;
    claimCount: number;
    signals: IntegritySignal[];
};

type SatelliteSummaryResponse = { success: boolean; project_id: string; summary: SatelliteSummary };
type SatelliteObservationsResponse = { success: boolean; project_id: string; total: number; observations: SatelliteObservation[] };
type ProjectEventsResponse = { success: boolean; project_id: string; total: number; events: EnvironmentalEvent[] };
type ProjectEventDetailResponse = {
    success: boolean;
    project_id: string;
    event: EnvironmentalEvent;
    integrity?: IntegritySummary | null;
};
type CreditAdjustmentPendenciesResponse = { success: boolean; project_id: string; total: number; pendencies: CreditAdjustmentPendency[] };

const projectBase = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;

export const fetchSatelliteSummary = async (projectId: string): Promise<SatelliteSummary> => {
    const response = await apiGet<SatelliteSummaryResponse>(`${projectBase(projectId)}/satellite/summary`);
    if (!response) throw new Error('Resumo de monitoramento satelital sem resposta da API.');
    return response.summary;
};

export const fetchSatelliteObservations = async (
    projectId: string,
    params?: { dateFrom?: string; dateTo?: string; limit?: number },
): Promise<SatelliteObservation[]> => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.set('date_from', params.dateFrom);
    if (params?.dateTo) query.set('date_to', params.dateTo);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const response = await apiGet<SatelliteObservationsResponse>(
        `${projectBase(projectId)}/satellite/observations${qs ? `?${qs}` : ''}`,
    );
    return response?.observations ?? [];
};

export const fetchEnvironmentalEvents = async (
    projectId: string,
    status?: EnvironmentalEventStatus,
): Promise<EnvironmentalEvent[]> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiGet<ProjectEventsResponse>(`${projectBase(projectId)}/environmental-events${qs}`);
    return response?.events ?? [];
};

export const fetchEnvironmentalEvent = async (projectId: string, eventId: string): Promise<EnvironmentalEvent> => {
    const response = await apiGet<ProjectEventDetailResponse>(
        `${projectBase(projectId)}/environmental-events/${encodeURIComponent(eventId)}`,
    );
    if (!response) throw new Error('Evento ambiental sem resposta da API.');
    return response.event;
};

export const decideEnvironmentalEvent = async (
    projectId: string,
    eventId: string,
    decision: 'CONFIRMED' | 'DISMISSED',
    notes: string,
): Promise<{ event: EnvironmentalEvent; integrity: IntegritySummary | null }> => {
    const response = await apiPatch<ProjectEventDetailResponse>(
        `${projectBase(projectId)}/environmental-events/${encodeURIComponent(eventId)}/decision`,
        { decision, notes },
    );
    if (!response) throw new Error('Decisão sobre a anomalia sem resposta da API.');
    return { event: response.event, integrity: response.integrity ?? null };
};

export const clearEnvironmentalEvent = async (
    projectId: string,
    eventId: string,
    notes: string,
): Promise<{ event: EnvironmentalEvent; integrity: IntegritySummary | null }> => {
    const response = await apiPatch<ProjectEventDetailResponse>(
        `${projectBase(projectId)}/environmental-events/${encodeURIComponent(eventId)}/clear`,
        { notes },
    );
    if (!response) throw new Error('Liberação de bloqueio sem resposta da API.');
    return { event: response.event, integrity: response.integrity ?? null };
};

export const fetchCreditAdjustmentPendencies = async (projectId: string): Promise<CreditAdjustmentPendency[]> => {
    const response = await apiGet<CreditAdjustmentPendenciesResponse>(`${projectBase(projectId)}/credit-adjustment-pendencies`);
    return response?.pendencies ?? [];
};

/** Path relativo (sem API_BASE_URL) da imagem de evidencia de um evento —
 *  o componente busca com fetch autenticado e converte para blob (a rota
 *  pode exigir bearer e nunca deve ser usada como src direto de <img>). */
export const satelliteEvidenceImageUrl = (projectId: string, eventId: string, evidenceId: string): string =>
    `${projectBase(projectId)}/environmental-events/${encodeURIComponent(eventId)}/evidence/${encodeURIComponent(evidenceId)}/image`;
