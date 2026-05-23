import React from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Crosshair,
    FileCheck2,
    Fingerprint,
    Link as LinkIcon,
    Loader2,
    RotateCcw,
    Satellite,
} from 'lucide-react';
import { apiGet, apiPatch } from '../../services/api';
import { database, type MonitoringProjectResponse } from '../../services/database';

type AuditItem = {
    id: string;
    friendlyId: string;
    name: string;
    nome?: string;
    status: string;
    area_hectares?: number;
    carbonStock?: number;
    metrics?: {
        totalAreaHa?: number;
        carbonStock?: number;
    };
    location: { city: string; state: string };
};

type AuditDecision = 'APPROVED' | 'BLOCKED' | 'RECALCULATED';
type AuditCheckKey = 'tagsLocated' | 'tagsIntact' | 'coordinatesMatch' | 'areaPreserved' | 'noDeforestation' | 'noFire' | 'producerControl';

type AuditDraft = {
    observations: string;
    conclusion: string;
    latitude: string;
    longitude: string;
    evidenceUrls: string;
    signature: string;
    checks: Record<AuditCheckKey, boolean>;
};

const formatNumber = (value: number | null | undefined) => (value ?? 0).toLocaleString('pt-BR');
const getAreaHa = (project: AuditItem) => project.metrics?.totalAreaHa ?? project.area_hectares;
const getCarbonStock = (project: AuditItem) => project.metrics?.carbonStock ?? project.carbonStock;
const pageSize = 5;
const checkLabels: Record<AuditCheckKey, string> = {
    tagsLocated: '4 tags NFC 424 DNA localizadas em campo',
    tagsIntact: 'Tags intactas e funcionais',
    coordinatesMatch: 'Coordenadas conferidas com o registro',
    areaPreserved: 'Área preservada conforme baseline',
    noDeforestation: 'Sem sinais de desmatamento',
    noFire: 'Sem sinais de queimada',
    producerControl: 'Produtor mantém controle da área',
};

const createDefaultDraft = (): AuditDraft => ({
    observations: '',
    conclusion: 'Projeto em conformidade. Recomenda-se desbloqueio e disponibilização dos créditos ambientais.',
    latitude: '',
    longitude: '',
    evidenceUrls: '',
    signature: 'Assinado digitalmente pelo auditor responsável',
    checks: {
        tagsLocated: false,
        tagsIntact: false,
        coordinatesMatch: false,
        areaPreserved: false,
        noDeforestation: false,
        noFire: false,
        producerControl: false,
    },
});

