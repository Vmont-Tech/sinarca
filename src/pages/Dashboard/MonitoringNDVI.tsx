import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Leaf,
    Satellite,
    ShieldCheck,
    AlertCircle,
    Calendar,
    Info,
    History,
    Navigation,
    RefreshCw,
    Fingerprint,
    CloudFog,
} from 'lucide-react';
import { database, type ProjectMRCA, type ProjectPublicDossier } from '../../services/database';
import {
    fetchSatelliteSummary,
    fetchSatelliteObservations,
    fetchEnvironmentalEvents,
    fetchCreditAdjustmentPendencies,
    type SatelliteSummary,
    type SatelliteObservation,
    type EnvironmentalEvent,
    type CreditAdjustmentPendency,
} from '../../services/satelliteMonitoring';

// D-07/SATM-07: campos exibidos aqui SO podem vir de observacao Sentinel-2
// real (baselineSource === 'COPERNICUS'). Qualquer valor sem essa origem
// renderiza '—', nunca um numero plausivel de deterministic_baseline().
const RECONSTRUCTION_POLL_INTERVAL_MS = 30_000;

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Sem registro';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const formatDecimal = (value: number | null | undefined, digits = 3) => (
    value === null || value === undefined ? '—' : value.toFixed(digits)
);

const formatPercent = (value: number | null | undefined) => (
    value === null || value === undefined ? '—' : `${value.toFixed(1)}%`
);

