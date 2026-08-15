export type VertexLabel = string;

export type ProjectTagDraft = {
    vertex_label: VertexLabel;
    has_qtag: boolean;
    tag_uid: string;
    cmac: string;
    latitude: string;
    longitude: string;
    captureMode: 'manual' | 'web-nfc';
};

export type ProjectTagPayload = {
    has_qtag: boolean;
    tag_uid: string | null;
    cmac: string | null;
    latitude: number;
    longitude: number;
    vertex_label: VertexLabel;
};

export type TagValidationResult = {
    valid: boolean;
    errors: string[];
    vertexErrors: Partial<Record<VertexLabel, string[]>>;
};

export const MIN_PROJECT_TAGS = 4;
export const REQUIRED_VERTICES: VertexLabel[] = ['A', 'B', 'C', 'D'];
const MIN_POLYGON_AREA = 0.000000001;

export const parseProjectCoordinate = (value: string) => {
    const normalized = String(value).trim().replace(',', '.');
    if (!normalized) return Number.NaN;
    return Number(normalized);
};

const coordinateIsValid = (value: string, min: number, max: number) => {
    const parsed = parseProjectCoordinate(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

export const createEmptyProjectTagDrafts = (): ProjectTagDraft[] =>
    REQUIRED_VERTICES.map((vertex_label) => ({
        vertex_label,
        has_qtag: false,
        tag_uid: '',
        cmac: '',
        latitude: '',
        longitude: '',
        captureMode: 'manual',
    }));

export const getVertexLabel = (index: number): VertexLabel => {
    let value = index;
    let label = '';
    do {
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return label;
};

export const getNextVertexLabel = (tags: ProjectTagDraft[]): VertexLabel => {
    const used = new Set(tags.map((tag) => tag.vertex_label.trim().toUpperCase()).filter(Boolean));
    let index = 0;
    while (used.has(getVertexLabel(index))) index += 1;
    return getVertexLabel(index);
};

export const addProjectTagDraft = (tags: ProjectTagDraft[]): ProjectTagDraft[] => ([
    ...tags,
    {
        vertex_label: getNextVertexLabel(tags),
        has_qtag: false,
        tag_uid: '',
        cmac: '',
        latitude: '',
        longitude: '',
        captureMode: 'manual',
    },
]);

export const removeProjectTagDraft = (tags: ProjectTagDraft[], vertex: VertexLabel): ProjectTagDraft[] => {
    if (tags.length <= MIN_PROJECT_TAGS) return tags;
    return tags.filter((tag) => tag.vertex_label !== vertex);
};

type CoordinatePoint = {
    vertex_label: VertexLabel;
    latitude: number;
    longitude: number;
};

export const orderTagsForPolygon = <T extends CoordinatePoint>(points: T[]): T[] => {
    if (points.length < 3) return points;
    const center = points.reduce(
        (acc, point) => ({
            latitude: acc.latitude + point.latitude,
            longitude: acc.longitude + point.longitude,
        }),
        { latitude: 0, longitude: 0 },
    );
    center.latitude /= points.length;
    center.longitude /= points.length;

    return [...points].sort((a, b) => {
        const angleA = Math.atan2(a.latitude - center.latitude, a.longitude - center.longitude);
        const angleB = Math.atan2(b.latitude - center.latitude, b.longitude - center.longitude);
        return angleA - angleB;
    });
};

export const calculatePolygonArea = (points: CoordinatePoint[]): number => {
    const ordered = orderTagsForPolygon(points);
    if (ordered.length < 3) return 0;

    const area = ordered.reduce((sum, point, index) => {
        const next = ordered[(index + 1) % ordered.length];
        return sum + point.longitude * next.latitude - next.longitude * point.latitude;
    }, 0);

    return Math.abs(area) / 2;
};

export const validateTagDrafts = (tags: ProjectTagDraft[]): TagValidationResult => {
    const errors: string[] = [];
    const vertexErrors: Partial<Record<VertexLabel, string[]>> = {};
    const labels = tags.map((tag) => tag.vertex_label.trim().toUpperCase()).filter(Boolean);
    const coordinatePoints: CoordinatePoint[] = [];

    if (tags.length < MIN_PROJECT_TAGS) {
        errors.push('Registre no mínimo 4 vértices para formar a área do projeto.');
    }

    tags.forEach((tag, index) => {
        const vertex = tag.vertex_label.trim().toUpperCase() || getVertexLabel(index);
        const itemErrors: string[] = [];
        const latitudeIsValid = coordinateIsValid(tag.latitude, -90, 90);
        const longitudeIsValid = coordinateIsValid(tag.longitude, -180, 180);

        if (tag.has_qtag && !tag.tag_uid.trim()) {
            itemErrors.push(`Vértice ${vertex}: informe o UID.`);
        }
        if (tag.has_qtag && !tag.cmac.trim()) {
            itemErrors.push(`Vértice ${vertex}: informe o CMAC.`);
        }
        if (!latitudeIsValid) {
            itemErrors.push(`Vértice ${vertex}: latitude deve estar entre -90 e 90.`);
        }
        if (!longitudeIsValid) {
            itemErrors.push(`Vértice ${vertex}: longitude deve estar entre -180 e 180.`);
        }

        if (latitudeIsValid && longitudeIsValid) {
            coordinatePoints.push({
                vertex_label: vertex,
                latitude: parseProjectCoordinate(tag.latitude),
                longitude: parseProjectCoordinate(tag.longitude),
            });
        }

        if (itemErrors.length > 0) {
            vertexErrors[vertex] = itemErrors;
            errors.push(...itemErrors);
        }
    });

    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
        errors.push('Os vértices não podem repetir.');
    }

    const uniqueCoordinates = new Set(coordinatePoints.map((point) => `${point.latitude}:${point.longitude}`));
    if (uniqueCoordinates.size !== coordinatePoints.length) {
        errors.push('As coordenadas dos vértices não podem repetir.');
    }

    if (coordinatePoints.length >= MIN_PROJECT_TAGS && calculatePolygonArea(coordinatePoints) <= MIN_POLYGON_AREA) {
        errors.push('Os vértices precisam formar uma área válida, não uma linha.');
    }

    return { valid: errors.length === 0, errors, vertexErrors };
};

export const normalizeProjectTags = (tags: ProjectTagDraft[]): ProjectTagPayload[] => {
    const validation = validateTagDrafts(tags);
    if (!validation.valid) {
        throw new Error(validation.errors[0] || 'Vértices inválidos.');
    }

    return tags.map((tag) => ({
        has_qtag: Boolean(tag.has_qtag),
        tag_uid: tag.has_qtag ? tag.tag_uid.trim() : null,
        cmac: tag.has_qtag ? tag.cmac.trim() : null,
        latitude: parseProjectCoordinate(tag.latitude),
        longitude: parseProjectCoordinate(tag.longitude),
        vertex_label: tag.vertex_label.trim().toUpperCase(),
    }));
};

export const averageCoordinates = (tags: ProjectTagDraft[]) => {
    const normalizedTags = normalizeProjectTags(tags);
    const totals = normalizedTags.reduce(
        (acc, tag) => ({
            lat: acc.lat + tag.latitude,
            lng: acc.lng + tag.longitude,
        }),
        { lat: 0, lng: 0 },
    );

    return {
        lat: Number((totals.lat / normalizedTags.length).toFixed(6)),
        lng: Number((totals.lng / normalizedTags.length).toFixed(6)),
    };
};
