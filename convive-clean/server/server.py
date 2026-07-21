#!/usr/bin/env python3
"""
convive - WebSocket session server
Handles room creation, partner joining, and swipe sync between two clients.
"""

import asyncio
import json
import random
import string
import logging
from typing import Dict, Optional
from dataclasses import dataclass, field

import websockets
from websockets.asyncio.server import ServerConnection

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("convive")

# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class Client:
    ws: ServerConnection
    name: str
    role: str  # "host" | "guest"
    swipes: list = field(default_factory=list)
    done: bool = False

@dataclass
class Session:
    code: str
    recipes: list = field(default_factory=list)  # list of recipe slugs (set by host)
    clients: dict = field(default_factory=dict)   # role -> Client

sessions: Dict[str, Session] = {}

# ── Helpers ───────────────────────────────────────────────────────────────────

def gen_code(length=5):
    return "".join(random.choices(string.ascii_uppercase, k=length))

async def send(ws: ServerConnection, msg: dict):
    try:
        await ws.send(json.dumps(msg))
    except Exception as e:
        log.warning(f"Send failed: {e}")

async def broadcast(session: Session, msg: dict, exclude_role: Optional[str] = None):
    for role, client in session.clients.items():
        if role != exclude_role:
            await send(client.ws, msg)

def compute_matches(session: Session):
    if len(session.clients) < 2:
        return []
    slugs = [set(c.swipes) for c in session.clients.values()]
    return list(slugs[0].intersection(slugs[1]))

# ── Message handlers ──────────────────────────────────────────────────────────

async def handle_create(ws: ServerConnection, data: dict):
    """Host creates a new session."""
    name = data.get("name", "Host")
    code = gen_code()
    while code in sessions:
        code = gen_code()

    session = Session(code=code)
    session.clients["host"] = Client(ws=ws, name=name, role="host")
    sessions[code] = session

    log.info(f"Session {code} created by {name}")
    await send(ws, {"type": "created", "code": code})
    return code

async def handle_join(ws: ServerConnection, data: dict):
    """Guest joins an existing session."""
    code = data.get("code", "").upper()
    name = data.get("name", "Guest")

    if code not in sessions:
        await send(ws, {"type": "error", "message": "Session not found. Check the code."})
        return None

    session = sessions[code]
    if "guest" in session.clients:
        await send(ws, {"type": "error", "message": "Session is full."})
        return None

    session.clients["guest"] = Client(ws=ws, name=name, role="guest")
    log.info(f"{name} joined session {code}")

    host_name = session.clients["host"].name

    await send(ws, {
        "type": "joined",
        "code": code,
        "hostName": host_name,
        "recipes": session.recipes,
    })

    await send(session.clients["host"].ws, {
        "type": "partner_joined",
        "partnerName": name,
    })

    return code

async def handle_recipes(ws: ServerConnection, session: Session, data: dict):
    """Host sends the recipe deck for this session."""
    session.recipes = data.get("recipes", [])
    log.info(f"Session {session.code}: {len(session.recipes)} recipes loaded")

async def handle_swipe(ws: ServerConnection, session: Session, client: Client, data: dict):
    """A client records a swipe. Broadcasts progress to partner."""
    slug = data.get("slug")
    direction = data.get("direction")

    if direction == "right" and slug:
        client.swipes.append(slug)

    partner_role = "guest" if client.role == "host" else "host"
    if partner_role in session.clients:
        total_swiped = data.get("totalSwiped", 0)
        await send(session.clients[partner_role].ws, {
            "type": "partner_progress",
            "count": total_swiped,
        })

async def handle_done(ws: ServerConnection, session: Session, client: Client, data: dict):
    """A client has finished swiping."""
    client.swipes = data.get("likes", [])
    client.done = True
    log.info(f"Session {session.code}: {client.name} finished with {len(client.swipes)} likes")

    partner_role = "guest" if client.role == "host" else "host"

    if partner_role in session.clients:
        await send(session.clients[partner_role].ws, {
            "type": "partner_done",
            "partnerName": client.name,
        })

    all_done = all(c.done for c in session.clients.values())
    if all_done and len(session.clients) == 2:
        matches = compute_matches(session)
        log.info(f"Session {session.code}: {len(matches)} matches")
        await broadcast(session, {
            "type": "matches",
            "slugs": matches,
        })

# ── Connection handler ────────────────────────────────────────────────────────

async def handler(ws: ServerConnection):
    session_code = None
    client_role = None

    try:
        async for raw in ws:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await send(ws, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "create":
                session_code = await handle_create(ws, data)
                client_role = "host"

            elif msg_type == "join":
                session_code = await handle_join(ws, data)
                if session_code:
                    client_role = "guest"

            elif msg_type == "ping":
                await send(ws, {"type": "pong"})

            else:
                if not session_code or session_code not in sessions:
                    await send(ws, {"type": "error", "message": "No active session"})
                    continue

                session = sessions[session_code]
                client = session.clients.get(client_role)
                if not client:
                    continue

                if msg_type == "recipes":
                    await handle_recipes(ws, session, data)
                elif msg_type == "swipe":
                    await handle_swipe(ws, session, client, data)
                elif msg_type == "done":
                    await handle_done(ws, session, client, data)

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        if session_code and session_code in sessions:
            session = sessions[session_code]
            if client_role and client_role in session.clients:
                name = session.clients[client_role].name
                del session.clients[client_role]
                log.info(f"{name} disconnected from session {session_code}")

                await broadcast(session, {
                    "type": "partner_left",
                    "message": f"{name} disconnected.",
                })

            if not session.clients:
                del sessions[session_code]
                log.info(f"Session {session_code} closed")

# ── Entry point ───────────────────────────────────────────────────────────────

async def main():
    host = "0.0.0.0"
    port = 8765
    log.info(f"convive WebSocket server starting on ws://{host}:{port}")
    async with websockets.serve(handler, host, port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