export default function MonitoringNDVI() {
    const { projectId: routeProjectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [projectOptions, setProjectOptions] = useState<ProjectMRCA[]>([]);
    const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(routeProjectId ?? null);

    const [dossier, setDossier] = useState<ProjectPublicDossier | null>(null);
    const [summary, setSummary] = useState<SatelliteSummary | null>(null);
    const [observations, setObservations] = useState<SatelliteObservation[]>([]);
    const [events, setEvents] = useState<EnvironmentalEvent[]>([]);
    const [pendencies, setPendencies] = useState<CreditAdjustmentPendency[]>([]);

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    // Lista de projetos visiveis ao usuario, para o seletor do header quando
    // a rota nao traz :projectId (mesmo padrao de apiGet('/projects') ja
    // usado em outras telas, via database.getRawMarketProjects).
    useEffect(() => {
        let mounted = true;
        database.getRawMarketProjects().then((projects) => {
            if (mounted) setProjectOptions(projects);
        }).catch(() => {
            /* seletor fica vazio; o resto da tela segue funcionando com routeProjectId */
        });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (routeProjectId) {
            setResolvedProjectId(routeProjectId);
            return;
        }
        if (projectOptions.length > 0) {
            setResolvedProjectId(projectOptions[0].friendlyId);
        }
    }, [routeProjectId, projectOptions]);

    const loadAll = useCallback(async (id: string) => {
        setLoadError('');
        try {
            const [dossierData, summaryData, observationsData, eventsData, pendenciesData] = await Promise.all([
                database.getProjectPublicDossier(id),
                fetchSatelliteSummary(id),
                fetchSatelliteObservations(id, { limit: 500 }),
                fetchEnvironmentalEvents(id),
                fetchCreditAdjustmentPendencies(id),
            ]);
            setDossier(dossierData);
            setSummary(summaryData);
            setObservations(observationsData);
            setEvents(eventsData);
            setPendencies(pendenciesData);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o monitoramento satelital deste projeto.');
        }
    }, []);

    useEffect(() => {
        if (!resolvedProjectId) return;
        let mounted = true;
        setLoading(true);
        loadAll(resolvedProjectId).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [resolvedProjectId, loadAll]);

    const handleRefresh = async () => {
        if (!resolvedProjectId) return;
        setIsRefreshing(true);
        try {
            await loadAll(resolvedProjectId);
        } finally {
            setIsRefreshing(false);
        }
    };

    // D-14/UI-SPEC: enquanto a reconstrucao historica esta em andamento e
    // nenhum ponto chegou ainda, a pagina se atualiza sozinha a cada 30s —
    // sem websocket, sem window.location.reload().
    const reconstructing = summary?.lastJob?.jobType === 'HISTORICAL_RECONSTRUCTION'
        && summary.lastJob.status !== 'COMPLETED'
        && observations.length === 0;

    useEffect(() => {
        if (!resolvedProjectId || !reconstructing) return undefined;
        const interval = window.setInterval(() => {
            loadAll(resolvedProjectId);
        }, RECONSTRUCTION_POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [resolvedProjectId, reconstructing, loadAll]);

    if (loading) {
        return <div className="p-20 text-center text-primary">Carregando monitoramento satelital...</div>;
    }

    if (!resolvedProjectId) {
        return <div className="p-20 text-center text-primary">Nenhum projeto disponível para monitoramento.</div>;
    }

    if (loadError) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-[1400px]">
                <div className="bg-sinarca-deep border border-red-500/30 rounded-3xl p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-serif font-bold text-white mb-2">Não foi possível carregar o monitoramento.</h2>
                    <p className="text-text-muted text-sm mb-6">{loadError}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-3 rounded-xl bg-sinarca-forest border border-sinarca-border text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!dossier || !summary) {
        return <div className="p-20 text-center text-primary">Monitoramento não encontrado para este projeto.</div>;
    }

    const project = dossier.project;
    const confirmedCount = summary.eventsByStatus.CONFIRMED ?? 0;
    const reserveOnHold = dossier.integrity?.publicStatus === 'ON_HOLD' || confirmedCount > 0;

    const projectSelector = (
        <select
            value={resolvedProjectId}
            onChange={(event) => navigate(`/painel/monitoramento/${encodeURIComponent(event.target.value)}`)}
            className="bg-black/50 border border-white/10 text-[10px] uppercase font-bold tracking-widest text-white rounded-lg px-3 py-2 backdrop-blur-md"
            aria-label="Selecionar projeto monitorado"
        >
            {!projectOptions.some((option) => option.friendlyId === resolvedProjectId) && (
                <option value={resolvedProjectId}>{project.friendlyId}</option>
            )}
            {projectOptions.map((option) => (
                <option key={option.id} value={option.friendlyId}>{option.friendlyId} — {option.name}</option>
            ))}
        </select>
    );

    // T-05-57: sem credenciais Copernicus, empty state fail-closed. Nenhum
    // mapa/grafico/metrica numerica e renderizado neste ramo.
    if (summary.blocked) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-[1400px] flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">{project.name}</h1>
                        <p className="text-text-muted flex items-center gap-1 text-sm">
                            <Navigation className="w-3 h-3" /> {project.location.city}, {project.location.state}
                        </p>
                    </div>
                    {projectSelector}
                </div>
                <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-8 text-center">
                    <CloudFog className="w-10 h-10 text-orange-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-serif font-bold text-white mb-2">Monitoramento satelital bloqueado.</h2>
                    <p className="text-text-muted text-sm max-w-xl mx-auto">
                        Faltam credenciais do provedor Copernicus neste ambiente. Nenhum dado simulado é exibido —
                        configure <code className="text-sinarca-neon">COPERNICUS_CLIENT_ID</code>/
                        <code className="text-sinarca-neon">COPERNICUS_CLIENT_SECRET</code> para habilitar.
                    </p>
                </div>
            </div>
        );
    }

    if (reconstructing) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-[1400px] flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">{project.name}</h1>
                        <p className="text-text-muted flex items-center gap-1 text-sm">
                            <Navigation className="w-3 h-3" /> {project.location.city}, {project.location.state}
                        </p>
                    </div>
                    {projectSelector}
                </div>
                <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-8 text-center">
                    <Satellite className="w-10 h-10 text-sinarca-neon mx-auto mb-4 animate-pulse" />
                    <h2 className="text-2xl font-serif font-bold text-white mb-2">Reconstrução histórica em andamento.</h2>
                    <p className="text-text-muted text-sm max-w-xl mx-auto">
                        Estamos processando até 5 anos de observações Sentinel-2 para este projeto. A página atualiza
                        automaticamente quando novos pontos chegam.
                    </p>
                </div>
            </div>
        );
    }

    const latest = summary.latestObservation;
    const openPendencies = pendencies.filter((pendency) => pendency.status === 'OPEN');

    const activityItems = project.timeline.map((item, index) => ({
        id: `${project.friendlyId}-${index}`,
        title: item.title,
        description: item.desc,
        date: item.date,
        color: 'text-primary',
    }));

    const metricCards = [
        { label: 'NDVI Atual', val: formatDecimal(latest?.ndviMean), trend: latest?.sceneId ? latest.sceneId.slice(0, 10) : 'Sentinel-2', icon: Leaf, color: 'text-sinarca-neon' },
        { label: 'Cobertura de Nuvem', val: formatPercent(latest?.cloudCoverage), trend: summary.baselineSource === 'COPERNICUS' ? 'Real' : '—', icon: CloudFog, color: 'text-blue-400' },
        { label: 'Pontos Analisados', val: summary.observationCount.toLocaleString('pt-BR'), trend: summary.sentinelStatus ?? '—', icon: Info, color: 'text-blue-400' },
        { label: 'Última Observação', val: formatDateTime(latest?.observedAt), trend: latest?.sceneId ? latest.sceneId.slice(0, 4) : '—', icon: Calendar, color: 'text-primary' },
    ];

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1400px] flex flex-col gap-6 animate-in fade-in duration-700">

            {openPendencies.length > 0 && (
                <div className="flex flex-col gap-2">
                    {openPendencies.map((pendency) => (
                        <div key={pendency.id} className="flex flex-wrap items-center gap-3 bg-amber-50/5 border border-amber-500/20 rounded-xl px-4 py-3">
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Pendência de recálculo de crédito</span>
                            <span className="text-xs text-amber-200">{pendency.description}</span>
                            {pendency.affectedAreaHa !== null && (
                                <span className="text-[10px] text-amber-300 font-mono">{pendency.affectedAreaHa.toFixed(2)} ha afetados</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 1. HEADER E STATUS RÁPIDO */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sinarca-neon/10 border border-sinarca-neon/20 text-sinarca-neon text-[10px] font-bold uppercase tracking-wider">
                            <Satellite className="w-3 h-3" /> Monitoramento Sentinel-2
                        </span>
                        <span className="text-gray-500 text-xs font-mono">{project.friendlyId}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-1">{project.name}</h1>
                    <p className="text-text-muted flex items-center gap-1 text-sm">
                        <Navigation className="w-3 h-3" /> {project.location.city}, {project.location.state}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {projectSelector}
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-3 flex flex-col items-end">
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Status da Reserva</span>
                        <div className={`flex items-center gap-2 ${reserveOnHold ? 'text-orange-400' : 'text-sinarca-neon'}`}>
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-lg font-bold uppercase tracking-widest">{reserveOnHold ? 'Bloqueado' : 'Protegido'}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={`p-4 bg-sinarca-forest border border-sinarca-border rounded-xl text-white hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. GRADE PRINCIPAL: MAPA + STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* MAPA PRINCIPAL (8/12) — placeholder ate a Task 2 portar o Leaflet real */}
                <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-sinarca-border bg-[#00120b] h-[500px] lg:h-[650px] group shadow-2xl flex items-center justify-center">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Mapa Leaflet — Task 2</span>
                </div>

                {/* SIDEBAR DE STATS (4/12) */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Card de QTAGs — agora alimentado por dossier.tags (persistidos), nunca simulado */}
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                <Fingerprint className="w-4 h-4 text-sinarca-neon" /> Rede QTAG
                            </h3>
                            <span className="text-[10px] text-sinarca-neon font-bold px-2 py-0.5 rounded bg-sinarca-neon/10">Inviolável</span>
                        </div>
                        <div className="space-y-4">
                            {dossier.tags.map((tag) => (
                                <div key={String(tag.id)} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sinarca-forest flex items-center justify-center">
                                            <Navigation className="w-4 h-4 text-sinarca-neon" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Vértice {String(tag.vertex)}</p>
                                            <p className="text-[10px] text-text-muted">{tag.hasQtag ? (tag.tagUid || 'UID não registrado') : 'Sem QTAG física'}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${tag.status === 'ACTIVE' ? 'bg-sinarca-neon shadow-[0_0_8px_rgba(0,255,148,0.5)]' : 'bg-gray-600'}`} />
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 border border-sinarca-border rounded-xl text-[10px] font-bold uppercase text-text-muted hover:text-white hover:bg-white/5 transition-all">
                            Validar Presença Física
                        </button>
                    </div>

                    {/* Card de Histórico de Alertas */}
                    <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6 shadow-xl flex-1">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                            <History className="w-4 h-4 text-primary" /> Atividades Recentes
                        </h3>
                        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                            {activityItems.map((item) => (
                                <div key={item.id} className="relative pl-8">
                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-sinarca-deep border border-current flex items-center justify-center z-10 ${item.color}`}>
                                        <Info className="w-3 h-3" />
                                    </div>
                                    <p className="text-xs font-bold text-white">{item.title}</p>
                                    <p className="text-[10px] text-text-muted mb-1">{item.description}</p>
                                    <span className="text-[9px] text-gray-600 font-mono">{item.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. RODAPÉ DE MÉTRICAS DETALHADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricCards.map((stat, i) => (
                    <div key={i} className="bg-sinarca-deep border border-sinarca-border rounded-2xl p-6 hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-white/5 group-hover:scale-110 transition-transform ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-gray-400">
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-serif font-bold text-white">{stat.val}</p>
                    </div>
                ))}
            </div>

        </div>
    );
}
