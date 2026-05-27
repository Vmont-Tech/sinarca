import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileCheck, FileText, Leaf, Loader2, MapPin, RefreshCw, Radio, ScanLine, ShieldCheck, Trash2, Upload, WifiOff, XCircle } from 'lucide-react';
import ProjectGeofenceEditorMap, { type ProjectMapInitialPoint } from '../../components/ProjectGeofenceEditorMap';
import ProjectGeofencePreview from '../../components/ProjectGeofencePreview';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../../services/database';
import { detectFieldCapabilities, getNfcCaptureStatus, requestCurrentPosition } from '../../services/fieldCapture';
import { discardProjectDraft, listProjectDrafts, saveProjectDraft, submitProjectDraft, uploadProjectDraftDocument, type ProjectDraft, type ProjectDraftPayload } from '../../services/projectDrafts';
import type { ProjectDocumentType, UploadedProjectDocument } from '../../services/projectDocuments';
import type { InventoryItem } from '../../data/mrca_db';
import {
    MIN_PROJECT_TAGS,
    addProjectTagDraft,
    averageCoordinates,
    createEmptyProjectTagDrafts,
    normalizeProjectTags,
    parseProjectCoordinate,
    removeProjectTagDraft,
    validateTagDrafts,
    type ProjectTagDraft,
    type VertexLabel,
} from '../../services/projectOrigination';

type StepId = 'project' | 'qtags' | 'documents' | 'review';

type AddProjectProps = {
    mode?: 'create' | 'edit';
};

type ProjectFormState = {
    name: string;
    description: string;
    producerId: string;
    city: string;
    state: string;
    bioma: string;
    methodology: string;
    projectType: string;
    areaHectares: string;
    carbonStock: string;
    certifierId: string;
    publicMarketplace: boolean;
    imageUrl: string;
    imageFilename: string;
    imageMimeType: string;
    imageSizeBytes: number;
};

type DocumentStatus = 'local' | 'uploading' | 'uploaded' | 'error';

type ProjectDocumentDraft = {
    id: string;
    documentType: ProjectDocumentType;
    file?: File;
    filename?: string;
    sizeBytes?: number;
    status: DocumentStatus;
    uploaded?: UploadedProjectDocument;
    error?: string;
};

const steps: Array<{ id: StepId; label: string; icon: React.ElementType }> = [
    { id: 'project', label: 'Projeto', icon: Leaf },
    { id: 'qtags', label: 'Localização', icon: MapPin },
    { id: 'documents', label: 'Documentos', icon: Upload },
    { id: 'review', label: 'Revisão', icon: ShieldCheck },
];

const biomeOptions = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pampa', 'Pantanal'];

const projectTypeOptions = [
    { value: 'reforestation', label: 'Restauração / Reflorestamento' },
    { value: 'forest_conservation', label: 'Conservação florestal' },
    { value: 'solar_energy', label: 'Energia renovável' },
];

const methodologyOptions = ['VM0015 (Verra)', 'AR-ACM0003', 'ACM0002', 'Metodologia própria em revisão'];

const documentTypeOptions: Array<{ value: ProjectDocumentType; label: string }> = [
    { value: 'LEGAL_OWNERSHIP', label: 'Documento legal' },
    { value: 'CAR', label: 'CAR' },
    { value: 'FOREST_INVENTORY', label: 'Inventário florestal' },
    { value: 'KML_OR_SHP', label: 'KML/SHP' },
    { value: 'OTHER', label: 'Outro' },
];

const MAX_PROJECT_IMAGE_BYTES = 5 * 1024 * 1024;
const AUTO_SAVE_DRAFT_INTERVAL_MS = 5 * 60 * 1000;

const DEFAULT_PROJECT_LOCATION_HINT: ProjectMapInitialPoint = {
    latitude: -14.235,
    longitude: -51.9253,
    label: 'Brasil',
    zoom: 4,
};

const PROJECT_LOCATION_FALLBACKS: Record<string, ProjectMapInitialPoint> = {
    AC: { latitude: -9.97499, longitude: -67.8243, label: 'Acre', zoom: 7 },
    AL: { latitude: -9.66599, longitude: -35.735, label: 'Alagoas', zoom: 8 },
    AM: { latitude: -3.11903, longitude: -60.0217, label: 'Amazonas', zoom: 6 },
    AP: { latitude: 0.03493, longitude: -51.0694, label: 'Amapá', zoom: 7 },
    BA: { latitude: -12.9714, longitude: -38.5014, label: 'Bahia', zoom: 7 },
    CE: { latitude: -3.73186, longitude: -38.5267, label: 'Ceará', zoom: 8 },
    DF: { latitude: -15.7939, longitude: -47.8828, label: 'Distrito Federal', zoom: 9 },
    ES: { latitude: -20.3155, longitude: -40.3128, label: 'Espírito Santo', zoom: 8 },
    GO: { latitude: -16.6869, longitude: -49.2648, label: 'Goiás', zoom: 7 },
    MA: { latitude: -2.53073, longitude: -44.3068, label: 'Maranhão', zoom: 7 },
    MG: { latitude: -19.9167, longitude: -43.9345, label: 'Minas Gerais', zoom: 7 },
    MS: { latitude: -20.4697, longitude: -54.6201, label: 'Mato Grosso do Sul', zoom: 7 },
    MT: { latitude: -15.601, longitude: -56.0974, label: 'Mato Grosso', zoom: 6 },
    PA: { latitude: -1.45583, longitude: -48.5039, label: 'Pará', zoom: 6 },
    PB: { latitude: -7.1195, longitude: -34.845, label: 'Paraíba', zoom: 8 },
    PE: { latitude: -8.04756, longitude: -34.877, label: 'Pernambuco', zoom: 8 },
    PI: { latitude: -5.08921, longitude: -42.8016, label: 'Piauí', zoom: 7 },
    PR: { latitude: -25.4284, longitude: -49.2733, label: 'Paraná', zoom: 8 },
    RJ: { latitude: -22.9068, longitude: -43.1729, label: 'Rio de Janeiro', zoom: 8 },
    RN: { latitude: -5.79448, longitude: -35.211, label: 'Rio Grande do Norte', zoom: 8 },
    RO: { latitude: -8.76077, longitude: -63.8999, label: 'Rondônia', zoom: 7 },
    RR: { latitude: 2.82384, longitude: -60.6753, label: 'Roraima', zoom: 7 },
    RS: { latitude: -30.0346, longitude: -51.2177, label: 'Rio Grande do Sul', zoom: 7 },
    SC: { latitude: -27.5954, longitude: -48.548, label: 'Santa Catarina', zoom: 8 },
    SE: { latitude: -10.9472, longitude: -37.0731, label: 'Sergipe', zoom: 8 },
    SP: { latitude: -23.5505, longitude: -46.6333, label: 'São Paulo', zoom: 8 },
    TO: { latitude: -10.2491, longitude: -48.3243, label: 'Tocantins', zoom: 7 },
};

const initialForm: ProjectFormState = {
    name: '',
    description: '',
    producerId: '',
    city: '',
    state: '',
    bioma: 'Cerrado',
    methodology: 'VM0015 (Verra)',
    projectType: 'reforestation',
    areaHectares: '',
    carbonStock: '',
    certifierId: '',
    publicMarketplace: false,
    imageUrl: '',
    imageFilename: '',
    imageMimeType: '',
    imageSizeBytes: 0,
};

const numericValueIsPositive = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
};

const normalizeUf = (value: string) => value.trim().slice(0, 2).toUpperCase();
const normalizeStateId = (value: string) => normalizeUf(value).toLowerCase();

const projectLocationFallback = (region?: InventoryItem | null): ProjectMapInitialPoint => {
    const uf = normalizeUf(region?.uf || '');
    if (!uf) return DEFAULT_PROJECT_LOCATION_HINT;
    const fallback = PROJECT_LOCATION_FALLBACKS[uf];
    if (!fallback) return DEFAULT_PROJECT_LOCATION_HINT;
    return { ...fallback, label: region?.name || fallback.label };
};

const coordinateIsUsable = (latitude: number, longitude: number) => (
    Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
);

