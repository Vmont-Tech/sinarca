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
