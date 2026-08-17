import { apiPost } from './api';

export const AUDIT_EVIDENCE_MAX_BYTES = 50 * 1024 * 1024;
export const AUDIT_EVIDENCE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.mp4,image/png,image/jpeg,application/pdf,video/mp4';

export type UploadedAuditEvidence = {
    id: string;
    projectId: string;
    documentType: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
};

type AuditEvidenceUploadResponse = {
    success: boolean;
    id: string;
    project_id: string;
    document_type: string;
    filename?: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    status: string;
};

export const uploadAuditEvidence = async (projectId: string, file: File): Promise<UploadedAuditEvidence> => {
    const body = new FormData();
    body.append('file', file);
    const response = await apiPost<AuditEvidenceUploadResponse>(
        `/audit/${encodeURIComponent(projectId)}/evidence`,
        body,
    );
    if (!response) throw new Error('Upload de evidência sem resposta da API.');
    return {
        id: response.id,
        projectId: response.project_id,
        documentType: response.document_type,
        filename: response.filename || file.name,
        mimeType: response.mime_type,
        sizeBytes: response.size_bytes,
        sha256: response.sha256,
    };
};
