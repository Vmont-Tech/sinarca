import React, { useEffect, useMemo, useRef } from 'react';
import L, { type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import {
    orderTagsForPolygon,
    parseProjectCoordinate,
    type ProjectTagDraft,
    type VertexLabel,
} from '../services/projectOrigination';

type ProjectGeofenceEditorMapProps = {
    tags: ProjectTagDraft[];
    activeVertex: VertexLabel;
    initialPoint?: ProjectMapInitialPoint | null;
    onActiveVertexChange: (vertex: VertexLabel) => void;
    onSetVertexCoordinates: (vertex: VertexLabel, latitude: string, longitude: string) => void;
};

export type ProjectMapInitialPoint = {
    latitude: number;
    longitude: number;
    label: string;
    zoom?: number;
};

type ValidMapPoint = {
    vertex_label: VertexLabel;
    latitude: number;
    longitude: number;
};

const BRAZIL_CENTER: LatLngExpression = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

const isValidCoordinate = (latitude: number, longitude: number) => (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
);

const markerIcon = (vertex: VertexLabel, active: boolean) => L.divIcon({
    className: '',
    html: `<div class="sinarca-leaflet-marker ${active ? 'sinarca-leaflet-marker-active' : ''}">${vertex}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const validMapPoints = (tags: ProjectTagDraft[]): ValidMapPoint[] => tags.flatMap((tag) => {
    const latitude = parseProjectCoordinate(tag.latitude);
    const longitude = parseProjectCoordinate(tag.longitude);
    if (!isValidCoordinate(latitude, longitude)) return [];
    return [{
        vertex_label: tag.vertex_label,
        latitude,
        longitude,
    }];
});

export default function ProjectGeofenceEditorMap({
    tags,
    activeVertex,
    initialPoint,
    onActiveVertexChange,
    onSetVertexCoordinates,
}: ProjectGeofenceEditorMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerRef = useRef<L.LayerGroup | null>(null);
    const activeVertexRef = useRef(activeVertex);
    const onSetVertexCoordinatesRef = useRef(onSetVertexCoordinates);
    const onActiveVertexChangeRef = useRef(onActiveVertexChange);
    const hasFitBoundsRef = useRef(false);

    const points = useMemo(() => validMapPoints(tags), [tags]);
    const orderedPoints = useMemo(() => orderTagsForPolygon(points), [points]);
    const activeTag = tags.find((tag) => tag.vertex_label === activeVertex) || tags[0];
    const hasValidInitialPoint = Boolean(
        initialPoint
        && isValidCoordinate(initialPoint.latitude, initialPoint.longitude),
    );

    useEffect(() => {
        activeVertexRef.current = activeVertex;
    }, [activeVertex]);

    useEffect(() => {
        onSetVertexCoordinatesRef.current = onSetVertexCoordinates;
    }, [onSetVertexCoordinates]);

    useEffect(() => {
        onActiveVertexChangeRef.current = onActiveVertexChange;
    }, [onActiveVertexChange]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return undefined;

        const map = L.map(mapContainerRef.current, {
            attributionControl: true,
            scrollWheelZoom: true,
            zoomControl: true,
        }).setView(BRAZIL_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        const layer = L.layerGroup().addTo(map);
        map.on('click', (event) => {
            onSetVertexCoordinatesRef.current(
                activeVertexRef.current,
                event.latlng.lat.toFixed(6),
                event.latlng.lng.toFixed(6),
            );
        });

        mapRef.current = map;
        layerRef.current = layer;

        return () => {
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        const layer = layerRef.current;
        if (!map || !layer) return;

        layer.clearLayers();

        if (orderedPoints.length >= 3) {
            L.polygon(
                orderedPoints.map((point) => [point.latitude, point.longitude] as LatLngExpression),
                {
                    color: '#059669',
                    fillColor: '#10b981',
                    fillOpacity: 0.18,
                    opacity: 0.9,
                    weight: 2,
                },
            ).addTo(layer);
        }

        points.forEach((point) => {
            L.marker([point.latitude, point.longitude], {
                icon: markerIcon(point.vertex_label, point.vertex_label === activeVertex),
                keyboard: true,
                title: `Vértice ${point.vertex_label}`,
            })
                .on('click', () => onActiveVertexChangeRef.current(point.vertex_label))
                .addTo(layer);
        });

        if (points.length === 0 && initialPoint && hasValidInitialPoint) {
            L.marker([initialPoint.latitude, initialPoint.longitude], {
                icon: markerIcon(activeVertex, true),
                keyboard: true,
                title: `Ponto inicial: ${initialPoint.label}`,
            }).addTo(layer);
        }

        if (points.length > 0 && !hasFitBoundsRef.current) {
            const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as LatLngExpression));
            map.fitBounds(bounds.pad(0.25), { animate: false, maxZoom: 15 });
            hasFitBoundsRef.current = true;
        }
    }, [activeVertex, hasValidInitialPoint, initialPoint, orderedPoints, points]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !initialPoint || !hasValidInitialPoint || points.length > 0) return;

        map.setView([initialPoint.latitude, initialPoint.longitude], initialPoint.zoom || 10, { animate: false });
    }, [hasValidInitialPoint, initialPoint, points.length]);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <MapPin className="h-4 w-4 text-primary" />
                        Mapa para selecionar vértices
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-950">Vértice ativo: {activeTag?.vertex_label || activeVertex}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <button
                            key={tag.vertex_label}
                            type="button"
                            onClick={() => onActiveVertexChange(tag.vertex_label)}
                            className={`inline-flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${tag.vertex_label === activeVertex
                                ? 'border-primary bg-primary text-gray-950'
                                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'}`}
                            aria-pressed={tag.vertex_label === activeVertex}
                            aria-label={`Selecionar vértice ${tag.vertex_label} no mapa`}
                        >
                            {tag.vertex_label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={mapContainerRef}
                className="h-[420px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                aria-label="Mapa interativo para marcar coordenadas da geofence"
            />

            <p className="mt-3 text-xs font-semibold text-gray-600">
                Clique no mapa para definir o vértice ativo. O marcador inicial acompanha o município/UF selecionado até o primeiro ponto ser definido.
            </p>
        </div>
    );
}
