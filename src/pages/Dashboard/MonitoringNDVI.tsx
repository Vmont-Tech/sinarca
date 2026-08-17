import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Leaf,
    Satellite,
    ShieldCheck,
    AlertCircle,
    AlertTriangle,
    Calendar,
    Info,
    History,
    Navigation,
    RefreshCw,
    Fingerprint,
    CloudFog,
} from 'lucide-react';
import { database, type ProjectMRCA, type ProjectPublicDossier } from '../../services/database';
import { API_BASE_URL } from '../../services/api';
import {
    fetchSatelliteSummary,
    fetchSatelliteObservations,
    fetchEnvironmentalEvents,
    fetchCreditAdjustmentPendencies,
    decideEnvironmentalEvent,
    clearEnvironmentalEvent,
    satelliteEvidenceImageUrl,
    type SatelliteSummary,
    type SatelliteObservation,
    type EnvironmentalEvent,
    type EnvironmentalEventStatus,
    type EnvironmentalEventType,
    type CreditAdjustmentPendency,
    type IntegritySummary,
} from '../../services/satelliteMonitoring';

// D-07/SATM-07: campos exibidos aqui SO podem vir de observacao Sentinel-2
// real (baselineSource === 'COPERNICUS'). Qualquer valor sem essa origem
// renderiza '—', nunca um numero plausivel de deterministic_baseline().
const RECONSTRUCTION_POLL_INTERVAL_MS = 30_000;

type BaseLayerKey = 'RGB' | 'NDVI' | 'NDMI' | 'NBR';
type ChartIndex = 'NDVI' | 'NDMI' | 'NBR';
type OverlayKey = 'BOUNDARY' | 'ANOMALIES' | 'EVENTS';
type LatLngPair = [number, number];

const RGB_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const RGB_TILE_ATTRIBUTION = 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community';

const EVENT_TYPE_LABELS: Record<EnvironmentalEventType, string> = {
    VEGETATION_LOSS: 'Perda de vegetação',
    VEGETATION_RECOVERY: 'Recuperação de vegetação',
    POSSIBLE_FIRE: 'Possível incêndio',
};

// UI-SPEC (Surface B): vocabulario de cor por status de evento. ANALYZED
// reusa a mesma cor de NBR/atencao de proposito (nao e coincidencia).
const EVENT_STATUS_COLORS: Record<EnvironmentalEventStatus, string> = {
    DETECTED: '#60A5FA',
    ANALYZED: '#FB923C',
    CONFIRMED: '#F87171',
    DISMISSED: '#9CBA9C',
};
const EVENT_CLEARED_COLOR = '#00ff94';

// D-24: Anomalies = ainda sem decisao humana (DETECTED/ANALYZED); Events =
// ja decididos (CONFIRMED/DISMISSED) — os 3 estados restantes de status nao
// tem geometria propria, entao o marcador representa o evento sobre a AOI.
const ANOMALY_LAYER_STATUSES: EnvironmentalEventStatus[] = ['DETECTED', 'ANALYZED'];

const CHART_INDEX_COLORS: Record<ChartIndex, string> = {
    NDVI: '#00ff94',
    NDMI: '#38BDF8',
    NBR: '#FB923C',
};
const CHART_INDEX_GETTERS: Record<ChartIndex, (obs: SatelliteObservation) => number | null> = {
    NDVI: (obs) => obs.ndviMean,
    NDMI: (obs) => obs.ndmiMean,
    NBR: (obs) => obs.nbrMean,
};

const INDEX_LEGEND_LABELS: Record<ChartIndex, { left: string; right: string }> = {
    NDVI: { left: 'Baixa Vegetação', right: 'Densa' },
    NDMI: { left: 'Seco', right: 'Úmido' },
    NBR: { left: 'Queimado', right: 'Intacto' },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Rampa red-yellow-green identica a legenda existente
// (from-red-500 via-yellow-400 to-green-500) — nunca uma segunda paleta.
const indexColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '#6b7280';
    const t = clamp01(value);
    const stops: [[number, number, number], [number, number, number]] = t < 0.5
        ? [[239, 68, 68], [250, 204, 21]]
        : [[250, 204, 21], [34, 197, 94]];
    const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const [r1, g1, b1] = stops[0];
    const [r2, g2, b2] = stops[1];
    const r = Math.round(r1 + (r2 - r1) * localT);
    const g = Math.round(g1 + (g2 - g1) * localT);
    const b = Math.round(b1 + (b2 - b1) * localT);
    return `rgb(${r}, ${g}, ${b})`;
};

