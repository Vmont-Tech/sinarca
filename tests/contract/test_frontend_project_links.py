from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_project_detail_links_prefer_friendly_ids() -> None:
    global_map = read("src/pages/Dashboard/GlobalMap.tsx")
    database_service = read("src/services/database.ts")
    mrca_item = read("src/components/MRCAItem.tsx")

    assert "projectId: proj.friendlyId" in database_service
    assert "project.friendlyId || project.id" in global_map
    assert "hoveredProject.friendlyId || hoveredProject.id" in global_map
    assert "data.friendlyId || data.projectId || data.id" in mrca_item
    assert "navigate(`/painel/mrca/${project.id}`)" not in global_map
    assert "navigate(`/painel/mrca/${hoveredProject.id}`)" not in global_map


def test_review_queues_read_mrca_metrics_payload() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")
    certifier_review = read("src/pages/Dashboard/CertifierReview.tsx")

    for review_page in (auditor_review, certifier_review):
        assert "project.metrics?.totalAreaHa" in review_page
        assert "project.metrics?.carbonStock" in review_page
        assert "project.area_hectares.toLocaleString" not in review_page
        assert "project.carbonStock.toLocaleString" not in review_page


def test_auditor_queue_has_client_side_pagination() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "const pageSize = 5" in auditor_review
    assert "paginatedItems.map" in auditor_review
    assert "Página {currentPage} de {totalPages}" in auditor_review
    assert "setCurrentPage((page) => Math.max(1, page - 1))" in auditor_review
    assert "setCurrentPage((page) => Math.min(totalPages, page + 1))" in auditor_review


def test_auditor_queue_exposes_field_evidence_review_and_report_submission() -> None:
    auditor_review = read("src/pages/Dashboard/AuditorReview.tsx")

    assert "database.getMonitoringProject(project.friendlyId || project.id)" in auditor_review
    assert "Revisar evidências" in auditor_review
    assert "Tags NFC 424 DNA" in auditor_review
    assert "VERIFICAÇÃO DE TAGS" in auditor_review
    assert "ESTADO DA ÁREA" in auditor_review
    assert "evidencias_url: evidenceUrls" in auditor_review
    assert "assinatura_digital: draft.signature" in auditor_review
    assert "const latitude = draft.latitude ? Number(draft.latitude) : undefined;" in auditor_review
    assert "const longitude = draft.longitude ? Number(draft.longitude) : undefined;" in auditor_review
    assert "Área preservada conforme baseline" in auditor_review
