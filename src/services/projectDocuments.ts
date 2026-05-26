import { apiPost } from './api';

export type ProjectDocumentType = 'LEGAL_OWNERSHIP' | 'CAR' | 'FOREST_INVENTORY' | 'KML_OR_SHP' | 'OTHER';

export type UploadedProjectDocument = {
    id: string;
    projectId: string;
    documentType: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    storagePath: string;
    status: string;
};

type ProjectDocumentUploadResponse = {
    id: string;
    project_id: string;
    document_type: string;
    filename?: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    storage_path: string;
    status: string;
};

export const uploadProjectDocument = async (
    projectId: string,
    documentType: ProjectDocumentType,
    file: File,
): Promise<UploadedProjectDocument> => {
    const body = new FormData();
    body.append('document_type', documentType);
    body.append('file', file);

    const response = await apiPost<ProjectDocumentUploadResponse>(`/projects/${projectId}/documents`, body);
    if (!response) {
        throw new Error('Upload de documento sem resposta da API.');
    }

    return {
        id: response.id,
        projectId: response.project_id,
        documentType: response.document_type,
        filename: response.filename || file.name,
        mimeType: response.mime_type,
        sizeBytes: response.size_bytes,
        sha256: response.sha256,
        storagePath: response.storage_path,
        status: response.status,
    };
};
