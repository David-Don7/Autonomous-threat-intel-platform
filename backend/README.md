# Backend Service

This directory contains the central brain of the Autonomous Multi-Source Threat Intelligence Platform. The backend is responsible for:

- Hosting the FastAPI HTTP and WebSocket servers
- Maintaining the authoritative state of every simulated unit
- Running the movement engine that advances all active units in lock-step
- Executing anomaly detection and threat inference logic
- Broadcasting real-time updates to the commander dashboard and node simulator clients

## Key Modules

| File | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI app factory, startup/shutdown events, WebSocket endpoint |
| `app/routes.py` | REST endpoints for registering nodes and ingesting telemetry |
| `app/state_manager.py` | Centralized in-memory state management |
| `app/movement_engine.py` | 1 Hz simulation loop that updates positions and risk metrics |
| `app/websocket_manager.py` | Tracks connected clients and pushes broadcast messages |
| `app/anomaly_engine.py` | Isolation Forest scaffolding for anomaly scoring |
| `app/threat_engine.py` | Rule-based threat inference and alert generation |
| `app/models.py` | Shared request/response schemas and runtime data classes |

## Local Development

1. Create a virtual environment and install dependencies from `requirements.txt`.
2. Start the API server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. Verify the following:
   - `POST /api/register-unit` registers a unit and returns its state
   - `POST /api/update-telemetry` updates a unit's motion parameters
   - `GET /api/units` returns the entire operational picture
   - `ws://localhost:8000/ws` streams live state payloads

During the hackathon the backend should always run first so the dashboard and node simulator have a source of truth to connect to.
