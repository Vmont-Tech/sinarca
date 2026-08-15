import React from 'react';
import {
    AlertTriangle,
    Calculator,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    FileText,
    History,
    RotateCcw,
    ShieldCheck,
    Tag,
    Upload,
    XCircle,
} from 'lucide-react';
import ProjectGeofencePreview from '../../components/ProjectGeofencePreview';
import type { ProjectTagDraft, VertexLabel } from '../../services/projectOrigination';
import {
    decideCertification,
    decisionErrorMessage,
    fetchCertificationHistory,
    fetchCertifierQueue,
    fetchCertifierReview,
    PENDENCY_CATEGORY_OPTIONS,
    type CertificationDecision,
    type CertificationHistoryEvent,
    type CertifierQueueScope,
    type CertifierReviewDossier,
    type PendencyCategory,
} from '../../services/certifierReview';

type TabId = 'resumo' | 'qtags' | 'documentos' | 'calculo' | 'decisao' | 'historico';

type DecisionDraft = {
    decision: CertificationDecision;
    methodology: string;
    creditPotential: string;
    creditPotentialAdjustmentReason: string;
    notes: string;
    rejectionCategory: PendencyCategory | '';
    certificate: File | null;
};

const TABS: Array<{ id: TabId; label: string; icon: typeof FileText }> = [
    { id: 'resumo', label: 'Resumo', icon: FileText },
    { id: 'qtags', label: 'QTAGs / Geofence', icon: Tag },
    { id: 'documentos', label: 'Documentos', icon: FileCheck2 },
    { id: 'calculo', label: 'Cálculo', icon: Calculator },
    { id: 'decisao', label: 'Decisão', icon: ClipboardCheck },
    { id: 'historico', label: 'Histórico', icon: History },
];

const formatNumber = (value: number | null | undefined) => (value ?? 0).toLocaleString('pt-BR');
const getAreaHa = (project: any) => project.metrics?.totalAreaHa ?? project.area_hectares;
const getCarbonStock = (project: any) => project.metrics?.carbonStock ?? project.carbonStock;

const formatBytes = (bytes: number | null | undefined) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Sem registro';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const documentTypeLabel = (type?: string) => ({
    LEGAL_OWNERSHIP: 'Documento legal',
    CAR: 'CAR',
    FOREST_INVENTORY: 'Inventário florestal',
    KML_OR_SHP: 'KML/SHP',
    OTHER: 'Outro documento',
    CERTIFICATION_CERTIFICATE: 'Certificado de certificação',
}[type || ''] || type || 'Documento');

const buildQtagDrafts = (review: CertifierReviewDossier): ProjectTagDraft[] =>
    (review.tags || []).map((tag: any) => ({
        vertex_label: String(tag.vertex) as VertexLabel,
        has_qtag: Boolean(tag.hasQtag ?? (tag.tagUid || tag.cmac)),
        tag_uid: String(tag.tagUid || ''),
        cmac: String(tag.cmac || ''),
        latitude: String(tag.latitude ?? ''),
        longitude: String(tag.longitude ?? ''),
        captureMode: 'manual',
    }));

const EmptyState = ({ text }: { text: string }) => (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm font-medium text-gray-500">
        {text}
    </div>
);

const CREDIT_POTENTIAL_TOLERANCE = 0.01;

const canSubmit = (draft: DecisionDraft, review: CertifierReviewDossier): boolean => {
    if (draft.decision === 'APPROVE') {
        if (!review.dossier.complete) return false;
        if (!draft.certificate) return false;
        if (!draft.methodology.trim()) return false;
        const value = Number(draft.creditPotential);
        if (!Number.isFinite(value) || value <= 0) return false;
        if (Math.abs(value - review.calculation.suggestedCreditPotential) > CREDIT_POTENTIAL_TOLERANCE && !draft.creditPotentialAdjustmentReason.trim()) return false;
        return true;
    }
    return Boolean(draft.rejectionCategory) && draft.notes.trim().length > 0;
};

