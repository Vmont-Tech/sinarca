from __future__ import annotations

from typing import Any, Protocol


class ISinarcaLiquidity(Protocol):
    def confirm_collateral(self, project_id: str, amount_brl: float, pix_reference: str) -> dict[str, Any]:
        """Confirma lastro financeiro para liberar mint bloqueado."""

    def release_funds(self, project_id: str, amount_brl: float) -> dict[str, Any]:
        """Solicita liberação ou liquidação de fundos do projeto."""

    def status(self, reference: str) -> dict[str, Any]:
        """Consulta o estado de uma referência financeira no provedor."""
