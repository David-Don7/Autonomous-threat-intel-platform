"""Anomaly detection using Isolation Forest on unit telemetry features."""

from __future__ import annotations

import math
from collections import defaultdict, deque
from typing import Dict, List, Optional

import numpy as np
from sklearn.ensemble import IsolationForest

from .models import UnitRuntimeState

# Minimum samples before the model will train
MIN_BASELINE_SAMPLES = 30
# Maximum history length per unit (sliding window)
MAX_HISTORY = 200


class AnomalyEngine:
    """Trains an Isolation Forest on baseline telemetry and scores live units."""

    def __init__(self) -> None:
        self._baseline_samples: List[List[float]] = []
        self._is_trained: bool = False
        self._model: Optional[IsolationForest] = None
        # Per-unit history for computing acceleration & continuity
        self._history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=MAX_HISTORY))
        # Cache of all current unit positions for inter-unit distance
        self._latest_positions: Dict[str, tuple] = {}

    # ------------------------------------------------------------------
    # Feature extraction
    # ------------------------------------------------------------------

    def _extract_features(self, state: UnitRuntimeState) -> List[float]:
        """Build a feature vector from the current unit state and its history.

        Features:
            0  speed_mps
            1  acceleration (delta speed over last 2 samples)
            2  distance to nearest other unit (metres, capped at 5000)
            3  movement continuity (std-dev of recent heading changes)
            4  time stationary (consecutive samples with speed ≈ 0)
        """
        speed = state.speed_mps

        # --- acceleration ---
        history = self._history.get(state.unit_id)
        prev_speed = history[-1][0] if history and len(history) >= 1 else speed
        acceleration = speed - prev_speed

        # --- distance to nearest unit ---
        min_dist = 5000.0
        for uid, (lat, lon) in self._latest_positions.items():
            if uid == state.unit_id:
                continue
            d = self._haversine(state.lat, state.lon, lat, lon)
            if d < min_dist:
                min_dist = d

        # --- heading continuity (std of recent direction deltas) ---
        headings = [h[1] for h in (history or [])][-10:]
        if len(headings) >= 2:
            deltas = [abs(headings[i] - headings[i - 1]) for i in range(1, len(headings))]
            continuity = float(np.std(deltas)) if deltas else 0.0
        else:
            continuity = 0.0

        # --- time stationary ---
        stationary_count = 0
        if history:
            for sample in reversed(history):
                if sample[0] < 0.05:
                    stationary_count += 1
                else:
                    break

        return [speed, acceleration, min_dist, continuity, float(stationary_count)]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def record_baseline(self, state: UnitRuntimeState) -> None:
        """Record a telemetry snapshot for baseline training."""
        self._latest_positions[state.unit_id] = (state.lat, state.lon)
        features = self._extract_features(state)
        self._baseline_samples.append(features)
        self._history[state.unit_id].append((state.speed_mps, state.direction_deg))

        # Auto-train once enough samples collected
        if not self._is_trained and len(self._baseline_samples) >= MIN_BASELINE_SAMPLES:
            self.train()

    def train(self) -> None:
        """Fit the Isolation Forest on collected baseline samples."""
        if len(self._baseline_samples) < MIN_BASELINE_SAMPLES:
            return
        X = np.array(self._baseline_samples)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42,
        )
        self._model.fit(X)
        self._is_trained = True

    def score_unit(self, state: UnitRuntimeState) -> float:
        """Return a normalized anomaly score in [0, 1].

        Uses the trained Isolation Forest decision function.  Higher = more
        anomalous.  Before training completes, returns 0.
        """
        self._latest_positions[state.unit_id] = (state.lat, state.lon)
        features = self._extract_features(state)
        self._history[state.unit_id].append((state.speed_mps, state.direction_deg))

        if not self._is_trained or self._model is None:
            # Still collecting baseline – record it passively
            self._baseline_samples.append(features)
            if len(self._baseline_samples) >= MIN_BASELINE_SAMPLES:
                self.train()
            return 0.0

        raw = self._model.decision_function(np.array([features]))[0]
        # decision_function returns negative for outliers; normalise to [0, 1]
        score = max(0.0, min(1.0, 0.5 - raw))
        return round(score, 4)

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Return distance in metres between two lat/lon points."""
        R = 6_371_000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
