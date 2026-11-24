import {
  startGame as sharedStartGame,
  startNewRound as sharedStartNewRound,
  computeEndRound,
  isValidCombination,
  possibleAssignmentsForCards,
  isSoparable,
  canUseDiscardCard,
  makeMeld,
  shuffleDeck,
  RANKS,
  RANK_ORDER_MAP,
} from "../shared/index.js";

function fail(socket, message) {
  socket.emit("error", { message });
}

function emitRoomUpdate(io, room) {
  io.to(room.code).emit("room:update", {
    code: room.code,
    host: room.host,
    started: room.started,
    config: room.config,
    players: room.players.map((p) => ({
      socketId: p.socketId,
      name: p.name,
      ready: p.ready,
      connected: p.connected,
    })),
  });
}

function emitState(io, room) {
  const game = room.game;
  if (!game) return;
  const publicPlayers = game.players.map((p) => ({
    name: p.name,
    points: p.points,
    combinations: p.combinations,
    eliminated: p.eliminated,
    handCount: (p.hand || []).length,
  }));
  const publicState = {
    roomCode: room.code,
    started: true,
    config: room.config,
    players: publicPlayers,
    deckCount: (game.deck || []).length,
    discardPile: game.discardPile || [],
    currentTurn: game.currentTurn,
    cardDrawn: !!game.cardDrawn,
    drawnFromDiscard: !!game.drawnFromDiscard,
    drawnCardId: game.drawnCardId || null,
    pendingJokers: game.pendingJokers || 0,
    gameOver: !!game.gameOver,
    roundResult: game.roundResult || null,
  };
  io.to(room.code).emit("state:public", publicState);

  room.players.forEach((rp, idx) => {
    const player = game.players[idx];
    const sock = io.sockets.sockets.get(rp.socketId);
    if (sock && player) {
      sock.emit("state:private", { hand: player.hand || [], lastDrawnCardId: game.lastDrawnCardId || null });
    }
  });
}

function createGame(room) {
  const shared = sharedStartGame(room.config);
  const players = room.players.map((rp, idx) => ({
    ...shared.players[idx],
    name: rp.name,
    socketId: rp.socketId,
    token: rp.token,
  }));
  return {
    config: room.config,
    players,
    deck: shared.deck,
    discardPile: shared.discardPile,
    currentTurn: Math.floor(Math.random() * players.length),
    cardDrawn: false,
    drawnFromDiscard: false,
    drawnCardId: null,
    lastDrawnCardId: null,
    pendingJokers: 0,
    gameOver: false,
    started: true,
    roundResult: null,
    roundTimer: null,
    pendingChoice: null,
    pendingMoveChoice: null,
  };
}

function playerIndex(game, socketId) {
  return game.players.findIndex((p) => p.socketId === socketId);
}

import {
  createRoom,
  getRoomBySocket,
  joinRoom,
  leaveRoom,
  setReady,
  reconnectPlayer,
  getRoom,
} from "./rooms.js";

