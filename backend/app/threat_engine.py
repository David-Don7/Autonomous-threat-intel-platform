"""Rule-based threat inference scaffolding."""

from __future__ import annotations

from .models import UnitRuntimeState


class ThreatEngine:
    """Combines anomaly scores with heuristic context to derive risk levels."""

    def __init__(self) -> None:
        self._low_threshold = 0.3
        self._high_threshold = 0.7

    def evaluate_unit(self, state: UnitRuntimeState) -> float:
        """Return a risk score in the range [0, 1]."""

        score = state.anomaly_score
        if score < self._low_threshold:
            return 0.2 * score
        if score < self._high_threshold:
            return 0.5 + 0.5 * (score - self._low_threshold)
        return min(1.0, 0.8 + 0.2 * (score - self._high_threshold))
