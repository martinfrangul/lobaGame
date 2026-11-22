import { useState, useEffect, useCallback } from "react";

const Lobby = ({ game }) => {
  const {
    connected,
    room,
    publicState,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    socketId,
    error,
    clearError,
  } = game;

  const [name, setName] = useState("Jugador");
  const [codeInput, setCodeInput] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [gameMode, setGameMode] = useState("menos");
  const [jokerMode, setJokerMode] = useState("fixed");

  const scrollInputIntoView = useCallback((e) => {
    const el = e?.target || e;
    if (!el || typeof el.scrollIntoView !== "function") return;
    // Pequeño delay para que el teclado ya haya animado
    setTimeout(() => {
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        el.scrollIntoView();
      }
    }, 120);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-offset", `${offset}px`);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  if (!connected) {
    return (
      <div className="game-table setup-screen">
        <div className="setup-card">
          <h1>Loba Online</h1>
          <p>Conectando al servidor...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="game-table setup-screen">
        <div className="setup-card">
          <h1>Loba Online</h1>
          {error && <p style={{ color: "red" }}>{error} <button onClick={clearError}>x</button></p>}
          <div className="setup-section">
            <h3>Tu nombre</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} onFocus={scrollInputIntoView} />
          </div>

          <div className="setup-section">
            <h3>Crear sala</h3>
            <div className="setup-section">
              <h3>Jugadores</h3>
              <div className="setup-options">
                {[2, 3, 4].map((c) => (
                  <button key={c} className={`setup-option ${playerCount === c ? "selected" : ""}`} onClick={() => setPlayerCount(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div className="setup-section">
              <h3>Modo de juego</h3>
              <div className="setup-options">
                <button className={`setup-option ${gameMode === "menos" ? "selected" : ""}`} onClick={() => setGameMode("menos")}>Loba de Menos</button>
                <button className={`setup-option ${gameMode === "mas" ? "selected" : ""}`} onClick={() => setGameMode("mas")}>Loba de Más</button>
              </div>
            </div>
            <div className="setup-section">
              <h3>Modo de comodín</h3>
              <div className="setup-options">
                <button className={`setup-option ${jokerMode === "fixed" ? "selected" : ""}`} onClick={() => setJokerMode("fixed")}>Fijo</button>
                <button className={`setup-option ${jokerMode === "mobile" ? "selected" : ""}`} onClick={() => setJokerMode("mobile")}>Móvil</button>
              </div>
            </div>
            <button className="start-button" onClick={() => createRoom(name, { playerCount, gameMode, jokerMode })}>
              Crear sala
            </button>
          </div>

          <div className="setup-section">
            <h3>Unirse a sala</h3>
            <input placeholder="Código" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} onFocus={scrollInputIntoView} />
            <button className="start-button" onClick={() => joinRoom(codeInput, name)}>Unirse</button>
          </div>
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.socketId === socketId);
  const allReady = room.players.length === room.config.playerCount && room.players.every((p) => p.ready);

  if ((publicState && publicState.started) || room?.started) {
    // Handled by parent (OnlineGameTable)
    return null;
  }

  return (
    <div className="game-table setup-screen">
      <div className="setup-card">
        <h1>Sala {room.code}</h1>
        {error && <p style={{ color: "red" }}>{error} <button onClick={clearError}>x</button></p>}
        <p>Config: {room.config.playerCount} jugadores, {room.config.gameMode}, comodín {room.config.jokerMode}</p>
        <h3>Jugadores</h3>
        <ul>
          {room.players.map((p) => (
            <li key={p.socketId}>
              {p.name} {p.socketId === room.host ? "(anfitrión)" : ""} {p.ready ? "✅" : "⏳"} {p.connected ? "" : "(desconectado)"}
            </li>
          ))}
        </ul>
        <label className="setup-checkbox">
          <input type="checkbox" checked={me?.ready || false} onChange={(e) => setReady(e.target.checked)} />
          Listo
        </label>
        {room.host === socketId && (
          <button className="start-button" disabled={!allReady} onClick={startGame}>
            Iniciar partida
          </button>
        )}
        <button className="setup-option" onClick={leaveRoom}>Salir de la sala</button>
      </div>
    </div>
  );
};

export default Lobby;