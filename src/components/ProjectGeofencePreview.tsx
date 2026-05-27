import { useEffect, useMemo, useRef, useState } from 'react';
import L, { type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import {
    MIN_PROJECT_TAGS,
    calculatePolygonArea,
    orderTagsForPolygon,
    parseProjectCoordinate,
    validateTagDrafts,
    type ProjectTagDraft,
    type VertexLabel,
} from '../services/projectOrigination';

type ProjectGeofencePreviewProps = {
    tags: ProjectTagDraft[];
};

type CoordinateTag = {
    vertex_label: VertexLabel;
    latitude: number;
    longitude: number;
    displayLatitude: string;
    displayLongitude: string;
};

type PreviewMapLayer = 'street' | 'satellite';
type TechnicalPreviewLayer = 'grid' | 'satellite';

const PREVIEW_BASE_LAYERS: Record<PreviewMapLayer, { url: string; attribution: string; maxZoom: number }> = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
    },
};

const TECHNICAL_SATELLITE_TEXTURE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/38/23';

const coordinateIsValid = (value: string, min: number, max: number) => {
    const parsed = parseProjectCoordinate(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

const coordinateTags = (tags: ProjectTagDraft[]) => (
    tags
        .filter((tag) => coordinateIsValid(tag.latitude, -90, 90) && coordinateIsValid(tag.longitude, -180, 180))
        .map((tag) => ({
            vertex_label: tag.vertex_label,
            latitude: parseProjectCoordinate(tag.latitude),
            longitude: parseProjectCoordinate(tag.longitude),
            displayLatitude: tag.latitude,
            displayLongitude: tag.longitude,
        }))
);

const paddedBounds = (points: CoordinateTag[]) => {
    const latitudes = points.map((tag) => tag.latitude);
    const longitudes = points.map((tag) => tag.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latPad = Math.max((maxLat - minLat) * 0.25, 0.002);
    const lngPad = Math.max((maxLng - minLng) * 0.25, 0.002);

    return {
        minLat: minLat - latPad,
        maxLat: maxLat + latPad,
        minLng: minLng - lngPad,
        maxLng: maxLng + lngPad,
    };
};

const projectToPreview = (point: CoordinateTag, bounds: ReturnType<typeof paddedBounds>) => {
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.000001);
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
    return {
        ...point,
        x: ((point.longitude - bounds.minLng) / lngSpan) * 100,
        y: ((bounds.maxLat - point.latitude) / latSpan) * 100,
    };
};

const markerIcon = (vertex: VertexLabel, validArea: boolean) => L.divIcon({
    className: '',
    html: `<div class="sinarca-leaflet-marker${validArea ? '' : ' sinarca-leaflet-marker-warning'}">${vertex}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const technicalPreview = (
    previewPoints: ReturnType<typeof projectToPreview>[],
    points: string,
    technicalPreviewLayer: TechnicalPreviewLayer,
    setTechnicalPreviewLayer: (layer: TechnicalPreviewLayer) => void,
) => (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-900">Preview técnico</p>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Camada do preview técnico normalizado">
                <button
                    type="button"
                    onClick={() => setTechnicalPreviewLayer('grid')}
                    className={`min-h-8 rounded-md px-2 text-[10px] font-extrabold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${technicalPreviewLayer === 'grid' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:bg-white/70'}`}
                    aria-pressed={technicalPreviewLayer === 'grid'}
                >
                    Grade
                </button>
                <button
                    type="button"
                    onClick={() => setTechnicalPreviewLayer('satellite')}
                    className={`min-h-8 rounded-md px-2 text-[10px] font-extrabold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${technicalPreviewLayer === 'satellite' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:bg-white/70'}`}
                    aria-pressed={technicalPreviewLayer === 'satellite'}
                >
                    Satélite
                </button>
            </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-md border border-gray-100 bg-gray-50">
            <svg className="h-full w-full" viewBox="0 0 100 100" role="img" aria-label="Polígono técnico da geofence do projeto">
                <defs>
                    <pattern id="technical-satellite-layer" patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={TECHNICAL_SATELLITE_TEXTURE} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity="0.74" />
                    </pattern>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill={technicalPreviewLayer === 'satellite' ? 'url(#technical-satellite-layer)' : '#f9fafb'} />
                <path d="M20 0V100M40 0V100M60 0V100M80 0V100M0 20H100M0 40H100M0 60H100M0 80H100" stroke={technicalPreviewLayer === 'satellite' ? 'rgba(255,255,255,0.5)' : '#e5e7eb'} strokeWidth="0.6" />
                <polygon points={points} fill="rgba(22, 163, 74, 0.22)" stroke="#047857" strokeWidth="1.4" />
                {previewPoints.map((tag) => (
                    <g key={tag.vertex_label}>
                        <circle cx={tag.x} cy={tag.y} r="3.2" fill="#ffffff" stroke="#047857" strokeWidth="1.1" />
                        <text x={tag.x} y={tag.y + 1.2} textAnchor="middle" className="fill-gray-950 text-[3.4px] font-bold">
                            {tag.vertex_label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    </div>
);

export default function ProjectGeofencePreview({ tags }: ProjectGeofencePreviewProps) {
    const [previewMapLayer, setPreviewMapLayer] = useState<PreviewMapLayer>('street');
    const [technicalPreviewLayer, setTechnicalPreviewLayer] = useState<TechnicalPreviewLayer>('grid');
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const baseLayerRef = useRef<L.TileLayer | null>(null);
    const layerRef = useRef<L.LayerGroup | null>(null);
    const validCoordinateTags = useMemo(() => coordinateTags(tags), [tags]);
    const validation = validateTagDrafts(tags);
    const polygonArea = calculatePolygonArea(validCoordinateTags);
    const hasArea = validCoordinateTags.length >= MIN_PROJECT_TAGS && polygonArea > 0.000000001;
    const shouldRenderMap = validCoordinateTags.length > 0;
    const orderedMapPoints = useMemo(
        () => (hasArea ? orderTagsForPolygon(validCoordinateTags) : []),
        [hasArea, validCoordinateTags],
    );
    const mapPoints = hasArea ? orderedMapPoints : validCoordinateTags;
    const bounds = hasArea ? paddedBounds(orderedMapPoints) : null;
    const previewPoints = bounds ? orderedMapPoints.map((tag) => projectToPreview(tag, bounds)) : [];
    const points = previewPoints.map((tag) => `${tag.x},${tag.y}`).join(' ');

    useEffect(() => {
        if (!shouldRenderMap) {
            mapRef.current?.remove();
            mapRef.current = null;
            baseLayerRef.current = null;
            layerRef.current = null;
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
        layerRef.current = layer;

        window.setTimeout(() => map.invalidateSize(), 0);

        return () => {
            map.remove();
            mapRef.current = null;
            baseLayerRef.current = null;
            layerRef.current = null;
        };
    }, [shouldRenderMap]);

    useEffect(() => {
        const map = mapRef.current;
        if (!shouldRenderMap || !map) return undefined;

        const config = PREVIEW_BASE_LAYERS[previewMapLayer];
        const baseLayer = L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: config.maxZoom,
        }).addTo(map);
        baseLayer.bringToBack();
        baseLayerRef.current = baseLayer;

        return () => {
            baseLayer.removeFrom(map);
            if (baseLayerRef.current === baseLayer) {
                baseLayerRef.current = null;
            }
        };
    }, [previewMapLayer, shouldRenderMap]);

    useEffect(() => {
        const map = mapRef.current;
        const layer = layerRef.current;
        if (!shouldRenderMap || !map || !layer || mapPoints.length === 0) return;

        layer.clearLayers();

        const leafletPoints = mapPoints.map((point) => [point.latitude, point.longitude] as LatLngExpression);

        if (hasArea) {
            L.polygon(leafletPoints, {
                color: '#047857',
                fillColor: '#16a34a',
                fillOpacity: 0.24,
                opacity: 0.95,
                weight: 3,
            }).addTo(layer);
        } else if (leafletPoints.length >= 2) {
            L.polyline(leafletPoints, {
                color: '#d97706',
                dashArray: '8 8',
                opacity: 0.95,
                weight: 3,
            }).addTo(layer);
        }

        mapPoints.forEach((point) => {
            L.marker([point.latitude, point.longitude], {
                icon: markerIcon(point.vertex_label, hasArea),
                keyboard: true,
                title: `Vértice ${point.vertex_label}`,
            }).addTo(layer);
        });

        if (leafletPoints.length === 1) {
            map.setView(leafletPoints[0], 13, { animate: false });
            return;
        }

        const leafletBounds = L.latLngBounds(leafletPoints);
        map.fitBounds(leafletBounds.pad(0.25), { animate: false, maxZoom: 15 });
    }, [hasArea, mapPoints, shouldRenderMap]);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-700" />
                    <div>
                        <h4 className="text-sm font-extrabold uppercase text-gray-900">Preview da geofence</h4>
                        <p className="text-xs font-semibold text-gray-600">Mínimo 4 vértices; área fechada no mapa</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {shouldRenderMap && (
                        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Camada do preview técnico">
                            <button
                                type="button"
                                onClick={() => setPreviewMapLayer('street')}
                                className={`min-h-10 rounded-md px-3 text-xs font-extrabold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${previewMapLayer === 'street'
                                    ? 'bg-white text-gray-950 shadow-sm'
                                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-950'}`}
                                aria-pressed={previewMapLayer === 'street'}
                            >
                                Mapa
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewMapLayer('satellite')}
                                className={`min-h-10 rounded-md px-3 text-xs font-extrabold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${previewMapLayer === 'satellite'
                                    ? 'bg-white text-gray-950 shadow-sm'
                                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-950'}`}
                                aria-pressed={previewMapLayer === 'satellite'}
                            >
                                Satélite
                            </button>
                        </div>
                    )}
                    <span className={`inline-flex min-h-10 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${hasArea ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {hasArea ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {hasArea ? 'área válida' : 'sem área'}
                    </span>
                </div>
            </div>

            <div className={`grid gap-4 ${hasArea ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]' : ''}`}>
                <div className="aspect-[4/3] min-h-[260px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {shouldRenderMap ? (
                        <div
                            ref={mapContainerRef}
                            className="h-full min-h-[260px] w-full bg-gray-100"
                            aria-label={`Preview ${previewMapLayer === 'satellite' ? 'satélite' : 'OpenStreetMap'} da geofence do projeto`}
                        />
                    ) : (
                        <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
                            <AlertTriangle className="mb-3 h-8 w-8 text-amber-600" />
                            <p className="text-sm font-bold text-gray-900">Os vértices não formam uma área válida.</p>
                            <p className="mt-1 text-xs font-semibold text-gray-600">
                                Registre no mínimo 4 pontos com coordenadas distribuídas ao redor do perímetro.
                            </p>
                        </div>
                    )}
                </div>
                {hasArea && previewPoints.length > 0 && technicalPreview(previewPoints, points, technicalPreviewLayer, setTechnicalPreviewLayer)}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tags.map((tag) => (
                    <div key={tag.vertex_label} className="rounded-lg border border-gray-200 px-3 py-2">
                        <p className="text-xs font-bold uppercase text-gray-500">Vértice {tag.vertex_label}</p>
                        <p className="mt-1 font-mono text-xs text-gray-800">
                            {tag.latitude && tag.longitude ? `${tag.latitude}, ${tag.longitude}` : 'Coordenada pendente'}
                        </p>
                    </div>
                ))}
            </div>

            {!validation.valid && (
                <p className="mt-4 text-xs font-semibold text-amber-700">
                    Complete os vértices e coordenadas para formar uma área válida.
                </p>
            )}
        </div>
    );
}
