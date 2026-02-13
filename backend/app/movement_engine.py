"""Central movement engine that advances active units and broadcasts updates."""

from __future__ import annotations

import asyncio
import math
from typing import Optional

from .anomaly_engine import AnomalyEngine
from .models import UnitRuntimeState, UnitStatus, utc_now
from .state_manager import StateManager
from .threat_engine import ThreatEngine
from .websocket_manager import WebsocketManager

EARTH_RADIUS_M = 6_371_000


class MovementEngine:
    """Runs the 1 Hz simulation loop and synchronizes clients."""

    def __init__(
        self,
        state_manager: StateManager,
        websocket_manager: WebsocketManager,
        anomaly_engine: AnomalyEngine,
        threat_engine: ThreatEngine,
        tick_interval: float = 1.0,
    ) -> None:
        self._state_manager = state_manager
        self._websocket_manager = websocket_manager
        self._anomaly_engine = anomaly_engine
        self._threat_engine = threat_engine
        self._tick_interval = tick_interval
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._last_tick = utc_now()

    def start(self) -> None:
        if self._task is not None:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run_loop(self) -> None:
        while self._running:
            await self._tick()
            await asyncio.sleep(self._tick_interval)

    async def _tick(self) -> None:
        now = utc_now()
        delta = (now - self._last_tick).total_seconds()
        self._last_tick = now
        units = await self._state_manager.snapshot_units()
        did_move = False
        for unit in units:
            changed = False
            if unit.status == UnitStatus.active:
                changed |= self._integrate_motion(unit, delta)
            new_anomaly = self._anomaly_engine.score_unit(unit)
            if abs(new_anomaly - unit.anomaly_score) > 1e-6:
                unit.anomaly_score = new_anomaly
                changed = True
            new_risk = self._threat_engine.evaluate_unit(unit)
            if abs(new_risk - unit.risk_score) > 1e-6:
                unit.risk_score = new_risk
                changed = True
            if changed:
                unit.last_update = now
                await self._state_manager.persist_unit(unit)
                did_move = True
        if did_move:
            payload = await self._state_manager.get_public_state_payload()
            await self._websocket_manager.broadcast(payload)

    def _integrate_motion(self, unit: UnitRuntimeState, delta_seconds: float) -> bool:
        if unit.speed_mps <= 0 or delta_seconds <= 0:
            return False
        heading_rad = math.radians(unit.direction_deg)
        distance = unit.speed_mps * delta_seconds
        delta_lat = (distance * math.cos(heading_rad)) / EARTH_RADIUS_M
        lat_radians = math.radians(unit.lat)
        cos_lat = math.cos(lat_radians) or 1e-6
        delta_lon = (distance * math.sin(heading_rad)) / (EARTH_RADIUS_M * cos_lat)
        unit.lat += math.degrees(delta_lat)
        unit.lon += math.degrees(delta_lon)
        unit.lon = ((unit.lon + 180) % 360) - 180
        return True
