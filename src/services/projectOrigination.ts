export type VertexLabel = 'A' | 'B' | 'C' | 'D';

export type ProjectTagDraft = {
    vertex_label: VertexLabel;
    tag_uid: string;
    cmac: string;
    latitude: string;
    longitude: string;
    captureMode: 'manual' | 'web-nfc';
};

export type ProjectTagPayload = {
    tag_uid: string;
    cmac: string;
    latitude: number;
    longitude: number;
    vertex_label: VertexLabel;
};

export type TagValidationResult = {
    valid: boolean;
    errors: string[];
    vertexErrors: Partial<Record<VertexLabel, string[]>>;
};

export const REQUIRED_VERTICES: VertexLabel[] = ['A', 'B', 'C', 'D'];

const parseCoordinate = (value: string) => Number(String(value).replace(',', '.'));

const coordinateIsValid = (value: string, min: number, max: number) => {
    const parsed = parseCoordinate(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

export const createEmptyProjectTagDrafts = (): ProjectTagDraft[] =>
    REQUIRED_VERTICES.map((vertex_label) => ({
        vertex_label,
        tag_uid: '',
        cmac: '',
        latitude: '',
        longitude: '',
        captureMode: 'manual',
    }));

export const validateTagDrafts = (tags: ProjectTagDraft[]): TagValidationResult => {
    const errors: string[] = [];
    const vertexErrors: Partial<Record<VertexLabel, string[]>> = {};
    const labels = tags.map((tag) => tag.vertex_label);

    if (tags.length !== REQUIRED_VERTICES.length) {
        errors.push('Registre exatamente quatro QTAGs.');
    }

    for (const vertex of REQUIRED_VERTICES) {
        const vertexTags = tags.filter((tag) => tag.vertex_label === vertex);
        const tag = vertexTags[0];
        const itemErrors: string[] = [];

        if (vertexTags.length === 0) {
            itemErrors.push(`Vértice ${vertex}: informe a QTAG.`);
        }
        if (vertexTags.length > 1) {
            itemErrors.push(`Vértice ${vertex}: remova QTAG duplicada.`);
        }
        if (tag && !tag.tag_uid.trim()) {
            itemErrors.push(`Vértice ${vertex}: informe o UID.`);
        }
        if (tag && !tag.cmac.trim()) {
            itemErrors.push(`Vértice ${vertex}: informe o CMAC.`);
        }
        if (tag && !coordinateIsValid(tag.latitude, -90, 90)) {
            itemErrors.push(`Vértice ${vertex}: latitude deve estar entre -90 e 90.`);
        }
        if (tag && !coordinateIsValid(tag.longitude, -180, 180)) {
            itemErrors.push(`Vértice ${vertex}: longitude deve estar entre -180 e 180.`);
        }

        if (itemErrors.length > 0) {
            vertexErrors[vertex] = itemErrors;
            errors.push(...itemErrors);
        }
    }

    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length || !REQUIRED_VERTICES.every((vertex) => uniqueLabels.has(vertex))) {
        errors.push('Use apenas os vértices A, B, C e D, sem duplicidade.');
    }

    return { valid: errors.length === 0, errors, vertexErrors };
};

export const normalizeProjectTags = (tags: ProjectTagDraft[]): ProjectTagPayload[] => {
    const validation = validateTagDrafts(tags);
    if (!validation.valid) {
        throw new Error(validation.errors[0] || 'QTAGs inválidas.');
    }

    return REQUIRED_VERTICES.map((vertex) => {
        const tag = tags.find((item) => item.vertex_label === vertex);
        if (!tag) throw new Error(`Vértice ${vertex} não encontrado.`);
        return {
            tag_uid: tag.tag_uid.trim(),
            cmac: tag.cmac.trim(),
            latitude: parseCoordinate(tag.latitude),
            longitude: parseCoordinate(tag.longitude),
            vertex_label: tag.vertex_label,
        };
    });
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
