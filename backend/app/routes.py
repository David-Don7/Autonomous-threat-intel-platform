"""HTTP route definitions for the FastAPI service."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from .models import AlertPayload, Destination, TelemetryUpdateRequest, UnitPublicState, UnitRegistrationRequest, UnitStatus, runtime_to_public
from .state_manager import StateManager
from .threat_engine import ThreatEngine
from .websocket_manager import WebsocketManager

router = APIRouter()


def get_state_manager(request: Request) -> StateManager:
    return request.app.state.state_manager  # type: ignore[attr-defined]


def get_websocket_manager(request: Request) -> WebsocketManager:
    return request.app.state.websocket_manager  # type: ignore[attr-defined]


def get_threat_engine(request: Request) -> ThreatEngine:
    return request.app.state.threat_engine  # type: ignore[attr-defined]


@router.get("/health")
async def healthcheck(state_manager: StateManager = Depends(get_state_manager)) -> dict:
    units = await state_manager.get_public_units()
    return {"status": "ok", "unit_count": len(units)}


@router.get("/units", response_model=list[UnitPublicState])
async def get_units(state_manager: StateManager = Depends(get_state_manager)) -> list[UnitPublicState]:
    return await state_manager.get_public_units()


@router.get("/alerts", response_model=list[AlertPayload])
async def get_alerts(threat_engine: ThreatEngine = Depends(get_threat_engine)) -> list[AlertPayload]:
    return threat_engine.active_alerts


@router.post("/register-unit", response_model=UnitPublicState, status_code=status.HTTP_201_CREATED)
async def register_unit(
    payload: UnitRegistrationRequest,
    state_manager: StateManager = Depends(get_state_manager),
    websocket_manager: WebsocketManager = Depends(get_websocket_manager),
) -> UnitPublicState:
    state = await state_manager.register_unit(payload)
    await websocket_manager.broadcast(await state_manager.get_public_state_payload())
    return runtime_to_public(state)


class AssignDestinationRequest(BaseModel):
    unit_id: str = Field(..., min_length=3, max_length=64)
    destination: Destination


@router.post("/assign-destination", response_model=UnitPublicState)
async def assign_destination(
    payload: AssignDestinationRequest,
    state_manager: StateManager = Depends(get_state_manager),
    websocket_manager: WebsocketManager = Depends(get_websocket_manager),
) -> UnitPublicState:
    try:
        state = await state_manager.update_from_telemetry(
            TelemetryUpdateRequest(
                unit_id=payload.unit_id,
                destination=payload.destination,
                status=UnitStatus.active,
            )
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await websocket_manager.broadcast(await state_manager.get_public_state_payload())
    return runtime_to_public(state)


@router.post("/update-telemetry", response_model=UnitPublicState)
async def update_telemetry(
    payload: TelemetryUpdateRequest,
    state_manager: StateManager = Depends(get_state_manager),
    websocket_manager: WebsocketManager = Depends(get_websocket_manager),
) -> UnitPublicState:
    try:
        state = await state_manager.update_from_telemetry(payload)
    except KeyError as exc:  # pragma: no cover - FastAPI handles messaging
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await websocket_manager.broadcast(await state_manager.get_public_state_payload())
    return runtime_to_public(state)
