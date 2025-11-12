"""
WebSocket Manager for Real-Time Quest Updates

Broadcasts events to all connected clients watching specific quests:
- New evidence submitted
- Probability updates
- New comments
- Bounty contributions
- Quest convergence

This enables live streaming updates in the UI without polling.
"""

from typing import Dict, Set
from fastapi import WebSocket
import json
import asyncio


class ConnectionManager:
    """Manages WebSocket connections per quest and global feed"""

    def __init__(self):
        # quest_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Global feed connections (all quest activity)
        self.global_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, quest_id: str):
        """Connect a client to a quest's update stream"""
        await websocket.accept()

        async with self._lock:
            if quest_id not in self.active_connections:
                self.active_connections[quest_id] = set()
            self.active_connections[quest_id].add(websocket)

        print(f"✅ WebSocket connected to quest {quest_id} (total: {len(self.active_connections[quest_id])})")

    async def disconnect(self, websocket: WebSocket, quest_id: str):
        """Disconnect a client from a quest's update stream"""
        async with self._lock:
            if quest_id in self.active_connections:
                self.active_connections[quest_id].discard(websocket)
                if not self.active_connections[quest_id]:
                    del self.active_connections[quest_id]

        print(f"❌ WebSocket disconnected from quest {quest_id}")

    async def connect_global(self, websocket: WebSocket):
        """Connect a client to the global activity feed"""
        await websocket.accept()

        async with self._lock:
            self.global_connections.add(websocket)

        print(f"✅ WebSocket connected to global feed (total: {len(self.global_connections)})")

    async def disconnect_global(self, websocket: WebSocket):
        """Disconnect a client from the global activity feed"""
        async with self._lock:
            self.global_connections.discard(websocket)

        print(f"❌ WebSocket disconnected from global feed")

    async def broadcast(self, quest_id: str, event_type: str, data: dict, quest_title: str = None):
        """
        Broadcast an event to all clients watching this quest AND global feed

        Event types:
        - "evidence_submitted": New evidence added
        - "probability_update": Hypothesis probabilities changed
        - "comment_added": New comment on evidence
        - "bounty_added": Bounty pool increased
        - "quest_converged": Quest reached convergence
        - "hypothesis_fork": Hypothesis forked into scoped variants
        """
        message = {
            "type": event_type,
            "quest_id": quest_id,
            "data": data,
            "timestamp": data.get("timestamp") or asyncio.get_event_loop().time()
        }

        # Add quest_title for global feed
        if quest_title:
            message["quest_title"] = quest_title

        async with self._lock:
            # Get quest-specific connections
            quest_connections = self.active_connections.get(quest_id, set()).copy()
            # Get global feed connections
            global_connections = self.global_connections.copy()

        # Send to quest-specific clients
        disconnected = []
        for connection in quest_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Error sending to WebSocket: {e}")
                disconnected.append(connection)

        # Send to global feed clients (only for major events)
        global_events = {'evidence_submitted', 'quest_converged', 'hypothesis_fork'}
        if event_type in global_events:
            global_disconnected = []
            for connection in global_connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"⚠️ Error sending to global WebSocket: {e}")
                    global_disconnected.append(connection)

            # Clean up dead global connections
            if global_disconnected:
                async with self._lock:
                    for conn in global_disconnected:
                        self.global_connections.discard(conn)

            if global_connections:
                print(f"🌐 Broadcast '{event_type}' to {len(global_connections) - len(global_disconnected)} global feed clients")

        # Clean up dead quest connections
        if disconnected:
            async with self._lock:
                if quest_id in self.active_connections:
                    for conn in disconnected:
                        self.active_connections[quest_id].discard(conn)

        if quest_connections:
            print(f"📡 Broadcast '{event_type}' to {len(quest_connections) - len(disconnected)} clients for quest {quest_id}")


# Singleton instance
_manager = None

def get_connection_manager() -> ConnectionManager:
    global _manager
    if _manager is None:
        _manager = ConnectionManager()
    return _manager
