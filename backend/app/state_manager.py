"""Centralized in-memory state store for all registered units."""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from .models import (
    TelemetryUpdateRequest,
    UnitPublicState,
    UnitRegistrationRequest,
    UnitRuntimeState,
    UnitStatus,
    runtime_to_public,
    utc_now,
)


class StateManager:
    """Tracks the authoritative operational picture."""

    def __init__(self) -> None:
        self._units: Dict[str, UnitRuntimeState] = {}
        self._lock = asyncio.Lock()

    async def register_unit(self, payload: UnitRegistrationRequest) -> UnitRuntimeState:
        async with self._lock:
            state = UnitRuntimeState(
                unit_id=payload.unit_id,
                label=payload.label or payload.unit_id,
                lat=payload.position.lat,
                lon=payload.position.lon,
                speed_mps=payload.speed_mps,
                direction_deg=payload.direction_deg,
                status=UnitStatus.idle,
            )
            self._units[payload.unit_id] = state
            return state.clone()

    async def update_from_telemetry(self, payload: TelemetryUpdateRequest) -> UnitRuntimeState:
        async with self._lock:
            if payload.unit_id not in self._units:
                raise KeyError(f"Unit {payload.unit_id} is not registered")
            state = self._units[payload.unit_id]
            if payload.position is not None:
                state.lat = payload.position.lat
                state.lon = payload.position.lon
            if payload.speed_mps is not None:
                state.speed_mps = payload.speed_mps
            if payload.direction_deg is not None:
                state.direction_deg = payload.direction_deg
            if payload.status is not None:
                state.status = payload.status
            if payload.destination is not None:
                state.destination = payload.destination
            state.last_update = utc_now()
            return state.clone()

    async def set_status(self, unit_id: str, status: UnitStatus) -> UnitRuntimeState:
        async with self._lock:
            if unit_id not in self._units:
                raise KeyError(f"Unit {unit_id} is not registered")
            self._units[unit_id].status = status
            self._units[unit_id].last_update = utc_now()
            return self._units[unit_id].clone()

    async def snapshot_units(self) -> List[UnitRuntimeState]:
        async with self._lock:
            return [state.clone() for state in self._units.values()]

    async def persist_unit(self, state: UnitRuntimeState) -> UnitRuntimeState:
        async with self._lock:
            self._units[state.unit_id] = state.clone()
            return state.clone()

    async def get_public_units(self) -> List[UnitPublicState]:
        units = await self.snapshot_units()
        return [runtime_to_public(unit) for unit in units]

    async def get_public_state_payload(self, event_type: str = "state_update") -> dict:
        return {
            "type": event_type,
            "units": [unit.model_dump(mode="json") for unit in await self.get_public_units()],
            "timestamp": utc_now().isoformat(),
        }

    async def get_unit(self, unit_id: str) -> Optional[UnitRuntimeState]:
        async with self._lock:
            state = self._units.get(unit_id)
            return state.clone() if state else None

    async def unit_exists(self, unit_id: str) -> bool:
        async with self._lock:
            return unit_id in self._units
