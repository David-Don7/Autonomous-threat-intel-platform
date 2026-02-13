"""Entry point for the FastAPI backend service."""

from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .anomaly_engine import AnomalyEngine
from .movement_engine import MovementEngine
from .routes import router as api_router
from .state_manager import StateManager
from .threat_engine import ThreatEngine
from .websocket_manager import WebsocketManager

app = FastAPI(title="Autonomous Threat Intelligence Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state_manager = StateManager()
anomaly_engine = AnomalyEngine()
threat_engine = ThreatEngine()
websocket_manager = WebsocketManager()
movement_engine = MovementEngine(state_manager, websocket_manager, anomaly_engine, threat_engine)

app.state.state_manager = state_manager  # type: ignore[attr-defined]
app.state.websocket_manager = websocket_manager  # type: ignore[attr-defined]

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def on_startup() -> None:
    movement_engine.start()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await movement_engine.stop()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket_manager.connect(websocket)
    try:
        await websocket_manager.send_personal(
            websocket,
            await state_manager.get_public_state_payload(event_type="state_init"),
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
    except Exception:
        await websocket_manager.disconnect(websocket)
