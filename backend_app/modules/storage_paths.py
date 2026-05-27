from __future__ import annotations

from dataclasses import dataclass

PROJECTS_BUCKET = "projects"
PROFILES_BUCKET = "profiles"
USER_DOCUMENTS_BUCKET = "user-documents"


@dataclass(frozen=True)
class StorageLocation:
    bucket: str
    object_path: str
    uri: str


def storage_uri(bucket: str, object_path: str) -> str:
    return f"supabase://{bucket}/{object_path}"


def normalize_document_type(document_type: str) -> str:
    cleaned = document_type.strip().lower().replace("-", "_").replace(" ", "_")
    return "_".join(part for part in cleaned.split("_") if part)


def project_document_location(project_friendly_id: str, document_type: str, sha256: str, extension: str) -> StorageLocation:
    normalized_type = normalize_document_type(document_type)
    object_path = f"projects/{project_friendly_id}/documents/{normalized_type}/{sha256}{extension}"
    return StorageLocation(PROJECTS_BUCKET, object_path, storage_uri(PROJECTS_BUCKET, object_path))


def project_draft_document_location(draft_id: str, document_type: str, sha256: str, extension: str) -> StorageLocation:
    normalized_type = normalize_document_type(document_type)
    object_path = f"projects/drafts/{draft_id}/documents/{normalized_type}/{sha256}{extension}"
    return StorageLocation(PROJECTS_BUCKET, object_path, storage_uri(PROJECTS_BUCKET, object_path))


def project_image_location(project_friendly_id: str, sha256: str, extension: str) -> StorageLocation:
    object_path = f"projects/{project_friendly_id}/images/{sha256}{extension}"
    return StorageLocation(PROFILES_BUCKET, object_path, storage_uri(PROFILES_BUCKET, object_path))


def profile_avatar_location(profile_id: str, sha256: str, extension: str) -> StorageLocation:
    object_path = f"profiles/{profile_id}/avatar/{sha256}{extension}"
    return StorageLocation(PROFILES_BUCKET, object_path, storage_uri(PROFILES_BUCKET, object_path))


def user_document_location(profile_id: str, document_type: str, sha256: str, extension: str) -> StorageLocation:
    normalized_type = normalize_document_type(document_type)
    object_path = f"user-documents/{profile_id}/documents/{normalized_type}/{sha256}{extension}"
    return StorageLocation(USER_DOCUMENTS_BUCKET, object_path, storage_uri(USER_DOCUMENTS_BUCKET, object_path))
