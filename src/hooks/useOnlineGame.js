import { useCallback, useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../lib/socket";

export function useOnlineGame() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [publicState, setPublicState] = useState(null);
  const [privateHand, setPrivateHand] = useState([]);
  const [promptJoker, setPromptJoker] = useState(null);
  const [promptMove, setPromptMove] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const s = connectSocket();
    socketRef.current = s;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoomUpdate = (r) => setRoom(r);
    const onStatePublic = (st) => setPublicState(st);
    const onStatePrivate = (st) => setPrivateHand(st.hand || []);
    const onGameStarted = () => { setWinner(null); };
    const onGameOver = (e) => setWinner(e?.winnerName || null);
    const onError = (e) => setError(typeof e === "string" ? e : e?.message || "Error");
    const onInfo = (e) => setInfo(e?.message || String(e));
    const onPromptJoker = (p) => setPromptJoker(p);
    const onPromptMove = (p) => setPromptMove(p);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("room:update", onRoomUpdate);
    s.on("state:public", onStatePublic);
    s.on("state:private", onStatePrivate);
    s.on("game:started", onGameStarted);
    s.on("game:over", onGameOver);
    s.on("error", onError);
    s.on("info", onInfo);
    s.on("prompt:joker", onPromptJoker);
    s.on("prompt:moveJoker", onPromptMove);

    const code = localStorage.getItem("loba_room_code");
    const token = localStorage.getItem("loba_player_token");
    if (code && token) {
      s.emit("room:reconnect", { code, token }, (res) => {
        if (!res?.ok) {
          localStorage.removeItem("loba_room_code");
          localStorage.removeItem("loba_player_token");
          setError(res?.error || "Reconexión fallida");
        } else {
          localStorage.setItem("loba_room_code", res.code);
          if (res.token) localStorage.setItem("loba_player_token", res.token);
        }
      });
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("room:update", onRoomUpdate);
      s.off("state:public", onStatePublic);
      s.off("state:private", onStatePrivate);
      s.off("game:started", onGameStarted);
      s.off("game:over", onGameOver);
      s.off("error", onError);
      s.off("info", onInfo);
      s.off("prompt:joker", onPromptJoker);
      s.off("prompt:moveJoker", onPromptMove);
    };
  }, []);

  const emit = useCallback((event, payload, cb) => {
    const s = socketRef.current || getSocket();
    s.emit(event, payload, cb);
  }, []);

  const saveSession = (code, token) => {
    if (code && token) {
      localStorage.setItem("loba_room_code", code);
      localStorage.setItem("loba_player_token", token);
    }
  };
  const clearSession = () => {
    localStorage.removeItem("loba_room_code");
    localStorage.removeItem("loba_player_token");
  };

  const createRoom = useCallback((name, config) => {
    emit("room:create", { name, config }, (res) => {
      if (!res?.ok) setError(res?.error || "No se pudo crear la sala");
      else saveSession(res.code, res.token);
    });
  }, [emit]);

  const joinRoom = useCallback((code, name) => {
    emit("room:join", { code, name }, (res) => {
      if (!res?.ok) setError(res?.error || "No se pudo unir a la sala");
      else saveSession(res.code, res.token);
    });
  }, [emit]);

  const leaveRoom = useCallback(() => {
    emit("room:leave", {});
    clearSession();
    setRoom(null);
    setPublicState(null);
    setPrivateHand([]);
  }, [emit]);

  const setReady = useCallback((ready) => {
    emit("room:ready", { ready });
  }, [emit]);

  const startGame = useCallback(() => {
    emit("game:start", {}, (res) => {
      if (!res?.ok) setError(res?.error || "No se pudo iniciar");
    });
  }, [emit]);

  const rematch = useCallback(() => {
    emit("game:rematch", {}, (res) => {
      if (!res?.ok) setError(res?.error || "No se pudo reiniciar");
    });
  }, [emit]);

  const myIndex = publicState?.players
    ? publicState.players.findIndex((p) => p.name === (room?.players?.find((rp) => rp.socketId === getSocket().id)?.name))
    : -1;

  // actions
  const draw = useCallback((source) => emit("action:draw", { source }), [emit]);
  const undoDraw = useCallback(() => emit("action:undoDraw", {}, (res) => {
    if (!res?.ok) setError(res?.error || "No se pudo deshacer");
  }), [emit]);
  const discard = useCallback((cardId) => emit("action:discard", { cardId }), [emit]);
  const drop = useCallback((cardIds, assignment) => emit("action:drop", { cardIds, assignment }), [emit]);
  const layoff = useCallback((cardIds, meldRef, assignment) => emit("action:layoff", { cardIds, meldRef, assignment }), [emit]);
  const sopar = useCallback((cardIds) => emit("action:sopar", { cardIds }), [emit]);
  const substitute = useCallback((cardId, meldRef, assignment) => emit("action:substitute", { cardId, meldRef, assignment }), [emit]);
  const moveJoker = useCallback((cardId, meldRef) => emit("action:moveJoker", { cardId, meldRef }), [emit]);
  const chooseJoker = useCallback((assignment) => {
    emit("action:chooseJoker", { assignment });
    setPromptJoker(null);
  }, [emit]);
  const chooseMove = useCallback((direction) => {
    emit("action:moveJokerChoice", { direction });
    setPromptMove(null);
  }, [emit]);
  const sort = useCallback((mode) => emit("action:sort", { mode }), [emit]);

  const cancelPrompt = useCallback(() => {
    setPromptJoker(null);
    setPromptMove(null);
  }, []);

  return {
    connected,
    socketId: getSocket().id,
    room,
    publicState,
    privateHand,
    promptJoker,
    promptMove,
    error,
    info,
    winner,
    clearError: () => setError(null),
    clearInfo: () => setInfo(null),
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    myIndex,
    draw,
    undoDraw,
    discard,
    drop,
    layoff,
    sopar,
    substitute,
    moveJoker,
    chooseJoker,
    chooseMove,
    sort,
    rematch,
    cancelPrompt,
  };
}