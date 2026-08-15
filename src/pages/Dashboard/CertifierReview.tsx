import React from 'react';
import {
    AlertTriangle,
    Calculator,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    FileText,
    History,
    ShieldCheck,
    Tag,
} from 'lucide-react';
import ProjectGeofencePreview from '../../components/ProjectGeofencePreview';
import type { ProjectTagDraft, VertexLabel } from '../../services/projectOrigination';
import {
    fetchCertifierQueue,
    fetchCertifierReview,
    PENDENCY_CATEGORY_OPTIONS,
    type CertifierQueueScope,
    type CertifierReviewDossier,
} from '../../services/certifierReview';

type TabId = 'resumo' | 'qtags' | 'documentos' | 'calculo' | 'decisao' | 'historico';

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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível carregar o dossiê.');
        } finally {
            setReviewLoading(null);
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

            {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
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
                    const qtagDrafts = review ? buildQtagDrafts(review) : [];

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

                                            {activeTab === 'decisao' && (
                                                <EmptyState text="Formulário de decisão em construção (Task 3)." />
                                            )}

                                            {activeTab === 'historico' && (
                                                <EmptyState text="Linha do tempo filtrável em construção (Task 3)." />
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