const formatDateTime = (value?: string) => {
    if (!value) return 'Sem registro';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const splitEvidenceUrls = (value: string) => value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const statusMark = (checked: boolean) => checked ? '✓' : 'Pendente';

const buildAuditReport = (
    project: AuditItem,
    monitoring: MonitoringProjectResponse | undefined,
    draft: AuditDraft,
    status: AuditDecision,
) => {
    const tagLines = (monitoring?.tags || []).map((tag) =>
        `- Tag ${tag.position}: ${tag.status} em ${tag.latitude.toFixed(4)}, ${tag.longitude.toFixed(4)} ${statusMark(draft.checks.tagsLocated && draft.checks.tagsIntact)}`
    );
    const baseline = monitoring?.baseline;

    return [
        `RELATÓRIO DE AUDITORIA - PROJETO ${project.friendlyId}`,
        `Data: ${new Date().toISOString()}`,
        `Coordenadas GPS do auditor: ${draft.latitude || 'não informado'}, ${draft.longitude || 'não informado'}`,
        '',
        'VERIFICAÇÃO DE TAGS:',
        ...(tagLines.length ? tagLines : ['- Tags NFC 424 DNA ainda sem leitura de monitoramento vinculada.']),
        '',
        'ESTADO DA ÁREA:',
        `- Cobertura Vegetal: ${baseline ? `${baseline.vegetationCoverPct.toFixed(1)}%` : 'não informado'} ${statusMark(draft.checks.areaPreserved)}`,
        `- NDVI: ${baseline ? baseline.ndviMean.toFixed(3) : 'não informado'}`,
        `- Sinais de Desmatamento: ${draft.checks.noDeforestation ? 'Nenhum ✓' : 'Não confirmado'}`,
        `- Sinais de Queimada: ${draft.checks.noFire ? 'Nenhum ✓' : 'Não confirmado'}`,
        `- Controle da Área pelo Produtor: ${statusMark(draft.checks.producerControl)}`,
        '',
        'OBSERVAÇÕES:',
        draft.observations || 'Sem observações adicionais.',
        '',
        `CONCLUSÃO: ${draft.conclusion}`,
        `DECISÃO: ${status}`,
        `Assinado: ${draft.signature}`,
    ].join('\n');
};

export default function AuditorReview() {
    const [items, setItems] = React.useState<AuditItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [message, setMessage] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
    const [monitoringByProject, setMonitoringByProject] = React.useState<Record<string, MonitoringProjectResponse>>({});
    const [evidenceLoading, setEvidenceLoading] = React.useState<string | null>(null);
    const [evidenceError, setEvidenceError] = React.useState('');
    const [draft, setDraft] = React.useState<AuditDraft>(() => createDefaultDraft());

    const loadQueue = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiGet<any>('/audit/queue');
            setItems(response?.projects || []);
            setCurrentPage(1);
            setActiveProjectId(null);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const openEvidenceReview = async (project: AuditItem) => {
        const projectKey = project.friendlyId || project.id;
        if (activeProjectId === projectKey) {
            setActiveProjectId(null);
            return;
        }

        setActiveProjectId(projectKey);
        setDraft(createDefaultDraft());
        setEvidenceError('');
        if (monitoringByProject[projectKey]) return;

        setEvidenceLoading(projectKey);
        try {
            const monitoring = await database.getMonitoringProject(project.friendlyId || project.id);
            setMonitoringByProject((current) => ({ ...current, [projectKey]: monitoring }));
        } catch (error) {
            setEvidenceError(error instanceof Error ? error.message : 'Não foi possível carregar evidências do projeto.');
        } finally {
            setEvidenceLoading(null);
        }
    };

    const updateDraft = (field: keyof Omit<AuditDraft, 'checks'>, value: string) => {
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const updateCheck = (key: AuditCheckKey, checked: boolean) => {
        setDraft((current) => ({ ...current, checks: { ...current.checks, [key]: checked } }));
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setEvidenceError('Geolocalização indisponível neste navegador.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setDraft((current) => ({
                    ...current,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));
            },
            () => setEvidenceError('Não foi possível capturar a localização atual.'),
        );
    };

    const verify = async (project: AuditItem, status: AuditDecision) => {
        const projectKey = project.friendlyId || project.id;
        const monitoring = monitoringByProject[projectKey];
        const latitude = draft.latitude ? Number(draft.latitude) : undefined;
        const longitude = draft.longitude ? Number(draft.longitude) : undefined;
        const evidenceUrls = [
            ...(monitoring?.baseline.evidenceUri ? [monitoring.baseline.evidenceUri] : []),
            ...splitEvidenceUrls(draft.evidenceUrls),
        ];

        await apiPatch(`/audit/verify/${encodeURIComponent(project.id)}`, {
            status,
            laudo_texto: buildAuditReport(project, monitoring, draft, status),
            latitude,
            longitude,
            evidencias_url: evidenceUrls,
            assinatura_digital: draft.signature,
            auditor_id: 'aud-005',
        });
        setMessage(`Auditoria registrada: ${status}`);
        await loadQueue();
    };

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const paginatedItems = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [currentPage, items]);

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Fluxo MVP</p>
                    <h1 className="text-3xl font-black text-gray-950">Fila do Auditor</h1>
                    <p className="mt-2 max-w-3xl text-gray-600">
                        Analise evidências, aprove auditorias, bloqueie riscos e solicite recálculo quando necessário.
                    </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
                    <FileCheck2 className="h-8 w-8" />
                </div>
            </div>

            {message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div>}

            <div className="grid gap-5">
                {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Carregando fila de auditoria...</div>}
                {!loading && items.length === 0 && <div className="rounded-2xl bg-white p-8 shadow-sm">Nenhum projeto pendente de auditoria.</div>}

                {paginatedItems.map((project) => (
                    <article key={project.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600">{project.status}</span>
                                    <span className="text-xs font-mono text-gray-400">{project.friendlyId}</span>
                                </div>
                                <h2 className="text-xl font-black text-gray-950">{project.name || project.nome}</h2>
                                <p className="mt-1 text-sm text-gray-500">{project.location.city}, {project.location.state}</p>
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
                                <button onClick={() => openEvidenceReview(project)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800">
                                    <ClipboardCheck className="h-4 w-4" /> Revisar evidências
                                </button>
                            </div>
                        </div>

                        {activeProjectId === (project.friendlyId || project.id) && (
                            <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
                                {evidenceError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{evidenceError}</div>}
                                {evidenceLoading === (project.friendlyId || project.id) && (
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando dossiê de auditoria...
                                    </div>
                                )}

                                {monitoringByProject[project.friendlyId || project.id] && (
                                    <>
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
                                                <Satellite className="h-4 w-4 text-blue-500" />
                                                Evidências do projeto
                                            </div>
                                            <div className="grid gap-4 lg:grid-cols-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-gray-400">Cena Sentinel</p>
                                                    <p className="font-mono text-sm font-bold text-gray-900">{monitoringByProject[project.friendlyId || project.id].baseline.sentinelSceneId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-gray-400">Cobertura vegetal</p>
                                                    <p className="text-sm font-bold text-gray-900">{monitoringByProject[project.friendlyId || project.id].baseline.vegetationCoverPct.toFixed(1)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-gray-400">NDVI</p>
                                                    <p className="text-sm font-bold text-gray-900">{monitoringByProject[project.friendlyId || project.id].baseline.ndviMean.toFixed(3)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase text-gray-400">Captura</p>
                                                    <p className="text-sm font-bold text-gray-900">{formatDateTime(monitoringByProject[project.friendlyId || project.id].baseline.capturedAt)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 break-all text-sm text-gray-600">
                                                <LinkIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                                {monitoringByProject[project.friendlyId || project.id].baseline.evidenceUri || 'Evidência de baseline não vinculada'}
                                            </div>
                                        </section>

                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
                                                <Fingerprint className="h-4 w-4 text-emerald-600" />
                                                Tags NFC 424 DNA
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                {monitoringByProject[project.friendlyId || project.id].tags.map((tag) => (
                                                    <div key={tag.id} className="border-l-4 border-emerald-500 bg-emerald-50/60 px-4 py-3">
                                                        <p className="text-sm font-black text-gray-950">Tag {tag.position} · {tag.status}</p>
                                                        <p className="mt-1 font-mono text-xs text-gray-600">{tag.latitude.toFixed(6)}, {tag.longitude.toFixed(6)}</p>
                                                        <p className="mt-1 text-xs text-gray-500">Última leitura: {formatDateTime(tag.lastSeenAt)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </>
                                )}

                                <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Checklist de campo
                                        </div>
                                        <div className="grid gap-2">
                                            {(Object.keys(checkLabels) as AuditCheckKey[]).map((key) => (
                                                <label key={key} className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.checks[key]}
                                                        onChange={(event) => updateCheck(key, event.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    {checkLabels[key]}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
                                            <FileCheck2 className="h-4 w-4 text-blue-600" />
                                            Relatório de auditoria
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="space-y-1">
                                                <span className="text-xs font-bold uppercase text-gray-400">Latitude do auditor</span>
                                                <input value={draft.latitude} onChange={(event) => updateDraft('latitude', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="-15.794200" />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-bold uppercase text-gray-400">Longitude do auditor</span>
                                                <input value={draft.longitude} onChange={(event) => updateDraft('longitude', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="-47.882200" />
                                            </label>
                                        </div>
                                        <button type="button" onClick={useCurrentLocation} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                                            <Crosshair className="h-4 w-4" /> Usar GPS atual
                                        </button>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-bold uppercase text-gray-400">Observações</span>
                                            <textarea value={draft.observations} onChange={(event) => updateDraft('observations', event.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Descreva integridade das tags, estado da área, amostras coletadas e qualquer divergência encontrada." />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-bold uppercase text-gray-400">URLs de fotos/documentos</span>
                                            <textarea value={draft.evidenceUrls} onChange={(event) => updateDraft('evidenceUrls', event.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Uma URL por linha ou separada por vírgula" />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-bold uppercase text-gray-400">Conclusão</span>
                                            <textarea value={draft.conclusion} onChange={(event) => updateDraft('conclusion', event.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-bold uppercase text-gray-400">Assinatura digital</span>
                                            <input value={draft.signature} onChange={(event) => updateDraft('signature', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                        </label>
                                    </div>
                                </section>

                                <div className="rounded-xl bg-gray-950 p-4 text-xs text-gray-100">
                                    <p className="mb-2 font-black uppercase tracking-widest text-gray-400">Prévia do relatório</p>
                                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                                        {buildAuditReport(project, monitoringByProject[project.friendlyId || project.id], draft, 'APPROVED')}
                                    </pre>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                                    <button onClick={() => verify(project, 'APPROVED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                                        <CheckCircle2 className="h-4 w-4" /> Aprovar
                                    </button>
                                    <button onClick={() => verify(project, 'RECALCULATED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600">
                                        <RotateCcw className="h-4 w-4" /> Recalcular
                                    </button>
                                    <button onClick={() => verify(project, 'BLOCKED')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">
                                        <AlertTriangle className="h-4 w-4" /> Bloquear
                                    </button>
                                </div>
                            </div>
                        )}
                    </article>
                ))}

                {!loading && items.length > pageSize && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-gray-500">
                            Página {currentPage} de {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