const resolveProjectLocationHint = async (
    city: string,
    region?: InventoryItem | null,
): Promise<ProjectMapInitialPoint> => {
    const fallback = projectLocationFallback(region);
    const municipality = city.trim();
    if (!municipality || !region?.uf) return fallback;

    try {
        const params = new URLSearchParams({
            format: 'jsonv2',
            limit: '1',
            countrycodes: 'br',
            city: municipality,
            state: region.name,
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            headers: { 'Accept-Language': 'pt-BR' },
        });
        if (!response.ok) return fallback;

        const [firstResult] = await response.json();
        const latitude = Number(firstResult?.lat);
        const longitude = Number(firstResult?.lon);
        if (!coordinateIsUsable(latitude, longitude)) return fallback;

        return {
            latitude,
            longitude,
            label: `${municipality}, ${region.uf}`,
            zoom: 12,
        };
    } catch {
        return fallback;
    }
};

const formatBytes = (value: number) => `${value.toLocaleString('pt-BR')} bytes`;

const truncateHash = (value?: string) => {
    if (!value) return 'Hash pendente';
    return value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
};

const documentTypeLabel = (type: ProjectDocumentType) => (
    documentTypeOptions.find((item) => item.value === type)?.label || type
);

const documentStatusLabel = (status: DocumentStatus) => {
    if (status === 'uploaded') return 'enviado';
    if (status === 'uploading') return 'enviando';
    if (status === 'error') return 'erro';
    return 'local';
};

const documentName = (documentItem: ProjectDocumentDraft) => (
    documentItem.uploaded?.filename || documentItem.filename || documentItem.file?.name || 'Documento sem nome'
);

const documentSize = (documentItem: ProjectDocumentDraft) => (
    documentItem.uploaded?.sizeBytes || documentItem.sizeBytes || documentItem.file?.size || 0
);

const renderableImageUrl = (value?: string | null) => {
    const imageUrl = String(value || '').trim();
    if (!imageUrl) return '';
    if (!imageUrl.startsWith('data:image/')) return imageUrl;
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(imageUrl) ? imageUrl : '';
};

const formatSavedAgo = (date: Date | null) => {
    if (!date) return 'Salvo';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) return 'Salvo há menos de 1 min';
    if (diffMinutes === 1) return 'Salvo há 1 min';
    return `Salvo há ${diffMinutes} min`;
};

const formatDraftSavedAgo = (date: Date | null) => formatSavedAgo(date).replace(/^Salvo/, 'Rascunho salvo');

const validateRequiredDocuments = (documents: ProjectDocumentDraft[]) => {
    const activeDocuments = documents.filter((item) => item.status !== 'error');
    const hasLegal = activeDocuments.some((item) => item.documentType === 'LEGAL_OWNERSHIP' || item.documentType === 'CAR');
    const hasInventory = activeDocuments.some((item) => item.documentType === 'FOREST_INVENTORY');
    const errors: string[] = [];

    if (!hasLegal) errors.push('Envie um documento legal ou CAR.');
    if (!hasInventory) errors.push('Envie o inventário florestal.');

    documents.filter((item) => item.status === 'error').forEach((item) => {
        errors.push(`${documentName(item)}: ${item.error || 'falha no upload'}`);
    });

    return { valid: errors.length === 0, errors };
};

