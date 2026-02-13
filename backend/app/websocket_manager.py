"""Utility helpers for managing WebSocket connections."""

from __future__ import annotations

import asyncio
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect


class WebsocketManager:
    """Tracks all connected realtime clients and pushes updates."""

    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        async with self._lock:
            connections = list(self._connections)
        for connection in connections:
            try:
                await connection.send_json(payload)
            except WebSocketDisconnect:
                await self.disconnect(connection)
            except Exception:
                await self.disconnect(connection)

    async def send_personal(self, websocket: WebSocket, payload: dict) -> None:
        await websocket.send_json(payload)

    async def active_count(self) -> int:
        async with self._lock:
            return len(self._connections)
