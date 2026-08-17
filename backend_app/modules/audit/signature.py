from __future__ import annotations

# Phase 05 / D-03 -- Assinatura verificavel de auditoria de campo.
#
# Modulo PURO: sem banco, sem ORM. Nao existe hardware biometrico disponivel
# neste ambiente (mesma realidade documentada na Phase 3 para SUN/Sentinel),
# entao a assinatura desta fase e um STUB DETERMINISTICO VERIFICAVEL, nunca
# uma assinatura biometrica ou criptografica real. Segue o principio
# fail-closed de backend_app/adapters/stellar.py: nunca simular o sucesso de
# um mecanismo que nao existe. A UI rotula explicitamente como
# "Assinatura verificável (stub SHA-256)".

import hashlib
from datetime import datetime
from typing import Sequence

AUDIT_SIGNATURE_KIND = "STUB_SHA256"


def audit_signature_payload(
    *,
    auditor_id: str,
    project_id: str,
    report_text: str,
    signed_at: datetime,
    evidence_ids: Sequence[str],
) -> str:
    """String canonica assinada (D-03). Ordem dos ids nunca altera o resultado."""
    joined = ",".join(sorted(str(item) for item in evidence_ids))
    return f"{auditor_id}|{project_id}|{report_text}|{signed_at.isoformat()}|{joined}"


def compute_audit_signature(
    *,
    auditor_id: str,
    project_id: str,
    report_text: str,
    signed_at: datetime,
    evidence_ids: Sequence[str],
) -> str:
    raw = audit_signature_payload(
        auditor_id=auditor_id,
        project_id=project_id,
        report_text=report_text,
        signed_at=signed_at,
        evidence_ids=evidence_ids,
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
