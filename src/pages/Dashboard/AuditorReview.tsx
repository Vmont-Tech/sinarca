import React from 'react';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Copy,
    Crosshair,
    FileCheck2,
    FileUp,
    Fingerprint,
    Link as LinkIcon,
    Loader2,
    MapPin,
    RotateCcw,
    Satellite,
    Search,
    Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
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

type AuditEvidenceFile = {
    id: string;
    name: string;
    size: number;
    type: string;
    localUrl: string;
};

type AuditDraft = {
    observations: string;
    conclusion: string;
    latitude: string;
    longitude: string;
    evidenceFiles: AuditEvidenceFile[];
    signature: string;
    checks: Record<AuditCheckKey, boolean>;
};

const formatNumber = (value: number | null | undefined) => (value ?? 0).toLocaleString('pt-BR');
const getAreaHa = (project: AuditItem) => project.metrics?.totalAreaHa ?? project.area_hectares;
const getCarbonStock = (project: AuditItem) => project.metrics?.carbonStock ?? project.carbonStock;
const pageSize = 5;
const MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIT_EVIDENCE_FILE_LIMIT_TEXT = 'Limite máximo: 10 MB por arquivo';
const MAX_AUDIT_EVIDENCE_FILE_REJECTION_PREFIX = 'Arquivos acima de 10 MB não foram anexados';
const checkLabels: Record<AuditCheckKey, string> = {
    tagsLocated: 'QTAGs NFC 424 DNA localizadas em campo',
    tagsIntact: 'Tags intactas e funcionais',
    coordinatesMatch: 'Coordenadas conferidas com o registro',
    areaPreserved: 'Área preservada conforme baseline',
    noDeforestation: 'Sem sinais de desmatamento',
    noFire: 'Sem sinais de queimada',
    producerControl: 'Produtor mantém controle da área',
};

const createDefaultDraft = (auditorName?: string): AuditDraft => ({
    observations: '',
    conclusion: 'Projeto em conformidade. Recomenda-se desbloqueio e disponibilização dos créditos ambientais.',
    latitude: '',
    longitude: '',
    evidenceFiles: [],
    signature: auditorName ? `Assinado digitalmente por ${auditorName}` : 'Assinado digitalmente pelo auditor responsável',
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

const normalizeText = (value: string | number | null | undefined) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const statusMark = (checked: boolean) => checked ? '✓' : 'Pendente';
const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

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
    const evidenceLines = draft.evidenceFiles.map((file) => `- ${file.name} (${file.type || 'arquivo'}) -> ${file.localUrl}`);

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
        'EVIDÊNCIAS ANEXADAS:',
        ...(evidenceLines.length ? evidenceLines : ['- Nenhum arquivo anexado nesta revisão.']),
        '',
        `CONCLUSÃO: ${draft.conclusion}`,
        `DECISÃO: ${status}`,
        `Assinado: ${draft.signature}`,
    ].join('\n');
};