// Normalizacao pura testavel por leitura (UI-SPEC): x = index/(n-1)*100,
// y = 100 - ((valor-min)/(max-min))*100. Pontos nulos quebram o path em um
// novo segmento M — nunca interpolar por cima de dado ausente.
const buildIndexPath = (
    observations: SatelliteObservation[],
    getValue: (obs: SatelliteObservation) => number | null,
    min: number,
    max: number,
): { d: string; dots: Array<{ x: number; y: number; id: string }> } => {
    const span = Math.max(max - min, 0.000001);
    const count = observations.length;
    let d = '';
    let segmentOpen = false;
    const dots: Array<{ x: number; y: number; id: string }> = [];
    observations.forEach((obs, index) => {
        const value = getValue(obs);
        const x = count > 1 ? (index / (count - 1)) * 100 : 50;
        if (value === null || value === undefined) {
            segmentOpen = false;
            return;
        }
        const y = 100 - ((value - min) / span) * 100;
        dots.push({ x, y, id: obs.id });
        d += `${segmentOpen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
        segmentOpen = true;
    });
    return { d: d.trim(), dots };
};

const computeChartBounds = (observations: SatelliteObservation[], activeIndices: ChartIndex[]): { min: number; max: number } => {
    const values: number[] = [];
    observations.forEach((obs) => {
        activeIndices.forEach((index) => {
            const value = CHART_INDEX_GETTERS[index](obs);
            if (value !== null && value !== undefined) values.push(value);
        });
    });
    if (values.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? { min: min - 0.1, max: max + 0.1 } : { min, max };
};

// Chaves conhecidas de metadata_['correlation'] (monitoring.py:342-346) —
// chaves desconhecidas sao ignoradas no render (D-18: correlacao so explica,
// nunca altera severidade/status).
const CORRELATION_LABELS: Record<string, string> = {
    confirmed_events_count: 'Eventos confirmados anteriores',
    stale_qtags: 'QTAGs desatualizadas',
    consecutive_drops: 'Quedas consecutivas de NDVI',
};

// D-22: copy travada usada em 3 pontos da UI (botao, cabecalho do painel
// inline, botao de envio) — uma unica constante evita divergencia de texto
// e mantem a string literal no fonte exatamente uma vez.
const CLEAR_REVIEW_LABEL = 'Registrar revisão e liberar bloqueio';

const anomalyMonthsFrom = (events: EnvironmentalEvent[]): Set<string> => {
    const set = new Set<string>();
    events.forEach((event) => {
        if (!event.detectedAt) return;
        set.add(event.detectedAt.slice(0, 7));
    });
    return set;
};

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
    const [projectQuery, setProjectQuery] = useState('');
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const projectPickerRef = useRef<HTMLDivElement | null>(null);

    const [dossier, setDossier] = useState<ProjectPublicDossier | null>(null);
    const [summary, setSummary] = useState<SatelliteSummary | null>(null);
    const [observations, setObservations] = useState<SatelliteObservation[]>([]);
    const [events, setEvents] = useState<EnvironmentalEvent[]>([]);
    const [pendencies, setPendencies] = useState<CreditAdjustmentPendency[]>([]);

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    const [baseLayer, setBaseLayer] = useState<BaseLayerKey>('RGB');
    const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({ BOUNDARY: true, ANOMALIES: true, EVENTS: false });
    const [chartIndices, setChartIndices] = useState<ChartIndex[]>(['NDVI']);

    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [sliderValue, setSliderValue] = useState(50);
    const [eventImages, setEventImages] = useState<Record<string, { loading: boolean; missing: boolean; before?: string; after?: string }>>({});
    const [decisionPanel, setDecisionPanel] = useState<Record<string, 'CONFIRM' | 'DISMISS' | 'CLEAR' | null>>({});
    const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
    const [decisionSubmitting, setDecisionSubmitting] = useState<string | null>(null);
    const [decisionError, setDecisionError] = useState<Record<string, string>>({});
    const [integrityOverride, setIntegrityOverride] = useState<IntegritySummary | null>(null);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const baseLayerRef = useRef<L.TileLayer | null>(null);
    const overlayRef = useRef<L.LayerGroup | null>(null);

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

    // Título da aba do navegador reflete o projeto monitorado; index.html
    // fixa <title>Sinarca</title> e nenhuma tela deste app o atualiza hoje.
    // Restaura o título padrão ao desmontar para não deixar rótulo obsoleto
    // em outras telas.
    useEffect(() => {
        const projectName = dossier?.project?.name;
        const friendlyId = dossier?.project?.friendlyId;
        document.title = projectName
            ? `${projectName} (${friendlyId}) — Monitoramento Sentinel-2 | SINARCA`
            : 'SINARCA';
        return () => {
            document.title = 'SINARCA';
        };
    }, [dossier]);

    // Combobox de busca do seletor de projeto (item A do checkpoint 05-09):
    // fecha ao clicar fora, sem lib nova.
    useEffect(() => {
        if (!projectPickerOpen) return undefined;
        const handleOutsideClick = (event: MouseEvent) => {
            if (projectPickerRef.current && !projectPickerRef.current.contains(event.target as Node)) {
                setProjectPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [projectPickerOpen]);

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

    // D-19: BEFORE_IMAGE/AFTER_IMAGE buscadas com fetch autenticado e
    // convertidas para blob — nunca src direto de <img> (a rota pode exigir
    // bearer). URL.createObjectURL sempre pareado com revokeObjectURL no
    // cleanup, para evitar vazamento de memoria ao expandir varios eventos.
    useEffect(() => {
        if (!activeEventId || !resolvedProjectId) return undefined;
        const event = events.find((item) => item.id === activeEventId);
        if (!event) return undefined;
        const beforeEvidence = event.evidence.find((item) => item.kind === 'BEFORE_IMAGE');
        const afterEvidence = event.evidence.find((item) => item.kind === 'AFTER_IMAGE');
        if (!beforeEvidence || !afterEvidence) {
            setEventImages((current) => ({ ...current, [activeEventId]: { loading: false, missing: true } }));
            return undefined;
        }

        let cancelled = false;
        let createdBeforeUrl = '';
        let createdAfterUrl = '';
        setEventImages((current) => ({ ...current, [activeEventId]: { loading: true, missing: false } }));

        const token = localStorage.getItem('sinarca_token');
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        Promise.all([
            fetch(`${API_BASE_URL}${satelliteEvidenceImageUrl(resolvedProjectId, activeEventId, beforeEvidence.id)}`, { headers: authHeaders }),
            fetch(`${API_BASE_URL}${satelliteEvidenceImageUrl(resolvedProjectId, activeEventId, afterEvidence.id)}`, { headers: authHeaders }),
        ]).then(async ([beforeResponse, afterResponse]) => {
            if (cancelled) return;
            if (!beforeResponse.ok || !afterResponse.ok) {
                setEventImages((current) => ({ ...current, [activeEventId]: { loading: false, missing: true } }));
                return;
            }
            const [beforeBlob, afterBlob] = await Promise.all([beforeResponse.blob(), afterResponse.blob()]);
            if (cancelled) return;
            createdBeforeUrl = URL.createObjectURL(beforeBlob);
            createdAfterUrl = URL.createObjectURL(afterBlob);
            setEventImages((current) => ({
                ...current,
                [activeEventId]: { loading: false, missing: false, before: createdBeforeUrl, after: createdAfterUrl },
            }));
        }).catch(() => {
            if (!cancelled) setEventImages((current) => ({ ...current, [activeEventId]: { loading: false, missing: true } }));
        });

        return () => {
            cancelled = true;
            if (createdBeforeUrl) URL.revokeObjectURL(createdBeforeUrl);
            if (createdAfterUrl) URL.revokeObjectURL(createdAfterUrl);
        };
    }, [activeEventId, resolvedProjectId, events]);

    const toggleEventRow = (eventId: string) => {
        setActiveEventId((current) => (current === eventId ? null : eventId));
        setSliderValue(50);
    };

    // D-18/D-22: decisao humana e desbloqueio auditavel usam o mesmo padrao —
    // aplica o `integrity` da resposta imediatamente (feedback instantaneo no
    // card "Status da Reserva"), depois recarrega events/pendencies via
    // loadAll (nunca um reload completo da pagina) e converge para a fonte real.
    const submitDecision = async (event: EnvironmentalEvent, decision: 'CONFIRMED' | 'DISMISSED') => {
        if (!resolvedProjectId) return;
        const notes = (decisionNotes[event.id] || '').trim();
        if (!notes) return;
        setDecisionSubmitting(event.id);
        setDecisionError((current) => ({ ...current, [event.id]: '' }));
        try {
            const result = await decideEnvironmentalEvent(resolvedProjectId, event.id, decision, notes);
            setIntegrityOverride(result.integrity);
            setDecisionPanel((current) => ({ ...current, [event.id]: null }));
            await loadAll(resolvedProjectId);
            setIntegrityOverride(null);
        } catch (error) {
            setDecisionError((current) => ({
                ...current,
                [event.id]: error instanceof Error ? error.message : 'Não foi possível registrar a decisão.',
            }));
        } finally {
            setDecisionSubmitting(null);
        }
    };

    const submitClear = async (event: EnvironmentalEvent) => {
        if (!resolvedProjectId) return;
        const notes = (decisionNotes[event.id] || '').trim();
        if (!notes) return;
        setDecisionSubmitting(event.id);
        setDecisionError((current) => ({ ...current, [event.id]: '' }));
        try {
            const result = await clearEnvironmentalEvent(resolvedProjectId, event.id, notes);
            setIntegrityOverride(result.integrity);
            setDecisionPanel((current) => ({ ...current, [event.id]: null }));
            await loadAll(resolvedProjectId);
            setIntegrityOverride(null);
        } catch (error) {
            setDecisionError((current) => ({
                ...current,
                [event.id]: error instanceof Error ? error.message : 'Não foi possível registrar a liberação.',
            }));
        } finally {
            setDecisionSubmitting(null);
        }
    };

    // D-14/UI-SPEC: enquanto a reconstrucao historica esta em andamento e
    // nenhum ponto chegou ainda, a pagina se atualiza sozinha a cada 30s —
    // sem websocket, sem reload completo da pagina.
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

    // O card do mapa so existe visualmente no ramo "dashboard completo" (nem
    // loading, nem erro, nem bloqueado, nem reconstruindo) — mesmo gate
    // shouldRenderMap de ProjectGeofencePreview.tsx, calculado aqui (antes
    // dos early returns, hooks nunca podem ser condicionais).
    const mapReady = !loading && !loadError && Boolean(dossier) && Boolean(summary) && !summary?.blocked && !reconstructing;

    // GEOF-05: GeoJSON e [lon, lat]; Leaflet quer [lat, lng] — inverter aqui,
    // exatamente como ProjectGeofencePreview.tsx ja faz. O anel vem fechado
    // (primeiro ponto repetido no fim): slice(0, -1) remove a repeticao.
    const boundaryLatLngs = useMemo<LatLngPair[]>(() => {
        const ring = (dossier?.boundary?.active ?? dossier?.boundary?.declared)?.coordinates?.[0];
        if (!ring || ring.length < 4) return [];
        return ring.slice(0, -1).map(([lng, lat]) => [lat, lng] as LatLngPair);
    }, [dossier]);

    const centroid = useMemo<LatLngPair | null>(() => {
        if (boundaryLatLngs.length === 0) return null;
        const sum = boundaryLatLngs.reduce((acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng] as LatLngPair, [0, 0] as LatLngPair);
        return [sum[0] / boundaryLatLngs.length, sum[1] / boundaryLatLngs.length];
    }, [boundaryLatLngs]);

    // Mount/unmount do mapa (identico a ProjectGeofencePreview.tsx:194-222).
    useEffect(() => {
        if (!mapReady) {
            mapRef.current?.remove();
            mapRef.current = null;
            baseLayerRef.current = null;
            overlayRef.current = null;
            return undefined;
        }
        if (!mapContainerRef.current || mapRef.current) return undefined;

        const map = L.map(mapContainerRef.current, {
            attributionControl: true,
            scrollWheelZoom: true,
            zoomControl: true,
        });
        const layer = L.layerGroup().addTo(map);
        mapRef.current = map;
        overlayRef.current = layer;
        window.setTimeout(() => map.invalidateSize(), 0);

        return () => {
            map.remove();
            mapRef.current = null;
            baseLayerRef.current = null;
            overlayRef.current = null;
        };
    }, [mapReady]);

    // Camada base RGB (unica camada base que e um tile real — NDVI/NDMI/NBR
    // colorem a AOI, D-09, nao existe tile de indice nesta fase).
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return undefined;
        if (baseLayer !== 'RGB') {
            if (baseLayerRef.current) {
                baseLayerRef.current.removeFrom(map);
                baseLayerRef.current = null;
            }
            return undefined;
        }
        const tileLayer = L.tileLayer(RGB_TILE_URL, { attribution: RGB_TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        tileLayer.bringToBack();
        baseLayerRef.current = tileLayer;
        return () => {
            tileLayer.removeFrom(map);
            if (baseLayerRef.current === tileLayer) baseLayerRef.current = null;
        };
    }, [mapReady, baseLayer]);

    // D-09: a Statistical API devolve estatisticas agregadas por AOI, nao tiles.
    // A camada de indice colore a propria AOI pelo valor agregado da observacao
    // mais recente — nunca renderiza um raster que o backend nao possui.
    useEffect(() => {
        const map = mapRef.current;
        const layer = overlayRef.current;
        if (!mapReady || !map || !layer) return;
        layer.clearLayers();

        const latestObservation = summary?.latestObservation ?? null;

        if (baseLayer !== 'RGB' && boundaryLatLngs.length >= 3) {
            const value = latestObservation ? CHART_INDEX_GETTERS[baseLayer](latestObservation) : null;
            const color = indexColor(value);
            L.polygon(boundaryLatLngs, { color, fillColor: color, fillOpacity: 0.35, opacity: 0.9, weight: 2 }).addTo(layer);
        }

        if (overlays.BOUNDARY && boundaryLatLngs.length >= 3) {
            L.polygon(boundaryLatLngs, {
                color: '#00ff94',
                fillColor: '#00ff94',
                fillOpacity: 0.15,
                opacity: 0.95,
                weight: 3,
            }).addTo(layer);
        }

        // Eventos desta fase nao tem geometria propria (project_events nao
        // guarda geometry) — o marcador representa o evento sobre a AOI, nao
        // um poligono de dano.
        if ((overlays.ANOMALIES || overlays.EVENTS) && centroid) {
            events.forEach((event, index) => {
                const isAnomaly = ANOMALY_LAYER_STATUSES.includes(event.status);
                if (isAnomaly && !overlays.ANOMALIES) return;
                if (!isAnomaly && !overlays.EVENTS) return;
                const color = event.clearedAt ? EVENT_CLEARED_COLOR : EVENT_STATUS_COLORS[event.status];
                const jitter = (index % 7) * 0.00025;
                const marker = L.circleMarker([centroid[0] + jitter, centroid[1] + jitter], {
                    radius: 8,
                    color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                }).addTo(layer);
                marker.bindTooltip(`${EVENT_TYPE_LABELS[event.type]} · ${event.severity} · ${formatDateTime(event.detectedAt)}`);
            });
        }

        if (boundaryLatLngs.length >= 3) {
            const bounds = L.latLngBounds(boundaryLatLngs);
            map.fitBounds(bounds.pad(0.25), { animate: false, maxZoom: 15 });
        } else if (centroid) {
            map.setView(centroid, 13, { animate: false });
        }
    }, [mapReady, baseLayer, overlays, boundaryLatLngs, centroid, events, summary]);

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
    const effectivePublicStatus = integrityOverride?.publicStatus ?? dossier.integrity?.publicStatus;
    const reserveOnHold = effectivePublicStatus === 'ON_HOLD' || confirmedCount > 0;

    // Combobox com busca client-side (item A, checkpoint 05-09): o <select>
    // HTML puro listando todos os projetos do seed (~900) era inutilizavel.
    // projectOptions ja esta carregado; filtro por friendlyId ou name, sem
    // lib nova, seguindo o padrao visual escuro do resto da pagina.
    const normalizedProjectQuery = projectQuery.trim().toLowerCase();
    const filteredProjectOptions = normalizedProjectQuery
        ? projectOptions.filter((option) => (
            option.friendlyId.toLowerCase().includes(normalizedProjectQuery)
            || option.name.toLowerCase().includes(normalizedProjectQuery)
        ))
        : projectOptions;

    const selectProject = (friendlyId: string) => {
        setProjectPickerOpen(false);
        setProjectQuery('');
        navigate(`/painel/monitoramento/${encodeURIComponent(friendlyId)}`);
    };

    const projectSelector = (
        <div className="relative" ref={projectPickerRef}>
            <button
                type="button"
                onClick={() => setProjectPickerOpen((current) => !current)}
                aria-haspopup="listbox"
                aria-expanded={projectPickerOpen}
                aria-label="Selecionar projeto monitorado"
                className="bg-black/50 border border-white/10 text-[10px] uppercase font-bold tracking-widest text-white rounded-lg px-3 py-2 backdrop-blur-md min-w-[220px] flex items-center justify-between gap-2"
            >
                <span className="truncate">{project.friendlyId} — {project.name}</span>
                <span className="text-text-muted" aria-hidden="true">▾</span>
            </button>
            {projectPickerOpen && (
                <div className="absolute right-0 z-[1100] mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-sinarca-deep shadow-2xl">
                    <div className="sticky top-0 bg-sinarca-deep border-b border-white/10 p-2">
                        <input
                            type="text"
                            value={projectQuery}
                            onChange={(event) => setProjectQuery(event.target.value)}
                            placeholder="Buscar por ID ou nome do projeto"
                            aria-label="Buscar projeto por ID ou nome"
                            autoFocus
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-sinarca-neon"
                        />
                    </div>
                    <ul role="listbox" aria-label="Projetos disponíveis para monitoramento">
                        {filteredProjectOptions.length === 0 ? (
                            <li className="px-3 py-3 text-[10px] text-text-muted uppercase font-bold tracking-widest">Nenhum projeto encontrado.</li>
                        ) : (
                            filteredProjectOptions.slice(0, 50).map((option) => (
                                <li key={option.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={option.friendlyId === resolvedProjectId}
                                        onClick={() => selectProject(option.friendlyId)}
                                        className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${option.friendlyId === resolvedProjectId ? 'text-sinarca-neon' : 'text-white'}`}
                                    >
                                        <span className="block font-mono text-[10px]">{option.friendlyId}</span>
                                        <span className="block truncate text-[10px] text-text-muted">{option.name}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );

    // T-05-57: sem credenciais Copernicus, empty state fail-closed. Nenhum
    // mapa/grafico/metrica numerica e renderizado neste ramo.
    if (summary.blocked) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-[1400px] flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-950 mb-1">{project.name}</h1>
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
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-950 mb-1">{project.name}</h1>
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

    const chartBounds = computeChartBounds(observations, chartIndices);
    const chartPaths = chartIndices.map((index) => ({
        index,
        color: CHART_INDEX_COLORS[index],
        ...buildIndexPath(observations, CHART_INDEX_GETTERS[index], chartBounds.min, chartBounds.max),
    }));
    const chartAnomalyMonths = anomalyMonthsFrom(events);
    const chartDateLabels = observations.length > 0
        ? [
            observations[0],
            observations[Math.floor((observations.length - 1) / 2)],
            observations[observations.length - 1],
        ].map((obs) => formatDateTime(obs.observedAt))
        : [];
    const legendLabels = baseLayer !== 'RGB' ? INDEX_LEGEND_LABELS[baseLayer] : null;
    const legendValue = baseLayer !== 'RGB' && latest ? CHART_INDEX_GETTERS[baseLayer](latest) : null;

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
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-950 mb-1">{project.name}</h1>
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

                {/* MAPA PRINCIPAL (8/12) — Leaflet real, mecanica portada de ProjectGeofencePreview.tsx */}
                <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-sinarca-border bg-[#00120b] h-[500px] lg:h-[650px] group shadow-2xl">
                    <div ref={mapContainerRef} className="absolute inset-0" aria-label={`Mapa de monitoramento satelital de ${project.name}`} />

                    {/* Controles do Mapa — dois grupos independentes (D-24: nao merge em 7-way exclusivo) */}
                    <div className="absolute top-6 left-6 flex flex-col gap-4 z-[1000]">
                        <div role="radiogroup" aria-label="Camada base" className="flex flex-col gap-2">
                            {(['RGB', 'NDVI', 'NDMI', 'NBR'] as BaseLayerKey[]).map((layer) => (
                                <button
                                    key={layer}
                                    type="button"
                                    role="radio"
                                    aria-checked={baseLayer === layer}
                                    onClick={() => setBaseLayer(layer)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${baseLayer === layer ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                                >
                                    {layer}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2" aria-label="Camadas de sobreposição">
                            <button
                                type="button"
                                aria-pressed={overlays.BOUNDARY}
                                onClick={() => setOverlays((current) => ({ ...current, BOUNDARY: !current.BOUNDARY }))}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${overlays.BOUNDARY ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                            >
                                Boundary
                            </button>
                            <button
                                type="button"
                                aria-pressed={overlays.ANOMALIES}
                                onClick={() => setOverlays((current) => ({ ...current, ANOMALIES: !current.ANOMALIES }))}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${overlays.ANOMALIES ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                            >
                                Anomalies
                            </button>
                            <button
                                type="button"
                                aria-pressed={overlays.EVENTS}
                                onClick={() => setOverlays((current) => ({ ...current, EVENTS: !current.EVENTS }))}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${overlays.EVENTS ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                            >
                                Events
                            </button>
                        </div>
                    </div>

                    {/* Legenda — swap de rotulos/valor conforme indice ativo, nunca uma segunda legenda */}
                    {legendLabels && (
                        <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl max-w-[200px] z-[1000]">
                            <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold mb-2">
                                <span>{legendLabels.left}</span>
                                <span>{legendLabels.right}</span>
                            </div>
                            <div className="h-2 w-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full mb-3"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white font-mono">{baseLayer}: {formatDecimal(legendValue)}</span>
                            </div>
                        </div>
                    )}

                    {/* Info Satélite */}
                    <div className="absolute top-6 right-6 flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full z-[1000]">
                        <div className="w-2 h-2 rounded-full bg-sinarca-neon animate-pulse"></div>
                        <span className="text-[10px] text-white font-bold uppercase tracking-widest">Sincronizado com Sentinel-2B</span>
                    </div>
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

            {/* SÉRIE TEMPORAL — SVG inline, sem biblioteca de grafico (UI-SPEC) */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h3 className="text-white font-serif font-bold text-lg">Série temporal de índices</h3>
                    <div className="flex flex-wrap gap-2">
                        {(['NDVI', 'NDMI', 'NBR'] as ChartIndex[]).map((index) => (
                            <button
                                key={index}
                                type="button"
                                aria-pressed={chartIndices.includes(index)}
                                onClick={() => setChartIndices((current) => (
                                    current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
                                ))}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${chartIndices.includes(index) ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
                            >
                                {index}
                            </button>
                        ))}
                    </div>
                </div>

                {observations.length < 2 ? (
                    <p className="text-text-muted text-sm py-10 text-center">Ainda não há pontos suficientes para a série temporal.</p>
                ) : (
                    <>
                        <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold tracking-widest mb-2">
                            <span>Mín: {chartBounds.min.toFixed(3)}</span>
                            <span>Máx: {chartBounds.max.toFixed(3)}</span>
                        </div>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-48">
                            {observations.map((obs, index) => {
                                const month = obs.observedAt.slice(0, 7);
                                if (!chartAnomalyMonths.has(month)) return null;
                                const x = observations.length > 1 ? (index / (observations.length - 1)) * 100 : 50;
                                return <circle key={`halo-${obs.id}`} cx={x} cy={98} r="1.6" fill="#F87171" fillOpacity="0.35" />;
                            })}
                            {chartPaths.map((path) => (
                                <g key={path.index}>
                                    <path d={path.d} stroke={path.color} fill="none" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                                    {path.dots.map((dot) => (
                                        <circle key={`${path.index}-${dot.id}`} cx={dot.x} cy={dot.y} r="0.9" fill={path.color} />
                                    ))}
                                </g>
                            ))}
                        </svg>
                        <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold tracking-widest mt-2">
                            {chartDateLabels.map((label, index) => <span key={index}>{label}</span>)}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4">
                            {chartPaths.map((path) => (
                                <span key={path.index} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }} />
                                    {path.index}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ANOMALIAS E EVENTOS AMBIENTAIS — card novo, "Atividades Recentes" permanece intacto acima (UI-SPEC) */}
            <div className="bg-sinarca-deep border border-sinarca-border rounded-3xl p-6">
                <h3 className="text-white font-serif font-bold text-lg mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" /> Anomalias e eventos ambientais
                </h3>

                {events.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-white font-bold text-sm mb-1">Nenhuma anomalia detectada.</p>
                        <p className="text-text-muted text-xs max-w-md mx-auto">
                            O monitoramento contínuo compara observações mensais de NDVI; anomalias aparecem aqui
                            automaticamente quando detectadas.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                        {events.map((event) => {
                            const isActive = activeEventId === event.id;
                            const dotColor = event.clearedAt ? EVENT_CLEARED_COLOR : EVENT_STATUS_COLORS[event.status];
                            const isHighSeverity = event.severity === 'HIGH' || event.severity === 'CRITICAL';
                            const images = eventImages[event.id];
                            const hasBothImages = Boolean(images && !images.missing && images.before && images.after);

                            return (
                                <div key={event.id} className="relative pl-8">
                                    <div
                                        className="absolute left-0 top-1 w-6 h-6 rounded-full bg-sinarca-deep border-2 flex items-center justify-center z-10"
                                        style={{ borderColor: dotColor, color: dotColor }}
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                    </div>
                                    <button type="button" onClick={() => toggleEventRow(event.id)} className="w-full text-left">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className="text-xs font-bold text-white">{EVENT_TYPE_LABELS[event.type]}</p>
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isHighSeverity ? 'text-red-400 bg-red-400/10' : 'text-text-muted bg-white/5'}`}>
                                                {event.severity}
                                            </span>
                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5" style={{ color: dotColor }}>
                                                {event.status}
                                            </span>
                                            {event.clearedAt && (
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-sinarca-neon bg-sinarca-neon/10">Revisado</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-text-muted mb-1">{event.summary || 'Sem resumo disponível.'}</p>
                                        <span className="text-[9px] text-gray-600 font-mono">{formatDateTime(event.detectedAt)}</span>
                                    </button>

                                    {isActive && (
                                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                <div>
                                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Área afetada</p>
                                                    <p className="text-white font-mono">{event.affectedAreaHa !== null ? `${event.affectedAreaHa.toFixed(2)} ha` : '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">NDVI antes → depois</p>
                                                    <p className="text-white font-mono">{formatDecimal(event.ndviBefore)} → {formatDecimal(event.ndviAfter)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Confiança</p>
                                                    <p className="text-white font-mono">{formatPercent(event.confidence)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Severidade</p>
                                                    <p className="text-white font-mono">{event.severity}</p>
                                                </div>
                                            </div>

                                            {event.correlation && (
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Correlação</p>
                                                    <ul className="text-xs text-white space-y-0.5">
                                                        {Object.entries(event.correlation).map(([key, value]) => {
                                                            const label = CORRELATION_LABELS[key];
                                                            if (!label) return null;
                                                            const display = Array.isArray(value)
                                                                ? (value.length > 0 ? value.join(', ') : 'nenhuma')
                                                                : String(value);
                                                            return <li key={key}>{label}: {display}</li>;
                                                        })}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Slider before/after — input oculto visualmente mas operavel por teclado (UI-SPEC) */}
                                            {hasBothImages ? (
                                                <div className="rounded-3xl border border-sinarca-border bg-[#00120b] overflow-hidden">
                                                    <div className="relative aspect-video overflow-hidden rounded-2xl">
                                                        <img src={images!.after} alt="Imagem depois do evento" className="absolute inset-0 h-full w-full object-cover" />
                                                        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}>
                                                            <img src={images!.before} alt="Imagem antes do evento" className="h-full w-full object-cover" />
                                                        </div>
                                                        <div className="absolute inset-y-0 w-px bg-sinarca-neon" style={{ left: `${sliderValue}%` }} />
                                                        <span className="absolute top-6 left-6 text-[10px] text-white font-bold uppercase tracking-widest">Antes</span>
                                                        <span className="absolute top-6 right-6 text-[10px] text-white font-bold uppercase tracking-widest">Depois</span>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={100}
                                                            value={sliderValue}
                                                            onChange={(rangeEvent) => setSliderValue(Number(rangeEvent.target.value))}
                                                            aria-label="Comparar imagem antes e depois"
                                                            className="absolute inset-x-0 bottom-0 w-full cursor-ew-resize opacity-0 h-full"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-3xl border border-sinarca-border bg-[#00120b] p-6 text-center">
                                                    <p className="text-text-muted text-xs">
                                                        {images?.loading
                                                            ? 'Carregando imagens...'
                                                            : 'Imagem antes/depois ainda não disponível — só é gerada quando a anomalia avança para análise.'}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Decisao humana (D-18) — botoes so em ANALYZED */}
                                            {event.status === 'DETECTED' && (
                                                <p className="text-xs text-text-muted italic">Aguardando correlação automática.</p>
                                            )}

                                            {(event.status === 'CONFIRMED' || event.status === 'DISMISSED') && (
                                                <div className="text-xs text-white">
                                                    <p className="font-bold uppercase text-[10px] text-text-muted mb-1">Decisão registrada</p>
                                                    <p>{event.decidedAt ? formatDateTime(event.decidedAt) : '—'} — {event.decisionNotes || 'Sem observações.'}</p>
                                                </div>
                                            )}

                                            {event.status === 'ANALYZED' && (
                                                <div className="flex flex-col gap-3">
                                                    {decisionPanel[event.id] !== 'CONFIRM' && decisionPanel[event.id] !== 'DISMISS' && (
                                                        <div className="flex flex-wrap gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: 'CONFIRM' }))}
                                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                                                            >
                                                                Confirmar anomalia
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: 'DISMISS' }))}
                                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                                                            >
                                                                Descartar anomalia
                                                            </button>
                                                        </div>
                                                    )}

                                                    {decisionPanel[event.id] === 'CONFIRM' && (
                                                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                                                            <h4 className="text-sm font-bold text-white">Confirmar anomalia</h4>
                                                            <p className="text-xs text-text-muted">
                                                                Esta decisão fica registrada permanentemente na trilha de auditoria e pode bloquear o
                                                                projeto automaticamente (Auto Hold) se o risco calculado for crítico. Descreva a
                                                                justificativa da confirmação.
                                                            </p>
                                                            <textarea
                                                                value={decisionNotes[event.id] || ''}
                                                                onChange={(textEvent) => setDecisionNotes((current) => ({ ...current, [event.id]: textEvent.target.value }))}
                                                                className="w-full min-h-[80px] rounded-lg bg-black/40 border border-white/10 text-white text-xs p-3"
                                                                placeholder="Justificativa obrigatória"
                                                            />
                                                            {decisionError[event.id] && <p className="text-xs text-red-400">{decisionError[event.id]}</p>}
                                                            <div className="flex flex-wrap gap-3">
                                                                <button
                                                                    type="button"
                                                                    disabled={!decisionNotes[event.id]?.trim() || decisionSubmitting === event.id}
                                                                    onClick={() => submitDecision(event, 'CONFIRMED')}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    {decisionSubmitting === event.id ? 'Enviando...' : 'Confirmar anomalia'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: null }))}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {decisionPanel[event.id] === 'DISMISS' && (
                                                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                                                            <h4 className="text-sm font-bold text-white">Descartar anomalia</h4>
                                                            <p className="text-xs text-text-muted">
                                                                A anomalia será marcada como descartada e não afeta o score de risco do projeto.
                                                                Descreva por que ela não procede.
                                                            </p>
                                                            <textarea
                                                                value={decisionNotes[event.id] || ''}
                                                                onChange={(textEvent) => setDecisionNotes((current) => ({ ...current, [event.id]: textEvent.target.value }))}
                                                                className="w-full min-h-[80px] rounded-lg bg-black/40 border border-white/10 text-white text-xs p-3"
                                                                placeholder="Justificativa obrigatória"
                                                            />
                                                            {decisionError[event.id] && <p className="text-xs text-red-400">{decisionError[event.id]}</p>}
                                                            <div className="flex flex-wrap gap-3">
                                                                <button
                                                                    type="button"
                                                                    disabled={!decisionNotes[event.id]?.trim() || decisionSubmitting === event.id}
                                                                    onClick={() => submitDecision(event, 'DISMISSED')}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    {decisionSubmitting === event.id ? 'Enviando...' : 'Descartar anomalia'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: null }))}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Desbloqueio auditavel (D-22) — so para CONFIRMED ainda nao revisado */}
                                            {event.status === 'CONFIRMED' && !event.clearedAt && (
                                                <div className="flex flex-col gap-3">
                                                    {decisionPanel[event.id] !== 'CLEAR' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: 'CLEAR' }))}
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                                                        >
                                                            {CLEAR_REVIEW_LABEL}
                                                        </button>
                                                    ) : (
                                                        <div className="rounded-xl border border-sinarca-neon/30 bg-sinarca-neon/5 p-4 space-y-3">
                                                            <h4 className="text-sm font-bold text-white">{CLEAR_REVIEW_LABEL}</h4>
                                                            <textarea
                                                                value={decisionNotes[event.id] || ''}
                                                                onChange={(textEvent) => setDecisionNotes((current) => ({ ...current, [event.id]: textEvent.target.value }))}
                                                                className="w-full min-h-[80px] rounded-lg bg-black/40 border border-white/10 text-white text-xs p-3"
                                                                placeholder="Justificativa obrigatória"
                                                            />
                                                            {decisionError[event.id] && <p className="text-xs text-red-400">{decisionError[event.id]}</p>}
                                                            <div className="flex flex-wrap gap-3">
                                                                <button
                                                                    type="button"
                                                                    disabled={!decisionNotes[event.id]?.trim() || decisionSubmitting === event.id}
                                                                    onClick={() => submitClear(event)}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sinarca-neon/30 px-4 py-3 text-sm font-bold text-sinarca-neon transition hover:bg-sinarca-neon/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    {decisionSubmitting === event.id ? 'Enviando...' : CLEAR_REVIEW_LABEL}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDecisionPanel((current) => ({ ...current, [event.id]: null }))}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
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
