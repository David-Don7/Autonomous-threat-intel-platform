"""Shared data models for API contracts and runtime state."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(tz=timezone.utc)


class UnitStatus(str, Enum):
    """Enumerates the possible lifecycle states for a unit."""

    idle = "idle"
    active = "active"
    paused = "paused"
    offline = "offline"


class Position(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)


class Destination(Position):
    pass


class UnitRegistrationRequest(BaseModel):
    unit_id: str = Field(..., min_length=3, max_length=64)
    label: Optional[str] = Field(None, max_length=128)
    position: Position
    speed_mps: float = Field(0.0, ge=0.0)
    direction_deg: float = Field(0.0, ge=0.0, le=360.0)


class TelemetryUpdateRequest(BaseModel):
    unit_id: str = Field(..., min_length=3, max_length=64)
    position: Optional[Position] = None
    speed_mps: Optional[float] = Field(None, ge=0.0)
    direction_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    status: Optional[UnitStatus] = None
    destination: Optional[Destination] = None


class UnitPublicState(BaseModel):
    unit_id: str
    label: Optional[str] = None
    lat: float
    lon: float
    speed_mps: float
    direction_deg: float
    status: UnitStatus
    anomaly_score: float
    risk_score: float
    last_update: datetime
    destination: Optional[Destination] = None


class AlertPayload(BaseModel):
    alert_id: str
    severity: str
    message: str
    affected_units: list[str] = Field(default_factory=list)
    created_at: datetime


@dataclass
class UnitRuntimeState:
    unit_id: str
    lat: float
    lon: float
    speed_mps: float = 0.0
    direction_deg: float = 0.0
    status: UnitStatus = UnitStatus.idle
    label: Optional[str] = None
    anomaly_score: float = 0.0
    risk_score: float = 0.0
    destination: Optional[Destination] = None
    last_update: datetime = utc_now()

    def clone(self) -> "UnitRuntimeState":
        return replace(self)


def runtime_to_public(state: UnitRuntimeState) -> UnitPublicState:
    """Convert an internal runtime state into an API-friendly payload."""

    return UnitPublicState(
        unit_id=state.unit_id,
        label=state.label,
        lat=state.lat,
        lon=state.lon,
        speed_mps=state.speed_mps,
        direction_deg=state.direction_deg,
        status=state.status,
        anomaly_score=state.anomaly_score,
        risk_score=state.risk_score,
        last_update=state.last_update,
        destination=state.destination,
    )