export default function AddProject({ mode = 'create' }: AddProjectProps) {
    const navigate = useNavigate();
    const { id: routeProjectId } = useParams();
    const editingProjectId = mode === 'edit' ? routeProjectId || null : null;
    const { user } = useAuth();
    const [step, setStep] = useState<StepId>('project');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touchedSteps, setTouchedSteps] = useState<Partial<Record<StepId, boolean>>>({});
    const [activeMapVertex, setActiveMapVertex] = useState<VertexLabel>('A');
    const [certifiers, setCertifiers] = useState<any[]>([]);
    const [producers, setProducers] = useState<any[]>([]);
    const [inventoryRegions, setInventoryRegions] = useState<InventoryItem[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [loadingProjectForEdit, setLoadingProjectForEdit] = useState(false);
    const [form, setForm] = useState<ProjectFormState>(initialForm);
    const [tags, setTags] = useState<ProjectTagDraft[]>(createEmptyProjectTagDrafts);
    const [initialMapPoint, setMapInitialPoint] = useState<ProjectMapInitialPoint | null>(DEFAULT_PROJECT_LOCATION_HINT);
    const [selectedDocumentType, setSelectedDocumentType] = useState<ProjectDocumentType>('LEGAL_OWNERSHIP');
    const [documents, setDocuments] = useState<ProjectDocumentDraft[]>([]);
    const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = useState(true);
    const [draftSaveState, setDraftSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [draftError, setDraftError] = useState('');
    const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
    const autosaveInitializedRef = useRef(true);
    const lastSavedSignatureRef = useRef('');
    const loadedEditingProjectRef = useRef<string | null>(null);
    const loadingEditingProjectRef = useRef<string | null>(null);
    const draftCarouselRef = useRef<HTMLDivElement | null>(null);
    const projectImageInputRef = useRef<HTMLInputElement | null>(null);
    const documentFileInputRef = useRef<HTMLInputElement | null>(null);

    const currentStepIndex = steps.findIndex((item) => item.id === step);
    const needsProducerSelection = user?.role !== 'producer';
    const tagValidation = useMemo(() => validateTagDrafts(tags), [tags]);
    const documentValidation = useMemo(() => validateRequiredDocuments(documents), [documents]);
    const selectedRegion = useMemo(
        () => inventoryRegions.find((region) => region.uf === normalizeUf(form.state)),
        [form.state, inventoryRegions],
    );
    const fieldCapabilities = useMemo(() => detectFieldCapabilities(), []);
    const nfcCaptureStatus = useMemo(() => getNfcCaptureStatus(), []);
    const [locationLoadingVertex, setLocationLoadingVertex] = useState<VertexLabel | null>(null);
    const [locationErrors, setLocationErrors] = useState<Partial<Record<VertexLabel, string>>>({});
    const hasMeaningfulDraftContent = useMemo(() => (
        Boolean(
            form.name.trim()
            || form.description.trim()
            || form.city.trim()
            || form.state.trim()
            || form.areaHectares.trim()
            || form.carbonStock.trim()
            || form.publicMarketplace
            || tags.some((tag) => tag.has_qtag || tag.tag_uid || tag.cmac || tag.latitude || tag.longitude)
            || documents.length > 0,
        )
    ), [documents.length, form, tags]);
    const draftSignature = useMemo(() => JSON.stringify({
        mode,
        editingProjectId,
        step,
        form,
        tags,
        selectedDocumentType,
        documents: documents.map((documentItem) => ({
            id: documentItem.id,
            documentType: documentItem.documentType,
            filename: documentName(documentItem),
            sizeBytes: documentSize(documentItem),
            status: documentItem.status,
            sha256: documentItem.uploaded?.sha256,
        })),
    }), [documents, editingProjectId, form, mode, selectedDocumentType, step, tags]);

    const applyProjectForEditing = useCallback((dossier: Awaited<ReturnType<typeof database.getProjectPublicDossier>>) => {
        const project = dossier.project;
        const metadata = project.metadata || {};
        const projectType = typeof metadata.project_type === 'string' ? metadata.project_type : initialForm.projectType;
        const projectImageUrl = renderableImageUrl(project.image);
        const loadedTags = Array.isArray(dossier.tags) && dossier.tags.length >= MIN_PROJECT_TAGS
            ? dossier.tags.map((tag: any, index: number) => {
                const hasQtag = Boolean(tag.hasQtag || tag.tagUid || tag.cmac);
                return {
                    vertex_label: String(tag.vertex || String.fromCharCode(65 + index)) as VertexLabel,
                    has_qtag: hasQtag,
                    tag_uid: hasQtag ? String(tag.tagUid || '') : '',
                    cmac: hasQtag ? String(tag.cmac || '') : '',
                    latitude: String(tag.latitude ?? ''),
                    longitude: String(tag.longitude ?? ''),
                    status: tag.status || 'ACTIVE',
                    captureMode: 'manual' as const,
                };
            })
            : createEmptyProjectTagDrafts();

        setForm((current) => ({
            ...current,
            name: project.name || '',
            description: String(project.description || '').replace(/\n\nMetodologia declarada:.*$/s, ''),
            city: project.location?.city || '',
            state: normalizeUf(project.location?.stateId || ''),
            bioma: project.location?.bioma || current.bioma,
            methodology: project.methodology || current.methodology,
            projectType,
            areaHectares: String(project.metrics?.totalAreaHa || ''),
            carbonStock: String(project.metrics?.carbonStock || ''),
            certifierId: project.entities?.certifier?.id === 'pending' ? current.certifierId : project.entities?.certifier?.id || current.certifierId,
            publicMarketplace: Boolean(project.publicMarketplace),
            imageUrl: projectImageUrl,
            imageFilename: projectImageUrl ? 'imagem-atual-do-projeto' : '',
            imageMimeType: projectImageUrl ? 'image/*' : '',
            imageSizeBytes: 0,
        }));
        setTags(loadedTags);
        setActiveMapVertex(loadedTags[0]?.vertex_label || 'A');
        setDocuments((dossier.documents || []).map((documentItem: any) => ({
            id: documentItem.id,
            documentType: documentItem.type as ProjectDocumentType,
            filename: documentItem.metadata?.filename || documentItem.storagePath,
            sizeBytes: documentItem.sizeBytes,
            status: 'uploaded' as DocumentStatus,
            uploaded: {
                id: documentItem.id,
                projectId: project.friendlyId,
                documentType: documentItem.type,
                filename: documentItem.metadata?.filename || documentItem.storagePath,
                mimeType: documentItem.mimeType,
                sizeBytes: documentItem.sizeBytes,
                sha256: documentItem.sha256Hash,
                storageBucket: documentItem.storageBucket || 'projects',
                storageObjectPath: documentItem.storageObjectPath || null,
                storagePath: documentItem.storagePath,
                status: 'UPLOADED',
            },
        })));
        setDraftSaveState('saved');
        setDraftError('');
        autosaveInitializedRef.current = false;
    }, []);

    useEffect(() => {
        let active = true;

        const loadCatalog = async () => {
            setLoadingCatalog(true);
            const [loadedCertifiers, loadedProducers, loadedInventoryRegions] = await Promise.all([
                database.getCertifiers(),
                needsProducerSelection ? database.getProducers() : Promise.resolve([]),
                database.getInventoryData(),
            ]);
            if (!active) return;

            setCertifiers(loadedCertifiers);
            setProducers(loadedProducers);
            setInventoryRegions(loadedInventoryRegions);
            setForm((current) => ({
                ...current,
                certifierId: current.certifierId || loadedCertifiers[0]?.id || '',
                producerId: current.producerId || loadedProducers[0]?.id || '',
                state: loadedInventoryRegions.some((region) => region.uf === normalizeUf(current.state))
                    ? normalizeUf(current.state)
                    : '',
            }));
            setLoadingCatalog(false);
        };

        loadCatalog().catch((err) => {
            if (!active) return;
            setLoadingCatalog(false);
            setError(err instanceof Error ? err.message : 'Não foi possível carregar os catálogos.');
        });

        return () => {
            active = false;
        };
    }, [needsProducerSelection]);

    useEffect(() => {
        if (!editingProjectId || loadingCatalog) return undefined;
        if (loadedEditingProjectRef.current === editingProjectId || loadingEditingProjectRef.current === editingProjectId) {
            return undefined;
        }

        let active = true;
        loadingEditingProjectRef.current = editingProjectId;
        setLoadingProjectForEdit(true);
        database.getProjectPublicDossier(editingProjectId)
            .then((dossier) => {
                if (!active) return;
                applyProjectForEditing(dossier);
                loadedEditingProjectRef.current = editingProjectId;
            })
            .catch((err) => {
                if (!active) return;
                loadedEditingProjectRef.current = null;
                setError(err instanceof Error ? err.message : 'Não foi possível carregar o projeto para edição.');
            })
            .finally(() => {
                if (loadingEditingProjectRef.current === editingProjectId) {
                    loadingEditingProjectRef.current = null;
                }
                if (active) setLoadingProjectForEdit(false);
            });

        return () => {
            active = false;
            if (loadingEditingProjectRef.current === editingProjectId) {
                loadingEditingProjectRef.current = null;
            }
        };
    }, [applyProjectForEditing, editingProjectId, loadingCatalog]);

    useEffect(() => {
        if (!tags.some((tag) => tag.vertex_label === activeMapVertex)) {
            setActiveMapVertex(tags[0]?.vertex_label || 'A');
        }
    }, [activeMapVertex, tags]);

    useEffect(() => {
        let active = true;
        const fallback = projectLocationFallback(selectedRegion);
        setMapInitialPoint(fallback);

        if (!form.city.trim() || !selectedRegion) {
            return () => {
                active = false;
            };
        }

        const timer = window.setTimeout(() => {
            resolveProjectLocationHint(form.city, selectedRegion)
                .then((locationHint) => {
                    if (active) setMapInitialPoint(locationHint);
                });
        }, 500);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [form.city, selectedRegion]);

    useEffect(() => {
        let active = true;
        setLoadingDrafts(true);
        listProjectDrafts()
            .then((items) => {
                if (!active) return;
                setDrafts(items);
            })
            .catch((err) => {
                if (!active) return;
                setDraftError(err instanceof Error ? err.message : 'Não foi possível carregar rascunhos.');
            })
            .finally(() => {
                if (active) setLoadingDrafts(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const buildProjectCreatePayload = useCallback(() => {
        const coordinates = averageCoordinates(tags);
        return {
            name: form.name.trim(),
            description: `${form.description.trim()}\n\nMetodologia declarada: ${form.methodology}`,
            project_type: form.projectType,
            producer_id: user?.role === 'producer' ? undefined : form.producerId,
            certifier_id: form.certifierId,
            area_hectares: Number(form.areaHectares),
            carbon_stock: Number(form.carbonStock),
            public_marketplace: form.publicMarketplace,
            image_url: form.imageUrl || undefined,
            location: {
                city: form.city.trim(),
                state: selectedRegion?.name || form.state.trim().toUpperCase(),
                stateId: selectedRegion ? selectedRegion.uf.toLowerCase() : normalizeStateId(form.state),
                bioma: form.bioma,
                coordinates,
            },
            tags: normalizeProjectTags(tags),
        };
    }, [form, selectedRegion, tags, user?.role]);

    const buildDraftPayload = useCallback((includeProjectPayload = false): ProjectDraftPayload => {
        const payload: ProjectDraftPayload = {
            form,
            tags,
            selectedRegion: selectedRegion ? {
                id: selectedRegion.id,
                uf: selectedRegion.uf,
                name: selectedRegion.name,
                description: selectedRegion.description,
            } : null,
            selectedDocumentType,
            documents: documents.map((documentItem) => ({
                id: documentItem.id,
                documentType: documentItem.documentType,
                filename: documentName(documentItem),
                sizeBytes: documentSize(documentItem),
                status: documentItem.status,
                uploaded: documentItem.uploaded || null,
            })),
        };

        if (includeProjectPayload) {
            payload.project = buildProjectCreatePayload();
        }

        return payload;
    }, [buildProjectCreatePayload, documents, form, selectedDocumentType, selectedRegion, tags]);

    const applyDraft = (draft: ProjectDraft) => {
        const payload = draft.payload || {};
        const savedForm = (payload.form && typeof payload.form === 'object' ? payload.form : {}) as Partial<ProjectFormState>;
        const savedTags = Array.isArray(payload.tags) ? payload.tags as ProjectTagDraft[] : [];
        const safeSavedForm = { ...savedForm, imageUrl: renderableImageUrl(savedForm.imageUrl) };

        setActiveDraftId(draft.id);
        setForm((current) => ({
            ...current,
            ...safeSavedForm,
            certifierId: savedForm.certifierId || current.certifierId,
            producerId: savedForm.producerId || current.producerId,
        }));
        setTags(savedTags.length >= MIN_PROJECT_TAGS ? savedTags.map((tag) => {
            const hasQtag = typeof tag.has_qtag === 'boolean' ? tag.has_qtag : Boolean(tag.tag_uid || tag.cmac);
            return {
                ...tag,
                has_qtag: hasQtag,
                tag_uid: hasQtag ? tag.tag_uid || '' : '',
                cmac: hasQtag ? tag.cmac || '' : '',
                captureMode: tag.captureMode || 'manual',
            };
        }) : createEmptyProjectTagDrafts());
        setActiveMapVertex(savedTags[0]?.vertex_label || 'A');
        setSelectedDocumentType((payload.selectedDocumentType as ProjectDocumentType) || 'LEGAL_OWNERSHIP');
        setDocuments((draft.documents || []).map((documentItem) => ({
            id: documentItem.id,
            documentType: documentItem.documentType as ProjectDocumentType,
            filename: documentItem.filename || documentItem.storagePath,
            sizeBytes: documentItem.sizeBytes,
            status: 'uploaded' as DocumentStatus,
            uploaded: {
                id: documentItem.id,
                projectId: draft.id,
                documentType: documentItem.documentType,
                filename: documentItem.filename || documentItem.storagePath,
                mimeType: documentItem.mimeType,
                sizeBytes: documentItem.sizeBytes,
                sha256: documentItem.sha256,
                storageBucket: documentItem.storageBucket || 'projects',
                storageObjectPath: documentItem.storageObjectPath || null,
                storagePath: documentItem.storagePath,
                status: documentItem.status,
            },
        })));
        if (steps.some((item) => item.id === draft.currentStep)) {
            setStep(draft.currentStep as StepId);
        }
        const savedAt = new Date(draft.updatedAt);
        setLastSavedAt(Number.isNaN(savedAt.getTime()) ? new Date() : savedAt);
        setDraftSaveState('saved');
        setDraftError('');
        autosaveInitializedRef.current = false;
    };

    const updateField = (field: keyof ProjectFormState) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const updatePublicMarketplace = (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, publicMarketplace: event.target.checked }));
    };

    const patchTag = (vertex: VertexLabel, patch: Partial<ProjectTagDraft>) => {
        setTags((current) => current.map((tag) => (
            tag.vertex_label === vertex ? { ...tag, ...patch } : tag
        )));
    };

    const handleMapCoordinatePick = useCallback((vertex: VertexLabel, latitude: string, longitude: string) => {
        const parsedLatitude = Number(latitude);
        const parsedLongitude = Number(longitude);
        if (coordinateIsUsable(parsedLatitude, parsedLongitude)) {
            setMapInitialPoint({
                latitude: parsedLatitude,
                longitude: parsedLongitude,
                label: `Vértice ${vertex}`,
                zoom: 14,
            });
        }
        setTags((current) => {
            const next = current.map((tag) => (
                tag.vertex_label === vertex ? { ...tag, latitude, longitude, captureMode: 'manual' as const } : tag
            ));
            const nextEmptyVertex = next.find((tag) => tag.vertex_label !== vertex && (!tag.latitude || !tag.longitude))?.vertex_label;
            if (nextEmptyVertex) {
                setActiveMapVertex(nextEmptyVertex);
                return next;
            }
            const currentIndex = next.findIndex((tag) => tag.vertex_label === vertex);
            setActiveMapVertex(next[currentIndex + 1]?.vertex_label || vertex);
            return next;
        });
        setLocationErrors((current) => {
            const next = { ...current };
            delete next[vertex];
            return next;
        });
    }, []);

    const updateTag = (vertex: VertexLabel, field: 'tag_uid' | 'cmac' | 'latitude' | 'longitude') => (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = event.target.value;
        setTags((current) => {
            const next = current.map((tag) => (
                tag.vertex_label === vertex ? { ...tag, [field]: value } : tag
            ));
            const updatedTag = next.find((tag) => tag.vertex_label === vertex);
            if ((field === 'latitude' || field === 'longitude') && updatedTag) {
                const parsedLatitude = parseProjectCoordinate(updatedTag.latitude);
                const parsedLongitude = parseProjectCoordinate(updatedTag.longitude);
                if (coordinateIsUsable(parsedLatitude, parsedLongitude)) {
                    setMapInitialPoint({
                        latitude: parsedLatitude,
                        longitude: parsedLongitude,
                        label: `Vértice ${vertex}`,
                        zoom: 14,
                    });
                }
            }
            return next;
        });
    };

    const toggleActiveVertexQtag = (event: React.ChangeEvent<HTMLInputElement>) => {
        const hasQtag = event.target.checked;
        patchTag(activeVertex, {
            has_qtag: hasQtag,
            ...(hasQtag ? {} : { tag_uid: '', cmac: '' }),
        });
    };

    const handleAddQtag = () => {
        setTags((current) => {
            const next = addProjectTagDraft(current);
            setActiveMapVertex(next[next.length - 1]?.vertex_label || 'A');
            return next;
        });
    };

    const handleRemoveQtag = (vertex: VertexLabel) => {
        setTags((current) => {
            const next = removeProjectTagDraft(current, vertex);
            if (activeMapVertex === vertex) {
                setActiveMapVertex(next[0]?.vertex_label || 'A');
            }
            return next;
        });
        setLocationErrors((current) => {
            const next = { ...current };
            delete next[vertex];
            return next;
        });
    };

    const handleUseCurrentLocation = async (vertex: VertexLabel) => {
        setLocationLoadingVertex(vertex);
        setLocationErrors((current) => ({ ...current, [vertex]: undefined }));
        try {
            const position = await requestCurrentPosition();
            patchTag(vertex, {
                latitude: position.latitude.toFixed(6),
                longitude: position.longitude.toFixed(6),
                captureMode: 'manual',
            });
        } catch (err) {
            setLocationErrors((current) => ({
                ...current,
                [vertex]: err instanceof Error ? err.message : 'Não foi possível obter a localização atual.',
            }));
        } finally {
            setLocationLoadingVertex(null);
        }
    };

    const handleProjectImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setFieldErrors((current) => ({ ...current, projectImage: 'Envie uma imagem em PNG, JPG ou WebP.' }));
            return;
        }

        if (file.size > MAX_PROJECT_IMAGE_BYTES) {
            setFieldErrors((current) => ({ ...current, projectImage: 'A imagem do projeto deve ter até 5 MB.' }));
            return;
        }

        try {
            const imageUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
                reader.readAsDataURL(file);
            });

            setForm((current) => ({
                ...current,
                imageUrl,
                imageFilename: file.name,
                imageMimeType: file.type,
                imageSizeBytes: file.size,
            }));
            setFieldErrors((current) => {
                const next = { ...current };
                delete next.projectImage;
                return next;
            });
        } catch (err) {
            setFieldErrors((current) => ({
                ...current,
                projectImage: err instanceof Error ? err.message : 'Não foi possível carregar a imagem.',
            }));
        }
    };

    const removeProjectImage = () => {
        setForm((current) => ({
            ...current,
            imageUrl: '',
            imageFilename: '',
            imageMimeType: '',
            imageSizeBytes: 0,
        }));
        setFieldErrors((current) => {
            const next = { ...current };
            delete next.projectImage;
            return next;
        });
    };

    const openProjectImagePicker = () => {
        projectImageInputRef.current?.click();
    };

    const updateDocument = useCallback((id: string, patch: Partial<ProjectDocumentDraft>) => {
        setDocuments((current) => current.map((item) => (
            item.id === id ? { ...item, ...patch } : item
        )));
    }, []);

    const handleDocumentSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;

        setDocuments((current) => [
            ...current,
            ...selectedFiles.map((file) => ({
                id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
                documentType: selectedDocumentType,
                file,
                status: 'local' as DocumentStatus,
            })),
        ]);
        event.target.value = '';
    };

    const openDocumentPicker = () => {
        documentFileInputRef.current?.click();
    };

    const removeDocument = (id: string) => {
        setDocuments((current) => current.filter((item) => item.id !== id || item.status === 'uploaded'));
    };

    const uploadPendingDocuments = useCallback(async (draftId: string) => {
        let failed = false;

        for (const documentItem of documents) {
            if (documentItem.status === 'uploaded' || !documentItem.file) continue;
            updateDocument(documentItem.id, { status: 'uploading', error: undefined });
            try {
                const uploaded = await uploadProjectDraftDocument(draftId, documentItem.documentType, documentItem.file);
                updateDocument(documentItem.id, { status: 'uploaded', uploaded, error: undefined });
            } catch (err) {
                failed = true;
                updateDocument(documentItem.id, {
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Não foi possível enviar o documento.',
                });
            }
        }

        return !failed;
    }, [documents, updateDocument]);

    const persistProjectDraft = useCallback(async (options: { uploadDocuments?: boolean; includeProjectPayload?: boolean } = {}) => {
        setDraftSaveState('saving');
        setDraftError('');
        const savedDraft = await saveProjectDraft(
            activeDraftId,
            step,
            buildDraftPayload(Boolean(options.includeProjectPayload)),
            {
                draft_kind: mode === 'edit' ? 'EDIT' : 'CREATE',
                target_project_id: editingProjectId,
            },
        );
        setActiveDraftId(savedDraft.id);
        setDrafts((current) => {
            const others = current.filter((item) => item.id !== savedDraft.id);
            return [savedDraft, ...others];
        });
        const savedAt = new Date(savedDraft.updatedAt);
        setLastSavedAt(Number.isNaN(savedAt.getTime()) ? new Date() : savedAt);
        lastSavedSignatureRef.current = draftSignature;

        if (options.uploadDocuments) {
            const uploaded = await uploadPendingDocuments(savedDraft.id);
            if (!uploaded) {
                setDraftSaveState('error');
                throw new Error('Rascunho salvo, mas um ou mais documentos falharam no upload.');
            }
        }

        setDraftSaveState('saved');
        return savedDraft;
    }, [activeDraftId, buildDraftPayload, draftSignature, editingProjectId, mode, step, uploadPendingDocuments]);

    useEffect(() => {
        if (!hasMeaningfulDraftContent || success) return undefined;
        if (!autosaveInitializedRef.current) {
            autosaveInitializedRef.current = true;
            lastSavedSignatureRef.current = draftSignature;
            return undefined;
        }
        if (draftSignature === lastSavedSignatureRef.current) return undefined;

        setDraftSaveState('dirty');
        const timer = window.setTimeout(() => {
            persistProjectDraft({ uploadDocuments: documents.some((documentItem) => documentItem.status !== 'uploaded' && Boolean(documentItem.file)) })
                .catch((err) => {
                    setDraftSaveState('error');
                    setDraftError(err instanceof Error ? err.message : 'Não foi possível salvar o rascunho.');
                });
        }, AUTO_SAVE_DRAFT_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [documents, draftSignature, hasMeaningfulDraftContent, persistProjectDraft, success]);

    const retryDocumentUploads = async () => {
        setSubmitting(true);
        setError('');
        try {
            const draft = activeDraftId ? null : await persistProjectDraft();
            const draftId = activeDraftId || draft?.id;
            if (!draftId) throw new Error('Salve o rascunho antes de reenviar documentos.');
            const uploaded = await uploadPendingDocuments(draftId);
            if (!uploaded) {
                setStep('documents');
                setError('Rascunho salvo, mas um ou mais documentos falharam no upload.');
                return;
            }
            setError('');
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSaveDraft = async () => {
        setError('');
        try {
            await persistProjectDraft({ uploadDocuments: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Não foi possível salvar o rascunho.';
            setDraftError(message);
            setError(message);
        }
    };

    const handleDiscardDraft = async (draft: ProjectDraft) => {
        const draftForm = (draft.payload?.form && typeof draft.payload.form === 'object' ? draft.payload.form : {}) as Partial<ProjectFormState>;
        const title = draftForm.name || 'Projeto sem nome';
        if (!window.confirm(`Excluir o rascunho "${title}"?`)) return;

        setDeletingDraftId(draft.id);
        setDraftError('');
        try {
            await discardProjectDraft(draft.id);
            setDrafts((current) => current.filter((item) => item.id !== draft.id));
            if (activeDraftId === draft.id) {
                setActiveDraftId(null);
                setDraftSaveState('idle');
                setLastSavedAt(null);
                lastSavedSignatureRef.current = '';
            }
        } catch (err) {
            setDraftError(err instanceof Error ? err.message : 'Não foi possível excluir o rascunho.');
        } finally {
            setDeletingDraftId(null);
        }
    };

    const scrollDraftCarousel = (direction: 'previous' | 'next') => {
        const carousel = draftCarouselRef.current;
        if (!carousel) return;

        const firstCard = carousel.querySelector('[data-draft-card]') as HTMLElement | null;
        const scrollAmount = firstCard ? firstCard.offsetWidth + 12 : carousel.clientWidth;
        carousel.scrollBy({
            left: direction === 'next' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
        });
    };

    const draftStatusText = (() => {
        if (draftSaveState === 'saving') return 'Salvando rascunho...';
        if (draftSaveState === 'dirty') return 'Alterações não salvas. Autosave em até 5 min';
        if (draftSaveState === 'saved') return formatDraftSavedAgo(lastSavedAt);
        if (draftSaveState === 'error') return 'Falha ao salvar rascunho';
        return activeDraftId ? formatDraftSavedAgo(lastSavedAt) : 'Nenhum rascunho salvo';
    })();

    const getVertexStatusMeta = (tag: ProjectTagDraft) => {
        const vertexErrors = tagValidation.vertexErrors[tag.vertex_label] || [];
        const hasAnyValue = Boolean(tag.has_qtag || tag.tag_uid || tag.cmac || tag.latitude || tag.longitude);
        const parsedLatitude = parseProjectCoordinate(tag.latitude);
        const parsedLongitude = parseProjectCoordinate(tag.longitude);
        const hasCoordinates = coordinateIsUsable(parsedLatitude, parsedLongitude);

        if (vertexErrors.length === 0 && hasCoordinates) {
            if (!tag.has_qtag) {
                return {
                    label: 'Sem QTAG física',
                    shortLabel: 'sem QTAG',
                    helper: 'Coordenadas prontas; sem tag física vinculada.',
                    Icon: CheckCircle2,
                    toneClass: 'border-green-200 bg-green-50 text-green-800',
                    iconClass: 'text-green-700',
                };
            }
            return {
                label: 'Vértice completo',
                shortLabel: 'preenchido',
                helper: 'Pronto para compor a área.',
                Icon: CheckCircle2,
                toneClass: 'border-green-200 bg-green-50 text-green-800',
                iconClass: 'text-green-700',
            };
        }

        if (!hasAnyValue) {
            return {
                label: 'Vértice ausente',
                shortLabel: 'ausente',
                helper: 'Sem dados preenchidos.',
                Icon: XCircle,
                toneClass: 'border-red-200 bg-red-50 text-red-800',
                iconClass: 'text-red-700',
            };
        }

        return {
            label: 'Vértice incompleto',
            shortLabel: 'incompleto',
            helper: tag.has_qtag ? 'Complete UID, CMAC e coordenadas.' : 'Complete as coordenadas deste vértice.',
            Icon: AlertTriangle,
            toneClass: 'border-amber-200 bg-amber-50 text-amber-800',
            iconClass: 'text-amber-700',
        };
    };

    const validateProjectStep = () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Informe o nome oficial do projeto.';
        if (!form.description.trim()) errors.description = 'Descreva o objetivo ambiental e o escopo do projeto.';
        if (needsProducerSelection && !form.producerId) errors.producerId = 'Selecione o produtor responsável.';
        if (!form.bioma.trim()) errors.bioma = 'Selecione o bioma.';
        if (!form.methodology.trim()) errors.methodology = 'Selecione a metodologia declarada.';
        if (!form.projectType.trim()) errors.projectType = 'Selecione o tipo de projeto.';
        if (!numericValueIsPositive(form.areaHectares)) errors.areaHectares = 'Informe uma área maior que zero.';
        if (!numericValueIsPositive(form.carbonStock)) errors.carbonStock = 'Informe um estoque/potencial maior que zero.';
        if (!form.certifierId) errors.certifierId = 'Selecione a certificadora.';
        return errors;
    };

    const validateLocationFields = () => {
        const errors: Record<string, string> = {};
        if (!form.city.trim()) errors.city = 'Informe o município.';
        if (inventoryRegions.length === 0) errors.state = 'Catálogo de UFs indisponível.';
        if (inventoryRegions.length > 0 && !selectedRegion) errors.state = 'Selecione uma UF do catálogo.';
        return errors;
    };

    const validateStep = (targetStep: StepId) => {
        setTouchedSteps((current) => ({ ...current, [targetStep]: true }));
        if (targetStep === 'project') {
            const errors = validateProjectStep();
            setFieldErrors(errors);
            return Object.keys(errors).length === 0;
        }
        if (targetStep === 'qtags') {
            const locationErrors = validateLocationFields();
            setFieldErrors(locationErrors);
            return Object.keys(locationErrors).length === 0 && tagValidation.valid;
        }
        if (targetStep === 'documents') {
            return documentValidation.valid;
        }
        if (targetStep === 'review') {
            const projectErrors = validateProjectStep();
            const locationErrors = validateLocationFields();
            setFieldErrors({ ...projectErrors, ...locationErrors });
            return Object.keys(projectErrors).length === 0 && Object.keys(locationErrors).length === 0 && tagValidation.valid && documentValidation.valid;
        }
        return true;
    };

    const goToNextStep = () => {
        setError('');
        if (!validateStep(step)) {
            setError('Revise os campos destacados antes de continuar.');
            return;
        }
        const nextStep = steps[currentStepIndex + 1]?.id;
        if (nextStep) setStep(nextStep);
    };

    const goBack = () => {
        setError('');
        const previousStep = steps[currentStepIndex - 1]?.id;
        if (previousStep) {
            setStep(previousStep);
            return;
        }
        navigate(-1);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        if (!validateStep('review')) {
            setError(`Não foi possível ${mode === 'edit' ? 'atualizar' : 'criar'} o projeto. Revise os campos destacados e tente novamente.`);
            setStep(Object.keys(validateProjectStep()).length > 0 ? 'project' : Object.keys(validateLocationFields()).length > 0 || !tagValidation.valid ? 'qtags' : 'documents');
            return;
        }

        setSubmitting(true);
        try {
            if (mode === 'edit') {
                if (!editingProjectId) throw new Error('Projeto de edição não identificado.');
                await persistProjectDraft({ includeProjectPayload: true, uploadDocuments: true });
                const updatedProject = await database.updateProject(editingProjectId, buildProjectCreatePayload());
                const projectId = updatedProject?.friendlyId || updatedProject?.id || editingProjectId;
                setCreatedProjectId(projectId);
                setSuccess(true);
                window.setTimeout(() => {
                    navigate(`/painel/mrca/${projectId}`);
                }, 1600);
                return;
            }

            const savedDraft = await persistProjectDraft({ includeProjectPayload: true });
            const uploaded = await uploadPendingDocuments(savedDraft.id);
            if (!uploaded) {
                setStep('documents');
                throw new Error('Rascunho salvo, mas um ou mais documentos falharam no upload.');
            }

            const result = await submitProjectDraft(savedDraft.id);
            const projectId = result.project?.friendlyId || result.project?.id || null;
            if (!projectId) {
                throw new Error('Projeto criado sem identificador.');
            }
            setCreatedProjectId(projectId);
            setActiveDraftId(result.draft.id);
            setDrafts((current) => current.filter((item) => item.id !== result.draft.id));

            setSuccess(true);
            window.setTimeout(() => {
                navigate(`/painel/mrca/${projectId}`);
            }, 1600);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Não foi possível ${mode === 'edit' ? 'atualizar' : 'criar'} o projeto. Revise os campos destacados e tente novamente.`);
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (field: string) => (
        `min-h-11 w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${fieldErrors[field]
            ? 'border-red-300 bg-red-50 focus:border-red-500'
            : 'border-gray-200 bg-white focus:border-primary'}`
    );

    const renderFieldError = (field: string) => (
        fieldErrors[field] ? <p className="mt-2 text-xs font-semibold text-red-600">{fieldErrors[field]}</p> : null
    );

    const initialLatitudePlaceholder = initialMapPoint ? initialMapPoint.latitude.toFixed(6) : 'Clique no mapa';
    const initialLongitudePlaceholder = initialMapPoint ? initialMapPoint.longitude.toFixed(6) : 'Clique no mapa';
    const activeTag = tags.find((tag) => tag.vertex_label === activeMapVertex) || tags[0];
    const activeVertex = activeTag?.vertex_label || 'A';
    const activeVertexErrors = activeTag ? tagValidation.vertexErrors[activeVertex] || [] : [];
    const activeVertexStatus = activeTag ? getVertexStatusMeta(activeTag) : null;
    const ActiveStatusIcon = activeVertexStatus?.Icon;

    const renderProjectStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <Leaf className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Dados do projeto</h3>
            </div>

            {touchedSteps.project && Object.keys(fieldErrors).length > 0 && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2 font-bold">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Revise os campos obrigatórios.</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs font-semibold">
                        {Object.values(fieldErrors).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {needsProducerSelection && (
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="producerId">Produtor responsável</label>
                        <select id="producerId" value={form.producerId} onChange={updateField('producerId')} className={inputClass('producerId')} disabled={loadingCatalog}>
                            <option value="">Selecione</option>
                            {producers.map((producer) => (
                                <option key={producer.id} value={producer.id}>{producer.name}</option>
                            ))}
                        </select>
                        {renderFieldError('producerId')}
                    </div>
                )}

                <div className={needsProducerSelection ? '' : 'md:col-span-2'}>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="name">Nome do projeto</label>
                    <input id="name" type="text" value={form.name} onChange={updateField('name')} className={inputClass('name')} placeholder="Reserva Rio Claro" />
                    {renderFieldError('name')}
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="projectImage">Imagem do projeto</label>
                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <button
                            type="button"
                            onClick={openProjectImagePicker}
                            className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            aria-label="Selecionar imagem do projeto"
                        >
                            {form.imageUrl ? (
                                <img src={form.imageUrl} alt="Preview da imagem do projeto" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-center text-xs font-semibold text-gray-500">
                                    <Upload className="h-5 w-5 text-gray-400" />
                                    Nenhuma imagem
                                </div>
                            )}
                        </button>
                        <div className="flex flex-col justify-center gap-3">
                            <input
                                ref={projectImageInputRef}
                                id="projectImage"
                                type="file"
                                accept="image/*"
                                onChange={handleProjectImageSelected}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={openProjectImagePicker}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-gray-950 transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <Upload className="h-4 w-4" />
                                Selecionar imagem
                            </button>
                            <p className="text-xs font-semibold text-gray-600">Use uma imagem de capa em PNG, JPG ou WebP, até 5 MB. Ela aparecerá nos cards e no detalhe do projeto.</p>
                            {form.imageUrl && (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="truncate text-xs font-semibold text-gray-700">
                                        {form.imageFilename || 'Imagem carregada'} · {formatBytes(form.imageSizeBytes)}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={removeProjectImage}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-700 transition-colors hover:bg-red-50"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Remover imagem
                                    </button>
                                </div>
                            )}
                            {renderFieldError('projectImage')}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="bioma">Bioma</label>
                    <select id="bioma" value={form.bioma} onChange={updateField('bioma')} className={inputClass('bioma')}>
                        {biomeOptions.map((bioma) => <option key={bioma} value={bioma}>{bioma}</option>)}
                    </select>
                    {renderFieldError('bioma')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="projectType">Tipo de projeto</label>
                    <select id="projectType" value={form.projectType} onChange={updateField('projectType')} className={inputClass('projectType')}>
                        {projectTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {renderFieldError('projectType')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="methodology">Metodologia</label>
                    <select id="methodology" value={form.methodology} onChange={updateField('methodology')} className={inputClass('methodology')}>
                        {methodologyOptions.map((methodology) => <option key={methodology} value={methodology}>{methodology}</option>)}
                    </select>
                    {renderFieldError('methodology')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="certifierId">Certificadora</label>
                    <select id="certifierId" value={form.certifierId} onChange={updateField('certifierId')} className={inputClass('certifierId')} disabled={loadingCatalog}>
                        <option value="">Selecione</option>
                        {certifiers.map((certifier) => (
                            <option key={certifier.id} value={certifier.id}>{certifier.name}</option>
                        ))}
                    </select>
                    {renderFieldError('certifierId')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="areaHectares">Área total (ha)</label>
                    <input id="areaHectares" type="number" min="0" step="0.01" value={form.areaHectares} onChange={updateField('areaHectares')} className={inputClass('areaHectares')} placeholder="1200" />
                    {renderFieldError('areaHectares')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="carbonStock">Estoque/potencial (tCO2e)</label>
                    <input id="carbonStock" type="number" min="0" step="0.01" value={form.carbonStock} onChange={updateField('carbonStock')} className={inputClass('carbonStock')} placeholder="35000" />
                    {renderFieldError('carbonStock')}
                </div>

                <div className="md:col-span-2">
                    <label
                        htmlFor="publicMarketplace"
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                        <input
                            id="publicMarketplace"
                            type="checkbox"
                            checked={form.publicMarketplace}
                            onChange={updatePublicMarketplace}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>
                            <span className="block text-sm font-extrabold text-gray-950">Disponibilizar no marketplace público</span>
                            <span className="mt-1 block text-xs font-semibold text-gray-600">
                                Mantenha desmarcado enquanto o projeto ainda não deve aparecer nas páginas públicas. A listagem pública só exibe projetos marcados aqui e em status pronto para marketplace.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="description">Descrição</label>
                    <textarea id="description" value={form.description} onChange={updateField('description')} rows={4} className={inputClass('description')} placeholder="Escopo ambiental, histórico da área e objetivo do projeto." />
                    {renderFieldError('description')}
                </div>
            </div>
        </section>
    );

    const renderQtagStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-extrabold uppercase text-gray-900">Localização da área</h3>
                </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-5 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="city">Município</label>
                    <input id="city" type="text" value={form.city} onChange={updateField('city')} className={inputClass('city')} placeholder="Porto Nacional" />
                    {renderFieldError('city')}
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="state">UF</label>
                    <select id="state" value={form.state} onChange={updateField('state')} className={inputClass('state')} disabled={loadingCatalog || inventoryRegions.length === 0}>
                        <option value="">Selecione a UF</option>
                        {inventoryRegions.map((region) => (
                            <option key={region.id} value={region.uf}>{region.uf} - {region.name}</option>
                        ))}
                    </select>
                    {!loadingCatalog && inventoryRegions.length === 0 && (
                        <p className="mt-2 text-xs font-semibold text-red-600">Catálogo de UFs não carregado pelo banco.</p>
                    )}
                    {renderFieldError('state')}
                </div>
            </div>

            {(!tagValidation.valid || touchedSteps.qtags) && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-start gap-2 font-bold">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Registre no mínimo 4 vértices distribuídos ao redor da área do projeto.</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                        Os dados incompletos continuam marcados em cada vértice.
                    </p>
                </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <Radio className="h-4 w-4" />
                        Contexto seguro
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.secureContext ? 'disponível' : 'indisponível'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <MapPin className="h-4 w-4" />
                        Geolocalização
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.geolocation === 'available' ? 'disponível' : 'indisponível'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                        <WifiOff className="h-4 w-4" />
                        NFC
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{fieldCapabilities.nfc === 'available' ? 'bloqueado' : 'indisponível'}</p>
                </div>
            </div>

            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                {nfcCaptureStatus === 'unsupported'
                    ? 'Este navegador não permite leitura NFC aqui. Use captura manual ou um dispositivo compatível.'
                    : 'Validação SUN/CMAC real bloqueada por credenciais ou hardware. O CMAC informado será registrado como evidência declarada.'}
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Vértices do projeto</p>
                    <p className="text-sm font-semibold text-gray-700">Adicione ou edite vértices; marque QTAG apenas quando houver tag física.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${tagValidation.valid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {tagValidation.valid ? `${tags.length} vértices prontos` : `${tags.length}/${MIN_PROJECT_TAGS}+ vértices`}
                    </span>
                    <button
                        type="button"
                        onClick={handleAddQtag}
                        aria-label="Adicionar vértice à área"
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-gray-950 transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        Adicionar vértice
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="mb-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Lista de vértices</p>
                        <p className="mt-1 text-sm font-semibold text-gray-700">Selecione um vértice para editar.</p>
                    </div>
                    <div className="space-y-2">
                        {tags.map((tag) => {
                            const status = getVertexStatusMeta(tag);
                            const StatusIcon = status.Icon;
                            const selected = tag.vertex_label === activeVertex;
                            const coordinateText = tag.latitude && tag.longitude ? `${tag.latitude}, ${tag.longitude}` : 'Coordenadas ausentes';

                            return (
                                <div key={tag.vertex_label} className="flex items-stretch gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveMapVertex(tag.vertex_label)}
                                        aria-label={`Selecionar vértice ${tag.vertex_label} na lista`}
                                        className={`min-h-16 flex-1 rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${selected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-gray-50 hover:border-primary/40 hover:bg-primary/5'}`}
                                    >
                                        <span className="flex items-start gap-2">
                                            <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${status.iconClass}`} aria-hidden="true" />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-extrabold text-gray-950">Vértice {tag.vertex_label}</span>
                                                <span className="mt-0.5 block text-xs font-bold uppercase tracking-wide text-gray-600">{status.label}</span>
                                                <span className="mt-1 block truncate font-mono text-xs text-gray-500">{coordinateText}</span>
                                            </span>
                                        </span>
                                    </button>
                                    {tags.length > MIN_PROJECT_TAGS && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveQtag(tag.vertex_label)}
                                            className="inline-flex h-16 w-10 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                            aria-label={`Remover vértice ${tag.vertex_label}`}
                                            title="Remover vértice"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                    {activeTag && activeVertexStatus && ActiveStatusIcon && (
                        <>
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Dados do vértice ativo</p>
                                    <h4 className="mt-1 text-lg font-extrabold text-gray-950">Vértice ativo: {activeVertex}</h4>
                                    <p className="mt-1 text-sm font-semibold text-gray-600">{activeVertexStatus.helper}</p>
                                </div>
                                <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${activeVertexStatus.toneClass}`}>
                                    <ActiveStatusIcon className={`h-4 w-4 ${activeVertexStatus.iconClass}`} aria-hidden="true" />
                                    {activeVertexStatus.shortLabel}
                                </span>
                            </div>

                            <label
                                htmlFor={`tag-${activeVertex}-has-qtag`}
                                className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                                <input
                                    id={`tag-${activeVertex}-has-qtag`}
                                    type="checkbox"
                                    checked={activeTag.has_qtag}
                                    onChange={toggleActiveVertexQtag}
                                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>
                                    <span className="block text-sm font-extrabold text-gray-950">Possui QTAG</span>
                                    <span className="mt-1 block text-xs font-semibold text-gray-600">
                                        Marque apenas se este vértice tiver uma tag física instalada.
                                    </span>
                                </span>
                            </label>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {activeTag.has_qtag && (
                                    <>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${activeVertex}-uid`}>UID</label>
                                            <input id={`tag-${activeVertex}-uid`} type="text" value={activeTag.tag_uid} onChange={updateTag(activeVertex, 'tag_uid')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder={`ntag-${activeVertex}`} />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${activeVertex}-cmac`}>CMAC</label>
                                            <input id={`tag-${activeVertex}-cmac`} type="text" value={activeTag.cmac} onChange={updateTag(activeVertex, 'cmac')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="cmac declarado" />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${activeVertex}-lat`}>Latitude</label>
                                    <input id={`tag-${activeVertex}-lat`} inputMode="decimal" value={activeTag.latitude} onChange={updateTag(activeVertex, 'latitude')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder={initialLatitudePlaceholder} />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor={`tag-${activeVertex}-lng`}>Longitude</label>
                                    <input id={`tag-${activeVertex}-lng`} inputMode="decimal" value={activeTag.longitude} onChange={updateTag(activeVertex, 'longitude')} className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder={initialLongitudePlaceholder} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleUseCurrentLocation(activeVertex)}
                                disabled={fieldCapabilities.geolocation === 'unsupported' || locationLoadingVertex === activeVertex}
                                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {locationLoadingVertex === activeVertex ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                Usar localização atual
                            </button>

                            {locationErrors[activeVertex] && (
                                <p className="mt-3 text-xs font-semibold text-red-600">{locationErrors[activeVertex]}</p>
                            )}

                            {activeVertexErrors.length > 0 && (
                                <p className="mt-3 text-xs font-semibold text-red-600">
                                    Complete os dados deste vértice.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="space-y-5 xl:col-span-2">
                    <ProjectGeofenceEditorMap
                        tags={tags}
                        activeVertex={activeMapVertex}
                        initialPoint={initialMapPoint}
                        onActiveVertexChange={setActiveMapVertex}
                        onSetVertexCoordinates={handleMapCoordinatePick}
                    />
                    <ProjectGeofencePreview tags={tags} />
                </div>
            </div>
        </section>
    );

    const renderDocumentsStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Documentos</h3>
            </div>

            {!documentValidation.valid && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-start gap-2 font-bold">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Envie os documentos obrigatórios antes de criar o projeto.</span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs font-semibold">
                        {documentValidation.errors.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="documentType">Tipo</label>
                    <select
                        id="documentType"
                        value={selectedDocumentType}
                        onChange={(event) => setSelectedDocumentType(event.target.value as ProjectDocumentType)}
                        className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                        {documentTypeOptions.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-700" htmlFor="documentFile">Arquivo</label>
                    <input
                        ref={documentFileInputRef}
                        id="documentFile"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                        multiple
                        onChange={handleDocumentSelected}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={openDocumentPicker}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-extrabold text-gray-950 transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <Upload className="h-4 w-4" />
                        Selecionar arquivo
                    </button>
                    <p className="mt-2 text-xs font-semibold text-gray-600">PDF, PNG, JPG, CSV ou XLSX. É possível selecionar mais de um arquivo.</p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {documents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-sm font-semibold text-gray-600">
                        Envie os documentos obrigatórios antes de criar o projeto.
                    </div>
                ) : (
                    documents.map((documentItem) => {
                        const StatusIcon = documentItem.status === 'uploaded' ? FileCheck : documentItem.status === 'error' ? XCircle : Upload;
                        return (
                            <div key={documentItem.id} className="rounded-lg border border-gray-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <StatusIcon className={`h-4 w-4 ${documentItem.status === 'uploaded' ? 'text-green-700' : documentItem.status === 'error' ? 'text-red-600' : 'text-amber-700'}`} />
                                            <p className="truncate text-sm font-bold text-gray-950">{documentName(documentItem)}</p>
                                        </div>
                                        <p className="mt-1 text-xs font-semibold text-gray-500">
                                            {documentTypeLabel(documentItem.documentType)} · {formatBytes(documentSize(documentItem))} · {documentStatusLabel(documentItem.status)}
                                        </p>
                                        {documentItem.uploaded && (
                                            <p className="mt-2 font-mono text-xs text-primary">
                                                {truncateHash(documentItem.uploaded.sha256)}
                                            </p>
                                        )}
                                        {documentItem.error && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">{documentItem.error}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {documentItem.status === 'error' && (
                                            <button
                                                type="button"
                                                onClick={retryDocumentUploads}
                                                disabled={submitting}
                                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                                Tentar novamente
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeDocument(documentItem.id)}
                                            disabled={documentItem.status === 'uploading' || documentItem.status === 'uploaded'}
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="Remover documento"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );

    const renderReviewStep = () => (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-extrabold uppercase text-gray-900">Revisão e envio</h3>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-bold uppercase text-gray-500">Projeto</p>
                    {form.imageUrl && (
                        <img src={form.imageUrl} alt="Imagem do projeto" className="mb-4 aspect-[16/9] w-full rounded-lg object-cover" />
                    )}
                    <p className="mt-2 text-lg font-bold text-gray-950">{form.name || 'Nome pendente'}</p>
                    <p className="mt-1 text-sm text-gray-600">{form.city || 'Município'}, {selectedRegion ? `${selectedRegion.name} (${selectedRegion.uf})` : form.state || 'UF'} · {form.bioma}</p>
                    <p className="mt-1 text-sm text-gray-600">{form.methodology} · {form.areaHectares || '0'} ha · {form.carbonStock || '0'} tCO2e</p>
                    <p className="mt-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                        {form.publicMarketplace ? 'Marketplace público habilitado' : 'Marketplace público desmarcado'}
                    </p>
                </div>

                <ProjectGeofencePreview tags={tags} />
            </div>

            <div className="mt-5 rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-bold uppercase text-gray-500">Documentos</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {documents.map((documentItem) => (
                        <div key={documentItem.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <p className="text-sm font-bold text-gray-950">{documentTypeLabel(documentItem.documentType)}</p>
                            <p className="mt-1 truncate text-xs text-gray-600">{documentName(documentItem)}</p>
                            <p className="mt-1 font-mono text-xs text-primary">{truncateHash(documentItem.uploaded?.sha256)}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2 font-bold">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Validação SUN/CMAC real bloqueada por credenciais ou hardware. O CMAC informado será registrado como evidência declarada.</span>
                </div>
            </div>
        </section>
    );

    const renderDraftSaveControl = () => (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:w-auto sm:min-w-[280px] sm:flex-row sm:items-center sm:justify-end">
            <p className={`text-xs font-bold uppercase tracking-wide ${draftSaveState === 'error' ? 'text-red-700' : draftSaveState === 'dirty' ? 'text-amber-800' : 'text-gray-700'}`}>
                {draftStatusText}
            </p>
            <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={draftSaveState === 'saving' || submitting}
                aria-label="Salvar rascunho no rodapé"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {draftSaveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                {mode === 'edit' ? 'Salvar rascunho de edição' : 'Salvar rascunho'}
            </button>
        </div>
    );

    const renderDraftsSection = () => (
        (drafts.length > 0 || loadingDrafts || draftError) ? (
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-sm font-extrabold uppercase text-gray-900">Rascunhos existentes</h3>
                        <p className="mt-1 text-xs font-semibold text-gray-600">
                            {loadingDrafts ? 'Carregando rascunhos...' : `${drafts.length} rascunho(s) salvo(s) para continuar.`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeDraftId && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase text-green-700">Rascunho ativo</span>
                        )}
                        {drafts.length > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => scrollDraftCarousel('previous')}
                                    aria-label="Rascunhos anteriores"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollDraftCarousel('next')}
                                    aria-label="Próximos rascunhos"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {draftError && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{draftError}</p>
                )}

                {drafts.length > 0 && (
                    <div
                        ref={draftCarouselRef}
                        className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
                    >
                        {drafts.map((draft) => {
                            const draftForm = (draft.payload?.form && typeof draft.payload.form === 'object' ? draft.payload.form : {}) as Partial<ProjectFormState>;
                            const title = draftForm.name || 'Projeto sem nome';
                            const updatedAt = new Date(draft.updatedAt);
                            return (
                                <div
                                    key={draft.id}
                                    data-draft-card
                                    className="w-full shrink-0 snap-start rounded-lg border border-gray-200 bg-gray-50 p-3 sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
                                >
                                    <p className="truncate text-sm font-bold text-gray-950">{title}</p>
                                    <p className="mt-1 text-xs font-semibold text-gray-600">
                                        {draft.currentStep} · {Number.isNaN(updatedAt.getTime()) ? 'salvo anteriormente' : formatSavedAgo(updatedAt)}
                                    </p>
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => applyDraft(draft)}
                                            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-gray-950 transition-colors hover:bg-primary-hover"
                                        >
                                            Continuar rascunho
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDiscardDraft(draft)}
                                            disabled={deletingDraftId === draft.id}
                                            aria-label={`Excluir rascunho ${title}`}
                                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {deletingDraftId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Excluir rascunho
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        ) : null
    );

    if (success) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mb-4 text-3xl font-bold text-black">{mode === 'edit' ? 'Projeto atualizado' : 'Projeto criado'}</h2>
                <p className="mx-auto max-w-md text-gray-500">
                    {createdProjectId
                        ? `Projeto ${createdProjectId} ${mode === 'edit' ? 'atualizado.' : 'criado e enviado para a fila da certificadora.'}`
                        : mode === 'edit' ? 'Projeto atualizado.' : 'Projeto criado e enviado para a fila da certificadora.'}
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-black">{mode === 'edit' ? 'Editar projeto' : 'Adicionar projeto'}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        {mode === 'edit' ? 'Atualização controlada com rascunho, geofence e dossiê.' : 'Originação técnica com vértices, geofence e dossiê inicial.'}
                    </p>
                </div>
            </div>

            {loadingProjectForEdit && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                    Carregando dados atuais do projeto...
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {steps.map((item, index) => {
                    const Icon = item.icon;
                    const active = item.id === step;
                    const completed = index < currentStepIndex;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setStep(item.id)}
                            className={`min-h-11 rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 ${active
                                ? 'border-primary bg-primary text-gray-950'
                                : completed
                                    ? 'border-green-200 bg-green-50 text-green-800'
                                    : 'border-gray-200 bg-white text-gray-700'}`}
                            aria-current={active ? 'step' : undefined}
                            aria-label={`Ir para seção ${item.label}`}
                        >
                            <span className="flex items-center gap-2 text-sm font-bold">
                                <Icon className="h-4 w-4" />
                                {index + 1}. {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {step === 'project' && renderProjectStep()}
                {step === 'qtags' && renderQtagStep()}
                {step === 'documents' && renderDocumentsStep()}
                {step === 'review' && renderReviewStep()}

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 lg:flex-row lg:items-center lg:justify-between">
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Voltar
                    </button>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                        {renderDraftSaveControl()}
                        {step === 'review' ? (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-gray-950 shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {mode === 'edit' ? 'Atualizar projeto' : 'Criar projeto'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={goToNextStep}
                                className="inline-flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-extrabold text-gray-950 shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                Continuar
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {renderDraftsSection()}
        </div>
    );
}