export default function AuditorReview() {
    const { user } = useAuth();
    const [items, setItems] = React.useState<AuditItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [message, setMessage] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [locationFilter, setLocationFilter] = React.useState('all');
    const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
    const [monitoringByProject, setMonitoringByProject] = React.useState<Record<string, MonitoringProjectResponse>>({});
    const [evidenceLoading, setEvidenceLoading] = React.useState<string | null>(null);
    const [evidenceError, setEvidenceError] = React.useState('');
    const [draft, setDraft] = React.useState<AuditDraft>(() => createDefaultDraft(user?.name));
    const [copiedProjectId, setCopiedProjectId] = React.useState<string | null>(null);

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

    React.useEffect(() => {
        setCurrentPage(1);
        setActiveProjectId(null);
    }, [searchTerm, locationFilter]);

    const openEvidenceReview = async (project: AuditItem) => {
        const projectKey = project.friendlyId || project.id;
        if (activeProjectId === projectKey) {
            setActiveProjectId(null);
            return;
        }

        setActiveProjectId(projectKey);
        setDraft(createDefaultDraft(user?.name));
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

    const addEvidenceFiles = (project: AuditItem, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const projectKey = project.friendlyId || project.id;
        const timestamp = Date.now();
        const selectedFiles = Array.from(files);
        const acceptedFiles = selectedFiles.filter((file) => file.size <= MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES);
        const rejectedFiles = selectedFiles.filter((file) => file.size > MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES);
        const evidenceFiles = acceptedFiles.map((file, index) => ({
            id: `${timestamp}-${index}-${file.name}`,
            name: file.name,
            size: file.size,
            type: file.type || 'arquivo local',
            localUrl: `local://auditoria/${projectKey}/${encodeURIComponent(file.name)}`,
        }));
        setEvidenceError(
            rejectedFiles.length > 0
                ? `${MAX_AUDIT_EVIDENCE_FILE_REJECTION_PREFIX}: ${rejectedFiles.map((file) => file.name).join(', ')}.`
                : ''
        );
        setDraft((current) => ({
            ...current,
            evidenceFiles: [...current.evidenceFiles, ...evidenceFiles],
        }));
    };

    const removeEvidenceFile = (fileId: string) => {
        setDraft((current) => ({
            ...current,
            evidenceFiles: current.evidenceFiles.filter((file) => file.id !== fileId),
        }));
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
            ...draft.evidenceFiles.map((file) => file.localUrl),
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

    const copyReportPreview = async (project: AuditItem) => {
        const projectKey = project.friendlyId || project.id;
        const reportPreview = buildAuditReport(project, monitoringByProject[projectKey], draft, 'APPROVED');
        try {
            await navigator.clipboard.writeText(reportPreview);
            setCopiedProjectId(projectKey);
            window.setTimeout(() => {
                setCopiedProjectId((current) => current === projectKey ? null : current);
            }, 1800);
        } catch {
            setEvidenceError('Não foi possível copiar o relatório para a área de transferência.');
        }
    };

    const locationOptions = React.useMemo(() => {
        const options = new Map<string, string>();
        items.forEach((project) => {
            const city = project.location.city;
            const state = project.location.state;
            const uf = project.location.stateId || state;
            const value = normalizeText(`${city}|${state}|${uf}`);
            options.set(value, `${city}, ${state}`);
        });
        return Array.from(options.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    }, [items]);

    const filteredItems = React.useMemo(() => {
        const query = normalizeText(searchTerm);
        return items.filter((project) => {
            const projectText = normalizeText([
                project.name,
                project.nome,
                project.friendlyId,
                project.id,
            ].join(' '));
            const locationText = normalizeText(`${project.location.city}|${project.location.state}|${project.location.stateId}`);
            const matchesSearch = !query || projectText.includes(query);
            const matchesLocation = locationFilter === 'all' || locationText === locationFilter;
            return matchesSearch && matchesLocation;
        });
    }, [items, locationFilter, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const paginatedItems = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [currentPage, filteredItems]);

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

            <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_280px]">
                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-gray-400">Buscar por projeto ou código</span>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-500"
                            placeholder="Nome, código PRC ou hash"
                        />
                    </div>
                </label>
                <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-gray-400">Local/UF</span>
                    <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <select
                            value={locationFilter}
                            onChange={(event) => setLocationFilter(event.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-500"
                        >
                            <option value="all">Todos os locais/UFs</option>
                            {locationOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </label>
            </div>

            <div className="grid gap-5">
                {loading && <div className="rounded-2xl bg-white p-8 shadow-sm">Carregando fila de auditoria...</div>}
                {!loading && items.length === 0 && <div className="rounded-2xl bg-white p-8 shadow-sm">Nenhum projeto pendente de auditoria.</div>}
                {!loading && items.length > 0 && filteredItems.length === 0 && <div className="rounded-2xl bg-white p-8 shadow-sm">Nenhum projeto encontrado com os filtros selecionados.</div>}

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
                                <Link
                                    to={`/painel/mrca/${project.friendlyId || project.id}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                                >
                                    <ArrowUpRight className="h-4 w-4" /> Abrir página do projeto
                                </Link>
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
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold uppercase text-gray-400">Fotos/documentos da vistoria</span>
                                            <p className="text-xs font-semibold text-gray-500">{MAX_AUDIT_EVIDENCE_FILE_LIMIT_TEXT}</p>
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50">
                                                <FileUp className="h-6 w-6 text-blue-600" />
                                                <span className="mt-2 text-sm font-bold text-gray-800">Selecionar arquivos</span>
                                                <span className="mt-1 text-xs text-gray-500">Evidência local até o envio definitivo</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*,.pdf,.doc,.docx,.heic"
                                                    className="sr-only"
                                                    onChange={(event) => {
                                                        addEvidenceFiles(project, event.currentTarget.files);
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                            {draft.evidenceFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold uppercase text-gray-400">Arquivos selecionados</p>
                                                    {draft.evidenceFiles.map((file) => (
                                                        <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-bold text-gray-800">{file.name}</p>
                                                                <p className="text-xs text-gray-500">Tamanho: {formatFileSize(file.size)}</p>
                                                                <p className="break-all text-xs text-gray-500">{file.localUrl}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEvidenceFile(file.id)}
                                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                                title="Remover arquivo"
                                                                aria-label={`Remover ${file.name}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                                            <span className="text-xs font-bold uppercase text-gray-400">Conclusão</span>
                                            <textarea value={draft.conclusion} onChange={(event) => updateDraft('conclusion', event.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-xs font-bold uppercase text-gray-400">Assinatura digital</span>
                                            <input value={draft.signature} onChange={(event) => updateDraft('signature', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                        </label>
                                    </div>
                                </section>

                                <div className="group relative rounded-xl bg-gray-950 p-4 text-xs text-gray-100">
                                    <div className="mb-2 flex items-center justify-between gap-3 pr-28">
                                        <p className="font-black uppercase tracking-widest text-gray-400">Prévia do relatório</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => copyReportPreview(project)}
                                        className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-sm transition hover:bg-white/20 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-300 group-hover:opacity-100"
                                        title="Copiar relatório"
                                        aria-label="Copiar relatório"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copiedProjectId === (project.friendlyId || project.id) ? 'Relatório copiado' : 'Copiar relatório'}
                                    </button>
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

                {!loading && filteredItems.length > pageSize && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-gray-500">
                            Página {currentPage} de {totalPages} · {filteredItems.length} projetos
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
