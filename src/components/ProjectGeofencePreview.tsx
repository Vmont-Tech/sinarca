import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { REQUIRED_VERTICES, validateTagDrafts, type ProjectTagDraft, type VertexLabel } from '../services/projectOrigination';

type ProjectGeofencePreviewProps = {
    tags: ProjectTagDraft[];
    errors?: string[];
};

const parseCoordinate = (value: string) => Number(String(value).replace(',', '.'));

const coordinateIsValid = (value: string, min: number, max: number) => {
    const parsed = parseCoordinate(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

const orderedCoordinateTags = (tags: ProjectTagDraft[]) => {
    const errors: string[] = [];
    const orderedTags = REQUIRED_VERTICES.map((vertex) => {
        const tag = tags.find((item) => item.vertex_label === vertex);
        if (!tag || !coordinateIsValid(tag.latitude, -90, 90) || !coordinateIsValid(tag.longitude, -180, 180)) {
            errors.push(`Vértice ${vertex}: coordenada pendente ou inválida.`);
            return null;
        }
        return {
            vertex_label: vertex as VertexLabel,
            latitude: parseCoordinate(tag.latitude),
            longitude: parseCoordinate(tag.longitude),
            displayLatitude: tag.latitude,
            displayLongitude: tag.longitude,
        };
    });

    return {
        valid: errors.length === 0,
        errors,
        tags: orderedTags.filter((tag) => tag !== null),
    };
};

const buildPolygonPoints = (tags: ProjectTagDraft[]) => {
    const orderedTags = orderedCoordinateTags(tags).tags;
    const latitudes = orderedTags.map((tag) => tag.latitude);
    const longitudes = orderedTags.map((tag) => tag.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const latSpan = Math.max(maxLat - minLat, 0.000001);
    const lngSpan = Math.max(maxLng - minLng, 0.000001);

    return orderedTags.map((tag) => {
        const x = 24 + ((tag.longitude - minLng) / lngSpan) * 152;
        const y = 24 + ((maxLat - tag.latitude) / latSpan) * 152;
        return { ...tag, x, y };
    });
};

export default function ProjectGeofencePreview({ tags, errors = [] }: ProjectGeofencePreviewProps) {
    const validation = validateTagDrafts(tags);
    const coordinateValidation = orderedCoordinateTags(tags);
    const isValid = coordinateValidation.valid;
    const compactErrors = errors.length > 0 ? errors : coordinateValidation.errors.length > 0 ? coordinateValidation.errors : validation.errors;
    const polygonPoints = coordinateValidation.valid ? buildPolygonPoints(tags) : [];
    const points = polygonPoints.map((tag) => `${tag.x},${tag.y}`).join(' ');

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                        <h4 className="text-sm font-extrabold uppercase text-gray-900">Preview da geofence</h4>
                        <p className="text-xs font-semibold text-gray-500">Vértices A/B/C/D</p>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${isValid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {isValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {isValid ? 'válida' : 'incompleta'}
                </span>
            </div>

            <div className="aspect-[4/3] min-h-[260px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {isValid ? (
                    <svg className="h-full w-full" viewBox="0 0 200 200" role="img" aria-label="Polígono da geofence do projeto">
                        <rect x="0" y="0" width="200" height="200" fill="#f9fafb" />
                        <path d="M20 40H180M20 80H180M20 120H180M20 160H180M40 20V180M80 20V180M120 20V180M160 20V180" stroke="#e5e7eb" strokeWidth="1" />
                        <polygon points={points} fill="rgba(22, 163, 74, 0.18)" stroke="#16a34a" strokeWidth="3" />
                        {polygonPoints.map((tag) => (
                            <g key={tag.vertex_label}>
                                <circle cx={tag.x} cy={tag.y} r="7" fill="#ffffff" stroke="#16a34a" strokeWidth="3" />
                                <text x={tag.x} y={tag.y + 4} textAnchor="middle" className="fill-gray-950 text-[10px] font-bold">
                                    {tag.vertex_label}
                                </text>
                            </g>
                        ))}
                    </svg>
                ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
                        <AlertTriangle className="mb-3 h-8 w-8 text-amber-600" />
                        <p className="text-sm font-bold text-gray-900">Registre os quatro vértices para gerar a geofence.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REQUIRED_VERTICES.map((vertex) => {
                    const tag = tags.find((item) => item.vertex_label === vertex);
                    return (
                        <div key={vertex} className="rounded-lg border border-gray-200 px-3 py-2">
                            <p className="text-xs font-bold uppercase text-gray-500">Vértice {vertex}</p>
                            <p className="mt-1 font-mono text-xs text-gray-800">
                                {tag?.latitude && tag?.longitude ? `${tag.latitude}, ${tag.longitude}` : 'Coordenada pendente'}
                            </p>
                        </div>
                    );
                })}
            </div>

            {!isValid && compactErrors.length > 0 && (
                <ul className="mt-4 space-y-1 text-xs font-semibold text-amber-700">
                    {compactErrors.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                </ul>
            )}
        </div>
    );
}
