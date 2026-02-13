# Autonomous Multi-Source Threat Intelligence Platform

A real-time distributed behavioral intelligence system that simulates field unit movement, learns baseline operational patterns, detects anomalous behavior using ML, correlates deviations across multiple sources, and presents probabilistic threat intelligence through a centralized geospatial dashboard.

## Architecture

```
┌──────────────┐      HTTP / WS      ┌──────────────────┐
│  Node        │ ◄──────────────────► │     Backend      │
│  Simulator   │   register / telem  │  (FastAPI brain)  │
│  (Expo app)  │                     │                   │
└──────────────┘                     │  Movement Engine  │
                                     │  Anomaly Engine   │
┌──────────────┐      WebSocket      │  Threat Engine    │
│  Commander   │ ◄──────────────────► │  State Manager    │
│  Dashboard   │   live state feed   │  WebSocket Mgr    │
│  (React+Map) │                     └──────────────────┘
└──────────────┘
```

**Backend** = single source of truth. All movement is centrally simulated. ML runs server-side. Frontends are passive renderers.

## Quick Start

### 1. Backend (must run first)

```bash
cd backend
python -m venv ../.venv          # or use existing venv
../.venv/Scripts/activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify: `GET http://localhost:8000/api/health`

### 2. Commander Dashboard

```bash
cd dashboard
npm install
npm run dev        # opens http://localhost:3000
```

### 3. Node Simulator (Expo)

```bash
cd node-simulator
npm install
npm start          # scan QR with Expo Go on your phone
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status + unit count |
| GET | `/api/units` | Full operational picture |
| GET | `/api/alerts` | Active threat alerts |
| POST | `/api/register-unit` | Register a new field unit |
| POST | `/api/update-telemetry` | Update unit speed / direction / status |
| WS | `/ws` | Real-time state stream |

## ML Pipeline

1. **Feature Extraction** – speed, acceleration, distance to nearest unit, heading continuity, time stationary
2. **Baseline Collection** – first 30 samples per unit build the training set
3. **Isolation Forest** – unsupervised model auto-trains once baseline is sufficient
4. **Anomaly Scoring** – each tick scores every unit in [0, 1]
5. **Threat Inference** – combines anomaly + persistence + spatial clustering → risk score + alerts

## Demo Scenarios

| Scenario | Trigger | Expected Alert |
|----------|---------|----------------|
| Coordinated slowdown | 2+ nearby units with elevated anomaly | "Coordinated anomaly detected" |
| Unit immobility | Active unit with speed ≈ 0 for 8+ ticks | "Possible distress" |
| High individual risk | Single unit risk > 0.75 | "Risk score critically elevated" |

## Team Structure

- **Member 1** – Backend Intelligence Core
- **Member 2** – Node Simulator (React Native)
- **Member 3** – Dashboard Map & Visualization
- **Member 4** – Dashboard Alerts & UI