export function registerHandlers(io) {
  function resolveEmptyHand(game, room, idx) {
    const prevPlayers = game.players;
    const result = computeEndRound(game.players, idx, game.config.gameMode);
    const deltas = result.players.map((p, i) => p.points - (prevPlayers[i]?.points || 0));
    game.players = result.players;
    if (result.gameOver) {
      game.gameOver = true;
      const msg = result.winnerName ? `¡${result.winnerName} ha ganado la partida!` : "Juego terminado";
      io.to(room.code).emit("info", { message: msg });
      io.to(room.code).emit("game:over", { winnerName: result.winnerName });
    } else {
      game.roundResult = {
        winnerIndex: idx,
        winnerName: result.winnerName || game.players[idx]?.name || `Jugador ${idx + 1}`,
        players: result.players,
        deltas,
      };
      if (game.roundTimer) clearTimeout(game.roundTimer);
      game.roundTimer = setTimeout(() => {
        if (!room.game || room.game !== game || !game.roundResult) return;
        const round = sharedStartNewRound(idx, game.players);
        game.players = round.players;
        game.deck = round.deck;
        game.discardPile = round.discardPile;
        game.currentTurn = round.currentTurn;
        game.cardDrawn = false;
        game.pendingJokers = 0;
        game.drawnFromDiscard = false;
        game.drawnCardId = null;
        game.roundResult = null;
        game.roundTimer = null;
        emitState(io, room);
      }, 6000);
    }
  }

  io.on("connection", (socket) => {
    socket.on("room:create", (payload, cb) => {
      try {
        const name = String(payload?.name || "Jugador").trim() || "Jugador";
        const res = createRoom(socket.id, name, payload?.config);
        const room = res.room;
        const token = res.token;
        socket.join(room.code);
        emitRoomUpdate(io, room);
        if (typeof cb === "function") cb({ ok: true, code: room.code, token });
      } catch (e) {
        fail(socket, e.message);
        if (typeof cb === "function") cb({ ok: false, error: e.message });
      }
    });

    socket.on("room:join", (payload, cb) => {
      const res = joinRoom(payload?.code, socket.id, String(payload?.name || "Jugador").trim() || "Jugador");
      if (res.error) {
        fail(socket, res.error);
        if (typeof cb === "function") cb({ ok: false, error: res.error });
        return;
      }
      const room = res.room;
      const token = res.token;
      socket.join(room.code);
      emitRoomUpdate(io, room);
      if (typeof cb === "function") cb({ ok: true, code: room.code, token });
    });

    socket.on("room:reconnect", (payload, cb) => {
      const code = payload?.code;
      const token = payload?.token;
      const res = reconnectPlayer(code, token, socket.id);
      if (res.error) {
        fail(socket, res.error);
        if (typeof cb === "function") cb({ ok: false, error: res.error });
        return;
      }
      const room = res.room;
      socket.join(room.code);
      emitRoomUpdate(io, room);
      if (room.game) emitState(io, room);
      if (typeof cb === "function") cb({ ok: true, code: room.code, token: res.token });
    });

    socket.on("room:leave", () => {
      const res = leaveRoom(socket.id);
      if (!res) return;
      if (res.deleted) return;
      if (res.room) emitRoomUpdate(io, res.room);
    });

    socket.on("room:ready", (payload) => {
      const res = setReady(socket.id, payload?.ready);
      if (res.error) {
        fail(socket, res.error);
        return;
      }
      emitRoomUpdate(io, res.room);
    });

    socket.on("game:start", (payload, cb) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return fail(socket, "Sala no encontrada");
      if (room.host !== socket.id) return fail(socket, "Solo el anfitrión puede iniciar");
      if (room.started) return fail(socket, "La partida ya comenzó");
      if (room.players.length !== room.config.playerCount) {
        fail(socket, `Se necesitan ${room.config.playerCount} jugadores`);
        if (typeof cb === "function") cb({ ok: false, error: "players" });
        return;
      }
      if (!room.players.every((p) => p.ready)) {
        fail(socket, "Todos los jugadores deben estar listos");
        if (typeof cb === "function") cb({ ok: false, error: "ready" });
        return;
      }
      room.started = true;
      room.game = createGame(room);
      io.to(room.code).emit("game:started", { code: room.code });
      emitState(io, room);
      emitRoomUpdate(io, room);
      if (typeof cb === "function") cb({ ok: true });
    });

    // ---------- game actions ----------
    socket.on("action:draw", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");
      if (game.cardDrawn) return fail(socket, "Ya tomaste una carta");
      const source = payload?.source;

      if (source === "deck") {
        let deck = [...game.deck];
        let discard = [...game.discardPile];
        if (deck.length === 0) {
          if (discard.length <= 1) return fail(socket, "El mazo está vacío");
          const top = discard[discard.length - 1];
          const toShuffle = discard.slice(0, -1);
          deck = shuffleDeck(toShuffle);
          discard = [top];
        }
        if (deck.length === 0) return fail(socket, "El mazo está vacío");
        const card = deck[deck.length - 1];
        game.deck = deck.slice(0, -1);
        game.discardPile = discard;
        game.players[idx].hand = [...game.players[idx].hand, card];
        game.cardDrawn = true;
        game.drawnFromDiscard = false;
        game.drawnCardId = null;
        game.lastDrawnCardId = card.id;
      } else if (source === "discardPile") {
        if (!game.discardPile || game.discardPile.length === 0) return fail(socket, "El pozo está vacío");
        const card = game.discardPile[game.discardPile.length - 1];
        if (!canUseDiscardCard(card, game.players[idx].hand || [], game.players, game.config.jokerMode)) {
          return fail(socket, "No hay jugada posible con esa carta");
        }
        game.discardPile = game.discardPile.slice(0, -1);
        game.players[idx].hand = [...game.players[idx].hand, card];
        game.cardDrawn = true;
        game.drawnFromDiscard = true;
        game.drawnCardId = card.id;
        game.lastDrawnCardId = card.id;
      } else {
        return fail(socket, "Origen inválido");
      }
      emitState(io, room);
    });

    socket.on("action:discard", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");
      if (!game.cardDrawn) return fail(socket, "Primero debes tomar una carta");
      if ((game.pendingJokers || 0) > 0) return fail(socket, "Debes jugar el comodín recuperado");

      if (game.drawnFromDiscard && (game.players[idx].hand || []).some((c) => c.id === game.drawnCardId)) {
        return fail(socket, "Debes usar la carta del pozo antes de descartar");
      }

      const cardId = payload?.cardId;
      const player = game.players[idx];
      const card = (player.hand || []).find((c) => c.id === cardId);
      if (!card) return fail(socket, "Carta no está en tu mano");

      const newHand = player.hand.filter((c) => c.id !== cardId);
      game.discardPile = [...(game.discardPile || []), card];
      player.hand = newHand;

      if (newHand.length === 0) {
        const prevPlayers = game.players;
        const result = computeEndRound(game.players, idx, game.config.gameMode);
        const deltas = result.players.map((p, i) => p.points - (prevPlayers[i]?.points || 0));
        game.players = result.players;
        if (result.gameOver) {
          game.gameOver = true;
          const msg = result.winnerName ? `¡${result.winnerName} ha ganado la partida!` : "Juego terminado";
          io.to(room.code).emit("info", { message: msg });
          io.to(room.code).emit("game:over", { winnerName: result.winnerName });
        } else {
          game.roundResult = {
            winnerIndex: idx,
            winnerName: result.winnerName || game.players[idx]?.name || `Jugador ${idx + 1}`,
            players: result.players,
            deltas,
          };
          if (game.roundTimer) clearTimeout(game.roundTimer);
          game.roundTimer = setTimeout(() => {
            if (!room.game || room.game !== game || !game.roundResult) return;
            const round = sharedStartNewRound(idx, game.players);
            game.players = round.players;
            game.deck = round.deck;
            game.discardPile = round.discardPile;
            game.currentTurn = round.currentTurn;
            game.cardDrawn = false;
            game.pendingJokers = 0;
            game.drawnFromDiscard = false;
            game.drawnCardId = null;
            game.roundResult = null;
            game.roundTimer = null;
            emitState(io, room);
          }, 6000);
        }
      } else {
        game.cardDrawn = false;
        game.pendingJokers = 0;
        game.drawnFromDiscard = false;
        game.drawnCardId = null;
        game.lastDrawnCardId = null;
        game.currentTurn = (game.currentTurn + 1) % game.players.length;
      }
      emitState(io, room);
    });

    socket.on("action:drop", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");

      const player = game.players[idx];
      const cardIds = Array.isArray(payload?.cardIds) ? payload.cardIds : [];
      const cards = cardIds.map((id) => (player.hand || []).find((c) => c.id === id)).filter(Boolean);
      if (cards.length !== cardIds.length) return fail(socket, "Cartas inválidas");
      if (cards.length < 3) return fail(socket, "Necesitas al menos 3 cartas");

      const assignment = payload?.assignment;
      if (assignment) {
        if (!isValidCombination(cards, assignment)) return fail(socket, "Combinación inválida");
        const ids = new Set(cards.map((c) => c.id));
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        player.combinations = [...player.combinations, makeMeld(cards, assignment)];
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
          emitState(io, room);
          return;
        }
        emitState(io, room);
        return;
      }

      const options = possibleAssignmentsForCards(cards, {});
      if (options.length === 0) return fail(socket, "Combinación inválida");
      if (options.length === 1) {
        const ids = new Set(cards.map((c) => c.id));
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        player.combinations = [...player.combinations, makeMeld(cards, options[0])];
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
          emitState(io, room);
          return;
        }
        emitState(io, room);
        return;
      }
      game.pendingChoice = { type: "drop", cards, options, context: { type: "drop" }, selectedCards: cards, playerIndex: idx };
      socket.emit("prompt:joker", { cards, options, context: { type: "drop" } });
    });

    socket.on("action:layoff", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");

      const meldRef = payload?.meldRef;
      if (!meldRef) return fail(socket, "Selecciona una combinación");
      const owner = game.players[meldRef.playerIndex];
      const meld = owner?.combinations?.[meldRef.meldIndex];
      if (!meld) return fail(socket, "Combinación no encontrada");

      const player = game.players[idx];
      const cardIds = Array.isArray(payload?.cardIds) ? payload.cardIds : [];
      const cards = cardIds.map((id) => (player.hand || []).find((c) => c.id === id)).filter(Boolean);
      if (cards.length !== cardIds.length) return fail(socket, "Cartas inválidas");
      if (cards.length === 0) return fail(socket, "Selecciona las cartas a agregar");

      const newCards = [...meld.cards, ...cards];
      const allowReassign = game.config.jokerMode === "mobile";
      const baseAssignment = allowReassign ? {} : { ...(meld.jokerAssignments || {}) };
      const options = possibleAssignmentsForCards(newCards, baseAssignment);
      if (options.length === 0) return fail(socket, "La combinación resultante no es válida");

      const assignment = payload?.assignment;
      const finalize = (asn) => {
        const updatedMeld = makeMeld(newCards, asn);
        owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
        const ids = new Set(cards.map((c) => c.id));
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
        }
      };

      if (assignment) {
        if (!options.some((o) => JSON.stringify(o) === JSON.stringify(assignment))) return fail(socket, "Asignación inválida");
        finalize(assignment);
        emitState(io, room);
        return;
      }
      if (options.length === 1) {
        finalize(options[0]);
        emitState(io, room);
        return;
      }
      game.pendingChoice = { type: "layoff", cards: newCards, options, context: { type: "layoff", meldRef, selectedCards: cards }, playerIndex: idx };
      socket.emit("prompt:joker", { cards: newCards, options, context: { type: "layoff", meldRef } });
    });

    socket.on("action:substitute", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");
      if (game.config.jokerMode !== "mobile") return fail(socket, "Sustitución no disponible en modo fijo");

      const meldRef = payload?.meldRef;
      if (!meldRef) return fail(socket, "Selecciona una combinación");
      if (meldRef.playerIndex !== idx) return fail(socket, "Solo puedes sustituir en tu turno");
      const owner = game.players[meldRef.playerIndex];
      const meld = owner?.combinations?.[meldRef.meldIndex];
      if (!meld) return fail(socket, "Combinación no encontrada");

      const jokerIndex = meld.cards.findIndex((c) => c.rank === "JOKER");
      if (jokerIndex === -1) return fail(socket, "La combinación no tiene comodín");

      const player = game.players[idx];
      const cardId = payload?.cardId;
      const naturalCard = (player.hand || []).find((c) => c.id === cardId);
      if (!naturalCard) return fail(socket, "Carta no está en tu mano");

      const jokerCard = meld.cards[jokerIndex];
      const newCards = meld.cards.map((c, i) => (i === jokerIndex ? naturalCard : c));
      const baseAssignment = { ...(meld.jokerAssignments || {}) };
      delete baseAssignment[jokerCard.id];
      const options = possibleAssignmentsForCards(newCards, baseAssignment);
      if (options.length === 0) return fail(socket, "La sustitución no es válida");

      const finalize = (asn) => {
        const updatedMeld = makeMeld(newCards, asn);
        owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
        player.hand = player.hand.filter((c) => c.id !== naturalCard.id);
        player.hand = [...player.hand, jokerCard];
        game.pendingJokers = (game.pendingJokers || 0) + 1;
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
      };

      const assignment = payload?.assignment;
      if (assignment) {
        if (!options.some((o) => JSON.stringify(o) === JSON.stringify(assignment))) return fail(socket, "Asignación inválida");
        finalize(assignment);
        emitState(io, room);
        return;
      }
      if (options.length === 1) {
        finalize(options[0]);
        emitState(io, room);
        return;
      }
      game.pendingChoice = { type: "substitute", cards: newCards, options, context: { type: "substitute", meldRef, naturalCard, jokerCard, selectedCards: [naturalCard] }, playerIndex: idx };
      socket.emit("prompt:joker", { cards: newCards, options, context: { type: "substitute", meldRef } });
    });

    socket.on("action:moveJoker", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");
      if (game.config.jokerMode !== "mobile") return fail(socket, "Movimiento no disponible en modo fijo");

      const meldRef = payload?.meldRef;
      if (!meldRef) return fail(socket, "Selecciona una combinación");
      if (meldRef.playerIndex !== idx) return fail(socket, "Solo puedes mover comodines en tu turno");
      const owner = game.players[meldRef.playerIndex];
      const meld = owner?.combinations?.[meldRef.meldIndex];
      if (!meld) return fail(socket, "Combinación no encontrada");

      const player = game.players[idx];
      const cardId = payload?.cardId;
      const natural = (player.hand || []).find((c) => c.id === cardId);
      if (!natural) return fail(socket, "Carta no está en tu mano");

      const jokerIndex = meld.cards.findIndex((c) => c.rank === "JOKER" && (meld.jokerAssignments || {})[c.id] === natural.rank);
      if (jokerIndex === -1) return fail(socket, "No hay un comodín representando esa carta");

      const jokerCard = meld.cards[jokerIndex];
      const occupied = new Set();
      meld.cards.forEach((c, i) => {
        if (i === jokerIndex) return;
        if (c.rank === "JOKER") occupied.add((meld.jokerAssignments || {})[c.id]);
        else occupied.add(c.rank);
      });

      let leftRank = null;
      let rightRank = null;
      if (natural.rank === "A") {
        const highPossible = !occupied.has("2");
        const lowPossible = !occupied.has("K");
        if (highPossible) leftRank = "K";
        if (lowPossible) rightRank = "2";
      } else {
        const assignedIdx = RANKS.indexOf(natural.rank);
        const leftIdx = assignedIdx - 1;
        const rightIdx = assignedIdx + 1;
        leftRank = leftIdx >= 0 ? RANKS[leftIdx] : null;
        rightRank = rightIdx < RANKS.length ? RANKS[rightIdx] : null;
      }
      const leftAvailable = !!leftRank && !occupied.has(leftRank);
      const rightAvailable = !!rightRank && !occupied.has(rightRank);

      if (!leftAvailable && !rightAvailable) return fail(socket, "No hay hueco adyacente para mover el comodín");

      const doMove = (chosenRank) => {
        const meldObj = owner.combinations[meldRef.meldIndex];
        const ji = meldObj.cards.findIndex((c) => c.id === jokerCard.id);
        const newCards = meldObj.cards.map((c, i) => (i === ji ? natural : c));
        newCards.push(jokerCard);
        const newAssignment = { ...(meldObj.jokerAssignments || {}) };
        newAssignment[jokerCard.id] = chosenRank;
        if (!isValidCombination(newCards, newAssignment)) return fail(socket, "El movimiento del comodín no es válido");
        const updatedMeld = makeMeld(newCards, newAssignment);
        owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
        player.hand = player.hand.filter((c) => c.id !== natural.id);
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
        }
        return true;
      };

      if (leftAvailable && !rightAvailable) {
        if (doMove(leftRank)) emitState(io, room);
        return;
      }
      if (!leftAvailable && rightAvailable) {
        if (doMove(rightRank)) emitState(io, room);
        return;
      }
      game.pendingMoveChoice = { meldRef, naturalCard: natural, jokerCard, leftRank, rightRank, playerIndex: idx };
      socket.emit("prompt:moveJoker", { leftRank, rightRank });
    });

    socket.on("action:moveJokerChoice", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      const choice = game.pendingMoveChoice;
      if (!choice || choice.playerIndex !== idx) return fail(socket, "No hay elección pendiente");

      const direction = payload?.direction;
      const chosenRank = direction === "left" ? choice.leftRank : choice.rightRank;
      if (!chosenRank) return fail(socket, "Dirección inválida");

      const meldRef = choice.meldRef;
      const owner = game.players[meldRef.playerIndex];
      const meldObj = owner.combinations[meldRef.meldIndex];
      const jokerCard = choice.jokerCard;
      const natural = choice.naturalCard;
      const ji = meldObj.cards.findIndex((c) => c.id === jokerCard.id);
      const newCards = meldObj.cards.map((c, i) => (i === ji ? natural : c));
      newCards.push(jokerCard);
      const newAssignment = { ...(meldObj.jokerAssignments || {}) };
      newAssignment[jokerCard.id] = chosenRank;
      if (!isValidCombination(newCards, newAssignment)) {
        game.pendingMoveChoice = null;
        return fail(socket, "El movimiento del comodín no es válido");
      }
      const updatedMeld = makeMeld(newCards, newAssignment);
      owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
      const player = game.players[idx];
      player.hand = player.hand.filter((c) => c.id !== natural.id);
      if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
        game.drawnFromDiscard = false;
        game.drawnCardId = null;
      }
      if (player.hand.length === 0) {
        resolveEmptyHand(game, room, idx);
      }
      game.pendingMoveChoice = null;
      emitState(io, room);
    });

    socket.on("action:sopar", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");

      const player = game.players[idx];
      const cardIds = Array.isArray(payload?.cardIds) ? payload.cardIds : [];
      const cards = cardIds.map((id) => (player.hand || []).find((c) => c.id === id)).filter(Boolean);
      if (cards.length !== cardIds.length || cards.length === 0) return fail(socket, "Cartas inválidas");
      if (!cards.every((c) => isSoparable(c, game.players))) return fail(socket, "Solo se pueden sopar cartas idénticas a una pierna en mesa");

      const ids = new Set(cards.map((c) => c.id));
      game.discardPile = [...(game.discardPile || []), ...cards];
      player.hand = player.hand.filter((c) => !ids.has(c.id));
      if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
        game.drawnFromDiscard = false;
        game.drawnCardId = null;
      }

      if (player.hand.length === 0) {
        const prevPlayers = game.players;
        const result = computeEndRound(game.players, idx, game.config.gameMode);
        const deltas = result.players.map((p, i) => p.points - (prevPlayers[i]?.points || 0));
        game.players = result.players;
        if (result.gameOver) {
          game.gameOver = true;
          const msg = result.winnerName ? `¡${result.winnerName} ha ganado la partida!` : "Juego terminado";
          io.to(room.code).emit("info", { message: msg });
          io.to(room.code).emit("game:over", { winnerName: result.winnerName });
        } else {
          game.roundResult = {
            winnerIndex: idx,
            winnerName: result.winnerName || game.players[idx]?.name || `Jugador ${idx + 1}`,
            players: result.players,
            deltas,
          };
          if (game.roundTimer) clearTimeout(game.roundTimer);
          game.roundTimer = setTimeout(() => {
            if (!room.game || room.game !== game || !game.roundResult) return;
            const round = sharedStartNewRound(idx, game.players);
            game.players = round.players;
            game.deck = round.deck;
            game.discardPile = round.discardPile;
            game.currentTurn = round.currentTurn;
            game.cardDrawn = false;
            game.pendingJokers = 0;
            game.drawnFromDiscard = false;
            game.drawnCardId = null;
            game.roundResult = null;
            game.roundTimer = null;
            emitState(io, room);
          }, 6000);
      }
      }
      emitState(io, room);
    });

    socket.on("action:chooseJoker", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      const choice = game.pendingChoice;
      if (!choice || choice.playerIndex !== idx) return fail(socket, "No hay elección pendiente");

      const assignment = payload?.assignment;
      if (!choice.options.some((o) => JSON.stringify(o) === JSON.stringify(assignment))) {
        return fail(socket, "Asignación inválida");
      }

      if (choice.type === "drop") {
        const player = game.players[idx];
        const ids = new Set(choice.cards.map((c) => c.id));
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        player.combinations = [...player.combinations, makeMeld(choice.cards, assignment)];
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
        }
      } else if (choice.type === "layoff") {
        const ctx = choice.context || {};
        const meldRef = ctx.meldRef;
        const owner = game.players[meldRef.playerIndex];
        const newCards = choice.cards;
        const updatedMeld = makeMeld(newCards, assignment);
        owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
        const selected = ctx.selectedCards || [];
        const ids = new Set(selected.map((c) => c.id));
        const player = game.players[idx];
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
        if (player.hand.length === 0) {
          resolveEmptyHand(game, room, idx);
        }
      } else if (choice.type === "substitute") {
        const ctx = choice.context || {};
        const meldRef = ctx.meldRef;
        const owner = game.players[meldRef.playerIndex];
        const newCards = choice.cards;
        const updatedMeld = makeMeld(newCards, assignment);
        owner.combinations = owner.combinations.map((m, mi) => (mi === meldRef.meldIndex ? updatedMeld : m));
        const naturalCard = ctx.naturalCard;
        const jokerCard = ctx.jokerCard;
        const player = game.players[idx];
        player.hand = player.hand.filter((c) => c.id !== naturalCard.id);
        player.hand = [...player.hand, jokerCard];
        game.pendingJokers = (game.pendingJokers || 0) + 1;
        if (game.drawnFromDiscard && !(player.hand || []).some((c) => c.id === game.drawnCardId)) {
          game.drawnFromDiscard = false;
          game.drawnCardId = null;
        }
      }

      game.pendingChoice = null;
      emitState(io, room);
    });

    socket.on("action:sort", (payload) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");

      const mode = payload?.mode;
      const player = game.players[idx];
      const hand = [...(player.hand || [])];
      if (mode === "suit") {
        hand.sort((a, b) => {
          if ((a.suit || "") !== (b.suit || "")) return String(a.suit || "").localeCompare(String(b.suit || ""));
          return (RANK_ORDER_MAP[a.rank] || 99) - (RANK_ORDER_MAP[b.rank] || 99);
        });
      } else if (mode === "rank") {
        hand.sort((a, b) => {
          const r = (RANK_ORDER_MAP[a.rank] || 99) - (RANK_ORDER_MAP[b.rank] || 99);
          if (r !== 0) return r;
          return String(a.suit || "").localeCompare(String(b.suit || ""));
        });
      } else if (mode === "random") {
        for (let i = hand.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hand[i], hand[j]] = [hand[j], hand[i]];
        }
      }
      player.hand = hand;
      emitState(io, room);
    });

    socket.on("game:rematch", (_payload, cb) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      if (room.host !== socket.id) return fail(socket, "Solo el anfitrión puede iniciar revancha");
      if (!room.game.gameOver) return fail(socket, "La partida no ha terminado");

      const connected = room.players.filter((p) => p.connected);
      if (connected.length < 2) return fail(socket, "Se necesitan al menos 2 jugadores");

      room.players = connected;
      if (!room.players.some((p) => p.socketId === room.host)) room.host = room.players[0].socketId;
      room.config.playerCount = room.players.length;
      room.started = true;
      room.game = createGame(room);

      io.to(room.code).emit("game:started", { code: room.code });
      emitState(io, room);
      emitRoomUpdate(io, room);
      if (typeof cb === "function") cb({ ok: true });
    });

    socket.on("action:undoDraw", (_payload, cb) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      const idx = playerIndex(game, socket.id);
      if (idx < 0) return fail(socket, "Jugador no encontrado");
      if (idx !== game.currentTurn) return fail(socket, "No es tu turno");
      if (!game.cardDrawn || !game.drawnFromDiscard) return fail(socket, "No hay robo que deshacer");

      const player = game.players[idx];
      const card = player.hand.find((c) => c.id === game.drawnCardId);
      if (!card) return fail(socket, "La carta ya no está en tu mano");

      player.hand = player.hand.filter((c) => c.id !== game.drawnCardId);
      game.discardPile = [...(game.discardPile || []), card];
      game.cardDrawn = false;
      game.drawnFromDiscard = false;
      game.drawnCardId = null;
      emitState(io, room);
      if (typeof cb === "function") cb({ ok: true });
    });

    socket.on("game:continueRound", (_payload, cb) => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.game) return fail(socket, "No hay partida activa");
      const game = room.game;
      if (!game.roundResult) return fail(socket, "No hay ronda pendiente");
      const idx = game.roundResult.winnerIndex;
      if (game.roundTimer) { clearTimeout(game.roundTimer); game.roundTimer = null; }
      const round = sharedStartNewRound(idx, game.players);
      game.players = round.players;
      game.deck = round.deck;
      game.discardPile = round.discardPile;
      game.currentTurn = round.currentTurn;
      game.cardDrawn = false;
      game.pendingJokers = 0;
      game.drawnFromDiscard = false;
      game.drawnCardId = null;
      game.roundResult = null;
      emitState(io, room);
      if (typeof cb === "function") cb({ ok: true });
    });

    socket.on("disconnect", () => {
      const res = leaveRoom(socket.id);
      if (!res || res.deleted) return;
      if (res.room) emitRoomUpdate(io, res.room);
    });
  });
}