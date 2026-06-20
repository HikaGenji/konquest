/**
 * Authoritative multiplayer server — SCAFFOLD.
 *
 * The current playable build is hotseat (pass & play) and runs entirely in the
 * browser. This file shows how the *same* pure game engine becomes the source
 * of truth for online play with almost no changes: the engine's `apply()`
 * reducer is deterministic and side-effect free, so the server simply owns one
 * `GameState` per room, validates each incoming action, applies it, and
 * broadcasts the new state to everyone in the room.
 *
 * Run with:  cd server && npm install && npm run dev
 *
 * NOTE: this is a starting point for the next milestone, not a finished
 * lobby/auth system. Reconnection, persistence, spectators and per-player
 * turn enforcement are intentionally left as TODOs.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { apply, createGame } from '../../src/engine/game';
import { POWERS } from '../../src/engine/map';
import type { GameAction, GameState, PowerId } from '../../src/engine/types';

interface Room {
  id: string;
  state: GameState;
  /** socket -> the power that client controls (turn enforcement). */
  seats: Map<WebSocket, PowerId>;
  clients: Set<WebSocket>;
}

const rooms = new Map<string, Room>();
const PORT = Number(process.env.PORT ?? 8787);

function getOrCreateRoom(id: string): Room {
  let room = rooms.get(id);
  if (!room) {
    room = {
      id,
      // Defaults; a real lobby would let players pick powers before starting.
      state: createGame({
        powers: POWERS.slice(0, 2).map((p) => p.id),
        seed: Math.floor(Math.random() * 1_000_000),
        maxTurns: 30,
      }),
      seats: new Map(),
      clients: new Set(),
    };
    rooms.set(id, room);
  }
  return room;
}

function broadcast(room: Room): void {
  const payload = JSON.stringify({ type: 'state', state: room.state });
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Modern Conquest server listening on ws://localhost:${PORT}`);

wss.on('connection', (socket) => {
  let room: Room | null = null;

  socket.on('message', (raw) => {
    let msg: { type: string; roomId?: string; action?: GameAction };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join' && msg.roomId) {
      room = getOrCreateRoom(msg.roomId);
      room.clients.add(socket);
      // Seat the joiner in the next unclaimed power.
      const taken = new Set(room.seats.values());
      const free = room.state.players.map((p) => p.power).find((p) => !taken.has(p));
      if (free) room.seats.set(socket, free);
      broadcast(room);
      return;
    }

    if (msg.type === 'action' && room && msg.action) {
      const seat = room.seats.get(socket);
      const current = room.state.players[room.state.currentPlayerIndex].power;
      // Only the player whose turn it is may act.
      if (seat !== current) return;
      room.state = apply(room.state, msg.action);
      broadcast(room);
    }
  });

  socket.on('close', () => {
    if (!room) return;
    room.clients.delete(socket);
    room.seats.delete(socket);
    if (room.clients.size === 0) rooms.delete(room.id);
  });
});
