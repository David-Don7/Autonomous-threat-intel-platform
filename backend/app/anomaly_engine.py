"""Lightweight scaffolding for anomaly detection logic."""

from __future__ import annotations

from typing import List

from .models import UnitRuntimeState


class AnomalyEngine:
    """Placeholder Isolation Forest wrapper (to be expanded in later phases)."""

    def __init__(self) -> None:
        self._baseline_samples: List[List[float]] = []
        self._is_trained = False

    def score_unit(self, state: UnitRuntimeState) -> float:
        """Return a normalized anomaly score between 0 and 1."""

        if not self._is_trained:
            return 0.0
        # Future implementation will load the Isolation Forest model and infer scores.
        return 0.0

    def record_baseline(self, state: UnitRuntimeState) -> None:
        feature_vector = [state.speed_mps]
        self._baseline_samples.append(feature_vector)
