"""Threat inference engine – correlates anomaly data to produce risk & alerts."""

from __future__ import annotations

import math
import uuid
from collections import defaultdict, deque
from typing import Dict, List

from .models import AlertPayload, UnitRuntimeState, utc_now

# Severity labels
SEV_LOW = "low"
SEV_ELEVATED = "elevated"
SEV_HIGH = "high"
SEV_CRITICAL = "critical"


class ThreatEngine:
    """Combines per-unit anomaly scores with cross-unit correlation to derive
    regional risk levels and emit alert payloads."""

    def __init__(self) -> None:
        self._low_threshold = 0.3
        self._elevated_threshold = 0.55
        self._high_threshold = 0.75
        # Rolling history of anomaly scores per unit (for persistence check)
        self._score_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=30))
        # Active alerts (dedup key -> AlertPayload)
        self._active_alerts: Dict[str, AlertPayload] = {}
        # Cooldown tracker so we don't spam identical alerts
        self._alert_cooldowns: Dict[str, float] = {}

    # ------------------------------------------------------------------
    # Per-unit risk scoring
    # ------------------------------------------------------------------

    def evaluate_unit(self, state: UnitRuntimeState) -> float:
        """Return a risk score in [0, 1] using anomaly score + persistence."""
        self._score_history[state.unit_id].append(state.anomaly_score)
        history = list(self._score_history[state.unit_id])

        # Base risk from current anomaly score
        base = state.anomaly_score

        # Persistence factor – how long the score has been elevated
        elevated_count = sum(1 for s in history if s > self._low_threshold)
        persistence = min(1.0, elevated_count / max(len(history), 1))

        # Combined score (70% current, 30% persistence)
        risk = 0.7 * base + 0.3 * persistence
        return round(min(1.0, risk), 4)

    # ------------------------------------------------------------------
    # Cross-unit correlation & alert generation
    # ------------------------------------------------------------------

    def evaluate_all(self, units: List[UnitRuntimeState]) -> List[AlertPayload]:
        """Run correlation rules across the entire unit set and return new alerts."""
        new_alerts: List[AlertPayload] = []

        # --- Rule 1: Coordinated slowdown (≥2 nearby units with elevated anomaly) ---
        high_units = [u for u in units if u.anomaly_score > self._elevated_threshold]
        clusters = self._spatial_cluster(high_units, radius_m=2000)
        for cluster in clusters:
            if len(cluster) >= 2:
                key = "cluster_" + "_".join(sorted(u.unit_id for u in cluster))
                alert = self._maybe_alert(
                    key,
                    SEV_HIGH,
                    f"Coordinated anomaly detected among {len(cluster)} units in close proximity",
                    [u.unit_id for u in cluster],
                )
                if alert:
                    new_alerts.append(alert)

        # --- Rule 2: Single unit immobility while active ---
        for u in units:
            if u.status.value == "active" and u.speed_mps < 0.05:
                history = list(self._score_history.get(u.unit_id, []))
                stationary_ticks = sum(1 for _ in history[-10:])
                if stationary_ticks >= 8:
                    key = f"immobile_{u.unit_id}"
                    alert = self._maybe_alert(
                        key,
                        SEV_ELEVATED,
                        f"Unit {u.unit_id} appears immobile while marked active – possible distress",
                        [u.unit_id],
                    )
                    if alert:
                        new_alerts.append(alert)

        # --- Rule 3: Individual high-risk unit ---
        for u in units:
            if u.risk_score > self._high_threshold:
                key = f"high_risk_{u.unit_id}"
                alert = self._maybe_alert(
                    key,
                    SEV_CRITICAL if u.risk_score > 0.9 else SEV_HIGH,
                    f"Unit {u.unit_id} risk score critically elevated ({u.risk_score:.2f})",
                    [u.unit_id],
                )
                if alert:
                    new_alerts.append(alert)

        return new_alerts

    def get_severity(self, risk_score: float) -> str:
        if risk_score >= self._high_threshold:
            return SEV_CRITICAL
        if risk_score >= self._elevated_threshold:
            return SEV_HIGH
        if risk_score >= self._low_threshold:
            return SEV_ELEVATED
        return SEV_LOW

    @property
    def active_alerts(self) -> List[AlertPayload]:
        return list(self._active_alerts.values())

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _maybe_alert(
        self, key: str, severity: str, message: str, affected: List[str]
    ) -> AlertPayload | None:
        now = utc_now().timestamp()
        if key in self._alert_cooldowns and now - self._alert_cooldowns[key] < 15:
            return None  # cooldown active
        alert = AlertPayload(
            alert_id=str(uuid.uuid4())[:8],
            severity=severity,
            message=message,
            affected_units=affected,
            created_at=utc_now(),
        )
        self._active_alerts[key] = alert
        self._alert_cooldowns[key] = now
        return alert

    @staticmethod
    def _spatial_cluster(
        units: List[UnitRuntimeState], radius_m: float
    ) -> List[List[UnitRuntimeState]]:
        """Greedy single-link clustering of units within *radius_m* metres."""
        visited = set()
        clusters: List[List[UnitRuntimeState]] = []
        for i, u in enumerate(units):
            if i in visited:
                continue
            cluster = [u]
            visited.add(i)
            for j, v in enumerate(units):
                if j in visited:
                    continue
                if ThreatEngine._haversine(u.lat, u.lon, v.lat, v.lon) <= radius_m:
                    cluster.append(v)
                    visited.add(j)
            clusters.append(cluster)
        return clusters

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6_371_000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
