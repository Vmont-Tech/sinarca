import { apiGet, apiPatch, apiPost } from './api';
import type { ProjectDocumentType, UploadedProjectDocument } from './projectDocuments';

export type ProjectDraftStatus = 'DRAFT' | 'SUBMITTED' | 'DISCARDED';

export type ProjectDraftDocument = {
    id: string;
    documentType: string;
    filename?: string | null;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    storageBucket: string;
    storageObjectPath?: string | null;
    storagePath: string;
    uploadedAt: string;
    status: string;
};

export type ProjectDraftPayload = Record<string, unknown>;

export type ProjectDraft = {
    id: string;
    status: ProjectDraftStatus;
    draftKind?: 'CREATE' | 'EDIT';
    targetProjectId?: string | null;
    currentStep: string;
    payload: ProjectDraftPayload;
    documents: ProjectDraftDocument[];
    submittedProjectId?: string | null;
    submittedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ProjectDraftSubmitResult = {
    draft: ProjectDraft;
    project: any;
};

type DraftResponse = {
    draft: ProjectDraft;
};

type DraftsResponse = {
    drafts: ProjectDraft[];
};

type ProjectDraftDocumentUploadResponse = {
    id: string;
    draft_id: string;
    document_type: string;
    filename?: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    storage_bucket: string;
    storage_object_path?: string | null;
    storage_path: string;
    status: string;
};

type SubmitResponse = {
    draft: ProjectDraft;
    project: any;
};

export const listProjectDrafts = async (): Promise<ProjectDraft[]> => {
    const response = await apiGet<DraftsResponse>('/project-drafts?status=DRAFT');
    return response?.drafts || [];
};

export const getProjectDraft = async (draftId: string): Promise<ProjectDraft> => {
    const response = await apiGet<DraftResponse>(`/project-drafts/${draftId}`);
    if (!response?.draft) {
        throw new Error('Rascunho não encontrado.');
    }
    return response.draft;
};

type ProjectDraftSaveOptions = {
    draft_kind?: 'CREATE' | 'EDIT';
    target_project_id?: string | null;
};

export const createProjectDraft = async (
    currentStep: string,
    payload: ProjectDraftPayload,
    options: ProjectDraftSaveOptions = {},
): Promise<ProjectDraft> => {
    const response = await apiPost<DraftResponse>('/project-drafts', {
        current_step: currentStep,
        payload,
        draft_kind: options.draft_kind || 'CREATE',
        target_project_id: options.target_project_id || null,
    });
    if (!response?.draft) {
        throw new Error('Não foi possível salvar o rascunho.');
    }
    return response.draft;
};

export const saveProjectDraft = async (
    draftId: string | null,
    currentStep: string,
    payload: ProjectDraftPayload,
    options: ProjectDraftSaveOptions = {},
): Promise<ProjectDraft> => {
    const body = {
        current_step: currentStep,
        payload,
        draft_kind: options.draft_kind || 'CREATE',
        target_project_id: options.target_project_id || null,
    };
    const response = draftId
        ? await apiPatch<DraftResponse>(`/project-drafts/${draftId}`, body)
        : await createProjectDraft(currentStep, payload, options).then((draft) => ({ draft }));

    if (!response?.draft) {
        throw new Error('Não foi possível salvar o rascunho.');
    }
    return response.draft;
};

export const discardProjectDraft = async (draftId: string): Promise<ProjectDraft> => {
    const response = await apiPatch<DraftResponse>(`/project-drafts/${draftId}`, { status: 'DISCARDED' });
    if (!response?.draft) {
        throw new Error('Não foi possível excluir o rascunho.');
    }
    return response.draft;
};

export const uploadProjectDraftDocument = async (
    draftId: string,
    documentType: ProjectDocumentType,
    file: File,
): Promise<UploadedProjectDocument> => {
    const body = new FormData();
    body.append('document_type', documentType);
    body.append('file', file);

    const response = await apiPost<ProjectDraftDocumentUploadResponse>(`/project-drafts/${draftId}/documents`, body);
    if (!response) {
        throw new Error('Upload de documento sem resposta da API.');
    }

    return {
        id: response.id,
        projectId: response.draft_id,
        documentType: response.document_type,
        filename: response.filename || file.name,
        mimeType: response.mime_type,
        sizeBytes: response.size_bytes,
        sha256: response.sha256,
        storageBucket: response.storage_bucket,
        storageObjectPath: response.storage_object_path,
        storagePath: response.storage_path,
        status: response.status,
    };
};

export const submitProjectDraft = async (draftId: string): Promise<ProjectDraftSubmitResult> => {
    const response = await apiPost<SubmitResponse>(`/project-drafts/${draftId}/submit`);
    if (!response?.draft || !response.project) {
        throw new Error('Não foi possível enviar o rascunho.');
    }
    return { draft: response.draft, project: response.project };
};
