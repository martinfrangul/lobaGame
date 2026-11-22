const rooms = new Map();
const socketToRoom = new Map();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function normalizeConfig(config = {}) {
  const playerCount = [2, 3, 4].includes(config.playerCount) ? config.playerCount : 2;
  const gameMode = config.gameMode === "mas" ? "mas" : "menos";
  const jokerMode = config.jokerMode === "mobile" ? "mobile" : "fixed";
  return { playerCount, gameMode, jokerMode };
}

export function createRoom(socketId, name, config) {
  const code = generateCode();
  const token = generateToken();
  const room = {
    code,
    host: socketId,
    config: normalizeConfig(config),
    players: [{ socketId, name, ready: false, connected: true, token }],
    started: false,
    game: null,
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return { room, token };
}

export function getRoom(code) {
  return code ? rooms.get(String(code).toUpperCase()) : null;
}

export function getRoomBySocket(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : null;
}

export function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  if (room.started) return { error: "La partida ya comenzó" };
  if (room.players.length >= room.config.playerCount) return { error: "Sala llena" };
  if (room.players.some((p) => p.socketId === socketId)) return { error: "Ya estás en la sala" };
  const token = generateToken();
  room.players.push({ socketId, name, ready: false, connected: true, token });
  socketToRoom.set(socketId, room.code);
  return { room, token };
}

export function reconnectPlayer(code, token, socketId) {
  const room = getRoom(code);
  if (!room) return { error: "Sala no encontrada" };
  const player = room.players.find((p) => p.token === token);
  if (!player) return { error: "Token inválido" };

  const oldSocketId = player.socketId;
  if (oldSocketId && oldSocketId !== socketId) {
    socketToRoom.delete(oldSocketId);
  }
  player.socketId = socketId;
  player.connected = true;
  socketToRoom.set(socketId, room.code);

  // update game player socketId if started
  if (room.game) {
    const gp = room.game.players.find((p) => p.token === token || p.socketId === oldSocketId);
    if (gp) gp.socketId = socketId;
  }
  return { room, token };
}

export function leaveRoom(socketId) {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  if (room.started) {
    const p = room.players.find((x) => x.socketId === socketId);
    if (p) p.connected = false;
    socketToRoom.delete(socketId);
      // No avanzar turno automáticamente: se preserva el estado para reconexión.
      return { room, disconnected: true };
  }

  room.players = room.players.filter((p) => p.socketId !== socketId);
  socketToRoom.delete(socketId);
  if (room.players.length === 0) {
    rooms.delete(code);
    return { deleted: true };
  }
  if (room.host === socketId) room.host = room.players[0].socketId;
  return { room };
}

export function setReady(socketId, ready) {
  const room = getRoomBySocket(socketId);
  if (!room || room.started) return { error: "No se puede cambiar estado" };
  const p = room.players.find((x) => x.socketId === socketId);
  if (!p) return { error: "Jugador no encontrado" };
  p.ready = !!ready;
  return { room };
}