export default function CertifierReview() {
    const [scope, setScope] = React.useState<CertifierQueueScope>('main');
    const [items, setItems] = React.useState<any[]>([]);
    const [counts, setCounts] = React.useState<{ main: number; corrections: number }>({ main: 0, corrections: 0 });
    const [loading, setLoading] = React.useState(true);
    const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<TabId>('resumo');
    const [reviewByProject, setReviewByProject] = React.useState<Record<string, CertifierReviewDossier>>({});
    const [reviewLoading, setReviewLoading] = React.useState<string | null>(null);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [draftByProject, setDraftByProject] = React.useState<Record<string, DecisionDraft>>({});
    const [submitting, setSubmitting] = React.useState<string | null>(null);
    const [approvedLabels, setApprovedLabels] = React.useState<string[] | null>(null);
    const [historyByProject, setHistoryByProject] = React.useState<Record<string, CertificationHistoryEvent[]>>({});
    const [historyOptionsByProject, setHistoryOptionsByProject] = React.useState<Record<string, { eventTypes: Array<{ value: string; label: string }>; actorRoles: string[] }>>({});
    const [historyLoading, setHistoryLoading] = React.useState<string | null>(null);
    const [historyFilters, setHistoryFilters] = React.useState<Record<string, { eventType: string; actorRole: string }>>({});

    const loadQueue = React.useCallback(async (targetScope: CertifierQueueScope) => {
        setLoading(true);
        try {
            const response = await fetchCertifierQueue(targetScope);
            setItems(response.projects || []);
            setCounts(response.counts || { main: 0, corrections: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível carregar a fila da certificadora.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadQueue(scope);
    }, [scope, loadQueue]);

    const toggleReview = async (project: any) => {
        const key = project.friendlyId || project.id;
        if (activeProjectId === key) {
            setActiveProjectId(null);
            return;
        }
        setActiveProjectId(key);
        setActiveTab('resumo');
        if (reviewByProject[key]) return;
        setReviewLoading(key);
        try {
            const review = await fetchCertifierReview(key);
            setReviewByProject((current) => ({ ...current, [key]: review }));
            setDraftByProject((current) => (current[key] ? current : {
                ...current,
                [key]: {
                    decision: 'APPROVE',
                    methodology: review.calculation.methodology ?? '',
                    creditPotential: String(review.calculation.suggestedCreditPotential),
                    creditPotentialAdjustmentReason: '',
                    notes: '',
                    rejectionCategory: '',
                    certificate: null,
                },
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível carregar o dossiê.');
        } finally {
            setReviewLoading(null);
        }
    };

    const updateDraft = (key: string, patch: Partial<DecisionDraft>) => {
        setDraftByProject((current) => ({
            ...current,
            [key]: { ...(current[key] as DecisionDraft), ...patch },
        }));
    };

    const updateHistoryFilter = (key: string, patch: Partial<{ eventType: string; actorRole: string }>) => {
        setHistoryFilters((current) => ({
            ...current,
            [key]: { ...(current[key] || { eventType: '', actorRole: '' }), ...patch },
        }));
    };

    const loadHistory = React.useCallback(async (key: string, filters: { eventType: string; actorRole: string }) => {
        setHistoryLoading(key);
        try {
            const response = await fetchCertificationHistory(key, {
                eventType: filters.eventType || undefined,
                actorRole: filters.actorRole || undefined,
            });
            setHistoryByProject((current) => ({ ...current, [key]: response.events }));
            if (!filters.eventType && !filters.actorRole) {
                setHistoryOptionsByProject((current) => ({
                    ...current,
                    [key]: { eventTypes: response.availableEventTypes, actorRoles: response.availableActorRoles },
                }));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
        } finally {
            setHistoryLoading(null);
        }
    }, []);

    const activeHistoryFilters = activeProjectId ? (historyFilters[activeProjectId] || { eventType: '', actorRole: '' }) : { eventType: '', actorRole: '' };

    React.useEffect(() => {
        if (activeTab !== 'historico' || !activeProjectId) return;
        loadHistory(activeProjectId, activeHistoryFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, activeProjectId, activeHistoryFilters.eventType, activeHistoryFilters.actorRole, loadHistory]);

    const submitDecision = async (project: any) => {
        const key = project.friendlyId || project.id;
        const review = reviewByProject[key];
        const draft = draftByProject[key];
        if (!review || !draft) return;
        setSubmitting(key);
        setError('');
        try {
            const result = await decideCertification(key, {
                decision: draft.decision,
                methodology: draft.decision === 'APPROVE' ? draft.methodology : undefined,
                creditPotential: draft.decision === 'APPROVE' ? Number(draft.creditPotential) : undefined,
                creditPotentialAdjustmentReason: draft.decision === 'APPROVE' ? draft.creditPotentialAdjustmentReason : undefined,
                notes: draft.notes,
                rejectionCategory: draft.decision !== 'APPROVE' ? (draft.rejectionCategory || undefined) : undefined,
                certificate: draft.decision === 'APPROVE' ? draft.certificate : undefined,
            });
            if (draft.decision === 'APPROVE') {
                setApprovedLabels(result.statusLabels);
                setMessage('Certificação aprovada. Certificado anexado e autorização enviada à tesouraria.');
            } else {
                setApprovedLabels(null);
                setMessage('Decisão registrada. O produtor foi notificado da pendência.');
            }
            setReviewByProject((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
            setDraftByProject((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
            setHistoryByProject((current) => {
                const next = { ...current };
                delete next[key];
                return next;
            });
            await loadQueue(scope);
        } catch (err) {
            setError(decisionErrorMessage(err, draft.decision));
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Fluxo MVP</p>
                    <h1 className="text-3xl font-black text-gray-950">Painel da Certificadora</h1>
                    <p className="mt-2 max-w-3xl text-gray-600">
                        Revise projetos auditados ou recém-criados e aprove os créditos para entrada no marketplace.
                    </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                    <ShieldCheck className="h-8 w-8" />
                </div>
            </div>

            {message && (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <p>{message}</p>
                    {approvedLabels && (
                        <div className="flex flex-wrap gap-2">
                            {approvedLabels.map((label) => (
                                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> {label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
                <button onClick={() => setScope('main')} className={`pb-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all relative ${scope === 'main' ? 'text-emerald-600' : 'text-gray-400 hover:text-black'}`}>
                    Fila de decisão
                    {scope === 'main' && <div className="absolute -bottom-[17px] left-0 h-1 w-full rounded-full bg-emerald-600" />}
                </button>
                <button onClick={() => setScope('corrections')} className={`flex items-center gap-2 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all relative ${scope === 'corrections' ? 'text-emerald-600' : 'text-gray-400 hover:text-black'}`}>
                    Aguardando retorno do produtor
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{counts.corrections}</span>
                    {scope === 'corrections' && <div className="absolute -bottom-[17px] left-0 h-1 w-full rounded-full bg-emerald-600" />}
                </button>
            </div>

            <div className="grid gap-5">
                {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Carregando fila da certificadora...</div>}

                {!loading && items.length === 0 && (
                    <div className="space-y-2 rounded-2xl bg-white p-8 shadow-sm">
                        <p className="text-base font-bold text-gray-900">
                            {scope === 'main' ? 'Nenhum projeto pendente de certificação.' : 'Nenhum projeto aguardando retorno do produtor.'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {scope === 'main'
                                ? 'Novos projetos auditados aparecerão aqui automaticamente para revisão.'
                                : 'Pendências enviadas para o produtor aparecem aqui até serem respondidas ou corrigidas.'}
                        </p>
                    </div>
                )}

                {items.map((project) => {
                    const key = project.friendlyId || project.id;
                    const isOpen = activeProjectId === key;
                    const review = reviewByProject[key];
                    const draft = draftByProject[key];
                    const qtagDrafts = review ? buildQtagDrafts(review) : [];
                    const currentHistoryFilters = historyFilters[key] || { eventType: '', actorRole: '' };
                    const currentHistoryEvents = historyByProject[key] || [];
                    const currentHistoryOptions = historyOptionsByProject[key] || { eventTypes: [], actorRoles: [] };

                    return (
                        <article key={project.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600">{project.status}</span>
                                        <span className="text-xs font-mono text-gray-400">{project.friendlyId}</span>
                                    </div>
                                    <h2 className="text-xl font-black text-gray-950">{project.name || project.nome}</h2>
                                    <p className="mt-1 text-sm text-gray-500">{project.location?.city}, {project.location?.state}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Área</p>
                                            <p className="font-bold text-gray-900">{formatNumber(getAreaHa(project))} ha</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Estoque</p>
                                            <p className="font-bold text-gray-900">{formatNumber(getCarbonStock(project))} tCO₂e</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() => toggleReview(project)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        {isOpen ? 'Fechar revisão' : 'Abrir revisão detalhada'}
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
                                    {reviewLoading === key && (
                                        <div className="text-sm font-semibold text-gray-500">Carregando dossiê de certificação...</div>
                                    )}

                                    {review && (
                                        <>
                                            {!review.dossier.complete && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                                                    Dossiê incompleto: reúna baseline, as quatro QTAGs/geofence válidas e os documentos obrigatórios antes de decidir. Uma pendência será gerada para o produtor corrigir.
                                                </div>
                                            )}

                                            <div className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-3">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    {review.dossier.baseline.present ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    )}
                                                    Baseline {review.dossier.baseline.present ? 'presente' : 'ausente'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                    <Tag className="h-4 w-4 text-emerald-600" />
                                                    {review.dossier.tags.valid}/{review.dossier.tags.required} vértices válidos
                                                </div>
                                                <div className="text-sm font-semibold text-gray-700">
                                                    {review.dossier.documents.missingGroups.length > 0
                                                        ? `Faltando: ${review.dossier.documents.missingGroups.join(', ')}`
                                                        : 'Documentos obrigatórios completos'}
                                                </div>
                                            </div>

                                            <nav className="flex gap-6 overflow-x-auto border-b border-gray-100">
                                                {TABS.map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`relative flex items-center gap-2.5 whitespace-nowrap pb-5 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400 hover:text-black'}`}
                                                    >
                                                        <tab.icon className="h-4 w-4" />
                                                        {tab.label}
                                                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-emerald-600" />}
                                                    </button>
                                                ))}
                                            </nav>

                                            {activeTab === 'resumo' && (
                                                <section className="space-y-6">
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Nome</p>
                                                            <p className="font-bold text-gray-900">{review.project.name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Código</p>
                                                            <p className="font-mono text-sm font-bold text-gray-900">{review.project.friendlyId}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Localização</p>
                                                            <p className="font-bold text-gray-900">{review.project.location?.city}, {review.project.location?.state}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Área</p>
                                                            <p className="font-bold text-gray-900">{formatNumber(review.project.metrics?.totalAreaHa)} ha</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Estoque</p>
                                                            <p className="font-bold text-gray-900">{formatNumber(review.project.metrics?.carbonStock)} tCO₂e</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Metodologia</p>
                                                            <p className="font-bold text-gray-900">{review.project.methodology}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Status atual</p>
                                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600">{review.project.status}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Produtor</p>
                                                            <p className="font-bold text-gray-900">{review.project.entities?.developer?.name || 'Não informado'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Certificadora</p>
                                                            <p className="font-bold text-gray-900">{review.project.entities?.certifier?.name || 'Não informado'}</p>
                                                        </div>
                                                    </div>

                                                    {review.pendencies.filter((pendency) => pendency.status === 'OPEN').length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold uppercase text-gray-400">Pendências abertas</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {review.pendencies.filter((pendency) => pendency.status === 'OPEN').map((pendency) => (
                                                                    <span key={pendency.id} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                                                                        {PENDENCY_CATEGORY_OPTIONS.find((option) => option.value === pendency.category)?.label || pendency.category}: {pendency.description}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </section>
                                            )}

                                            {activeTab === 'qtags' && (
                                                <section className="space-y-6">
                                                    <ProjectGeofencePreview tags={qtagDrafts} />
                                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                        {review.tags.map((tag: any) => (
                                                            <div key={tag.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                                                <p className="text-xs font-bold uppercase text-gray-400">Vértice {tag.vertex}</p>
                                                                <p className="mt-1 text-sm font-bold text-gray-900">{tag.status}</p>
                                                                <p className="mt-1 text-xs text-gray-600">{tag.hasQtag ? `${tag.tagUid} · ${tag.cmac}` : 'Sem QTAG física'}</p>
                                                                <p className="mt-1 font-mono text-xs text-gray-500">{tag.latitude}, {tag.longitude}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {activeTab === 'documentos' && (
                                                <section className="space-y-4">
                                                    <div className="grid gap-3">
                                                        {review.documents.map((doc: any) => {
                                                            const satisfiesDossier = review.dossier.documents.presentTypes.includes(String(doc.type).toUpperCase());
                                                            return (
                                                                <div key={doc.id} className={`rounded-xl border p-4 ${satisfiesDossier ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <p className="text-sm font-bold text-gray-900">{documentTypeLabel(doc.type)}</p>
                                                                        <span className="text-xs font-semibold text-gray-500">{formatBytes(doc.sizeBytes)} · {doc.mimeType}</span>
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-gray-500">Enviado em {formatDateTime(doc.uploadedAt)}</p>
                                                                    <p className="mt-1 break-all font-mono text-[10px] text-gray-500">{doc.sha256Hash}</p>
                                                                </div>
                                                            );
                                                        })}
                                                        {review.documents.length === 0 && <EmptyState text="Nenhum documento enviado para este projeto." />}
                                                    </div>
                                                    {review.certificate && (
                                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                                            <p className="text-sm font-bold text-emerald-800">Certificado da certificação</p>
                                                            <p className="mt-1 break-all font-mono text-[10px] text-emerald-700">{review.certificate.sha256}</p>
                                                            <p className="mt-1 text-xs text-emerald-700">Anexado em {formatDateTime(review.certificate.uploadedAt)}</p>
                                                        </div>
                                                    )}
                                                </section>
                                            )}

                                            {activeTab === 'calculo' && (
                                                <section className="space-y-4">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-gray-400">Potencial de crédito sugerido</p>
                                                        <p className="text-3xl font-black text-gray-950">{formatNumber(review.calculation.suggestedCreditPotential)} tCO₂e</p>
                                                        <p className="mt-1 text-xs text-gray-500">Este valor é uma sugestão editável na aba Decisão.</p>
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Fórmula</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.formula}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Origem</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.source}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Metodologia</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.methodology || 'Não informado'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Cobertura vegetal</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.vegetationCoverPct != null ? `${review.calculation.vegetationCoverPct.toFixed(1)}%` : 'Não informado'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">NDVI médio</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.ndviMean != null ? review.calculation.ndviMean.toFixed(3) : 'Não informado'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Área</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.areaHectares != null ? `${formatNumber(review.calculation.areaHectares)} ha` : 'Não informado'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase text-gray-400">Estoque de carbono</p>
                                                            <p className="text-sm font-semibold text-gray-800">{review.calculation.carbonStock != null ? `${formatNumber(review.calculation.carbonStock)} tCO₂e` : 'Não informado'}</p>
                                                        </div>
                                                    </div>
                                                </section>
                                            )}

                                            {activeTab === 'decisao' && draft && (
                                                <section className="space-y-6">
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDraft(key, { decision: 'APPROVE' })}
                                                            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 ${draft.decision !== 'APPROVE' ? 'opacity-40' : ''}`}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" /> Aprovar certificação
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDraft(key, { decision: 'REQUEST_CHANGES' })}
                                                            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 ${draft.decision !== 'REQUEST_CHANGES' ? 'opacity-40' : ''}`}
                                                        >
                                                            <RotateCcw className="h-4 w-4" /> Solicitar ajustes
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDraft(key, { decision: 'REJECT' })}
                                                            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 ${draft.decision !== 'REJECT' ? 'opacity-40' : ''}`}
                                                        >
                                                            <XCircle className="h-4 w-4" /> Reprovar projeto
                                                        </button>
                                                    </div>

                                                    {draft.decision === 'APPROVE' && (
                                                        <div className="space-y-4">
                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                <label className="space-y-1">
                                                                    <span className="text-xs font-bold uppercase text-gray-400">Metodologia</span>
                                                                    <input
                                                                        value={draft.methodology}
                                                                        onChange={(event) => updateDraft(key, { methodology: event.target.value })}
                                                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                    />
                                                                </label>
                                                                <label className="space-y-1">
                                                                    <span className="text-xs font-bold uppercase text-gray-400">Potencial de crédito (tCO₂e)</span>
                                                                    <input
                                                                        type="number"
                                                                        value={draft.creditPotential}
                                                                        onChange={(event) => updateDraft(key, { creditPotential: event.target.value })}
                                                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                    />
                                                                </label>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                                <span>Sugerido pelo sistema: {review.calculation.suggestedCreditPotential} tCO₂e</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateDraft(key, { creditPotential: String(review.calculation.suggestedCreditPotential), creditPotentialAdjustmentReason: '' })}
                                                                    className="rounded-lg border border-gray-200 px-2 py-1 font-bold text-gray-700 hover:bg-gray-50"
                                                                >
                                                                    Usar valor sugerido
                                                                </button>
                                                            </div>
                                                            {Math.abs(Number(draft.creditPotential || 0) - review.calculation.suggestedCreditPotential) > CREDIT_POTENTIAL_TOLERANCE && (
                                                                <label className="block space-y-1">
                                                                    <span className="text-xs font-bold uppercase text-gray-400">Justificativa do ajuste</span>
                                                                    <textarea
                                                                        value={draft.creditPotentialAdjustmentReason}
                                                                        onChange={(event) => updateDraft(key, { creditPotentialAdjustmentReason: event.target.value })}
                                                                        rows={2}
                                                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                    />
                                                                </label>
                                                            )}
                                                            <label className="block space-y-1">
                                                                <span className="text-xs font-bold uppercase text-gray-400">Notas técnicas</span>
                                                                <textarea
                                                                    value={draft.notes}
                                                                    onChange={(event) => updateDraft(key, { notes: event.target.value })}
                                                                    rows={3}
                                                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                />
                                                            </label>
                                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50">
                                                                <Upload className="h-5 w-5 text-gray-400" />
                                                                <span className="mt-2 text-sm font-bold text-gray-800">Anexar certificado (PDF)</span>
                                                                <input
                                                                    type="file"
                                                                    accept="application/pdf"
                                                                    className="sr-only"
                                                                    onChange={(event) => updateDraft(key, { certificate: event.target.files?.[0] ?? null })}
                                                                />
                                                            </label>
                                                            {draft.certificate && (
                                                                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-bold text-gray-800">{draft.certificate.name}</p>
                                                                        <p className="text-xs text-gray-500">{formatBytes(draft.certificate.size)}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateDraft(key, { certificate: null })}
                                                                        aria-label="Remover arquivo"
                                                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {draft.decision !== 'APPROVE' && (
                                                        <div className="space-y-4">
                                                            <label className="block space-y-1">
                                                                <span className="text-xs font-bold uppercase text-gray-400">Categoria</span>
                                                                <select
                                                                    value={draft.rejectionCategory}
                                                                    onChange={(event) => updateDraft(key, { rejectionCategory: event.target.value as PendencyCategory | '' })}
                                                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                >
                                                                    <option value="">Selecione uma categoria</option>
                                                                    {PENDENCY_CATEGORY_OPTIONS.map((option) => (
                                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                            <label className="block space-y-1">
                                                                <span className="text-xs font-bold uppercase text-gray-400">Descrição do motivo</span>
                                                                <textarea
                                                                    value={draft.notes}
                                                                    onChange={(event) => updateDraft(key, { notes: event.target.value })}
                                                                    rows={3}
                                                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                                />
                                                            </label>
                                                        </div>
                                                    )}

                                                    {draft.decision === 'REJECT' && (
                                                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                            Esta decisão fica registrada permanentemente no histórico e não pode ser editada. Selecione uma categoria e descreva o motivo antes de confirmar.
                                                        </p>
                                                    )}
                                                    {draft.decision === 'REQUEST_CHANGES' && (
                                                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                                                            O projeto sai da fila principal e só retorna quando o produtor responder a esta pendência. Descreva claramente o que precisa ser corrigido.
                                                        </p>
                                                    )}

                                                    <button
                                                        type="button"
                                                        disabled={!canSubmit(draft, review) || submitting === key}
                                                        onClick={() => submitDecision(project)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {submitting === key ? 'Enviando decisão...' : 'Confirmar decisão'}
                                                    </button>
                                                </section>
                                            )}

                                            {activeTab === 'historico' && (
                                                <section className="space-y-4">
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <label className="space-y-1">
                                                            <span className="text-xs font-bold uppercase text-gray-400">Tipo de evento</span>
                                                            <select
                                                                value={currentHistoryFilters.eventType}
                                                                onChange={(event) => updateHistoryFilter(key, { eventType: event.target.value })}
                                                                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                            >
                                                                <option value="">Todos</option>
                                                                {currentHistoryOptions.eventTypes.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                        <label className="space-y-1">
                                                            <span className="text-xs font-bold uppercase text-gray-400">Ator</span>
                                                            <select
                                                                value={currentHistoryFilters.actorRole}
                                                                onChange={(event) => updateHistoryFilter(key, { actorRole: event.target.value })}
                                                                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                            >
                                                                <option value="">Todos</option>
                                                                {currentHistoryOptions.actorRoles.map((role) => (
                                                                    <option key={role} value={role}>{role}</option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    </div>

                                                    {historyLoading === key && (
                                                        <div className="text-sm font-semibold text-gray-500">Carregando histórico...</div>
                                                    )}

                                                    {historyLoading !== key && currentHistoryEvents.length === 0 && (
                                                        <EmptyState text="Nenhum evento de certificação registrado para este projeto." />
                                                    )}

                                                    <div className="space-y-6">
                                                        {currentHistoryEvents.map((event) => (
                                                            <div key={event.id} className="flex gap-5">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                                                    <CheckCircle2 className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{event.action} · {new Date(event.createdAt).toLocaleString('pt-BR')}</p>
                                                                    <h4 className="mt-1 text-base font-bold text-black">{event.label}</h4>
                                                                    <p className="mt-1 text-sm text-gray-500">{event.actorRole || 'sistema'}</p>
                                                                    {(event.metadata?.description || event.metadata?.response) && (
                                                                        <p className="mt-1 text-sm text-gray-500">{event.metadata?.description || event.metadata?.response}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
