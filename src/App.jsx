import { useState } from "react";
import { GameProvider } from "./context/gameState";
import GameTable from "./components/GameTable";
import OnlineApp from "./components/OnlineApp";

const App = () => {
  const [mode, setMode] = useState(null);

  if (mode === "local") {
    return (
      <GameProvider>
        <div>
          <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={() => setMode(null)}>← Menú</button>
          <GameTable />
        </div>
      </GameProvider>
    );
  }

  if (mode === "online") {
    return (
      <div>
        <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={() => setMode(null)}>← Menú</button>
        <OnlineApp />
      </div>
    );
  }

  return (
    <div className="game-table setup-screen welcome-screen">
      <div className="setup-card welcome-card">
        <div className="welcome-badge">🃏</div>
        <h1>Loba</h1>
        <p className="setup-subtitle">Juego de cartas para 2-4 jugadores</p>
        <div className="welcome-actions">
          <button className="start-button" onClick={() => setMode("local")}>
            <span>🎮</span> Jugar local (hotseat)
          </button>
          <button className="start-button" onClick={() => setMode("online")}>
            <span>🌐</span> Jugar online
          </button>
        </div>
        <div className="welcome-rules">
          <h3>Reglas rápidas</h3>
          <ul>
            <li>Forma piernas (mismo rango) o escaleras (mismo palo).</li>
            <li>Roba, baja combinaciones, pega y descarta.</li>
            <li>El primero en quedarse sin cartas gana la ronda.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;