import { useState } from "react";
import { GameProvider } from "./context/gameState";
import GameTable from "./components/GameTable";
import OnlineApp from "./components/OnlineApp";
import ConfirmModal from "./components/ConfirmModal";

const App = () => {
  const [mode, setMode] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const goMenu = () => setMode(null);

  if (mode === "local") {
    return (
      <GameProvider>
        <div>
          <button
            className="icon-btn"
            style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }}
            onClick={() => setConfirmOpen(true)}
          >
            ← Menú
          </button>
          <GameTable />
          <ConfirmModal
            open={confirmOpen}
            title="Cancelar partida"
            message="¿Seguro que quieres cancelar la partida? Se perderá todo el progreso."
            confirmLabel="Salir"
            cancelLabel="Seguir jugando"
            onConfirm={() => { setConfirmOpen(false); goMenu(); }}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      </GameProvider>
    );
  }

  if (mode === "online") {
    return <OnlineApp onBack={goMenu} />;
  }

  return (
    <div className="game-table setup-screen">
      <div className="setup-card">
        <h1>Loba</h1>
        <p className="setup-subtitle">Elige modo de juego</p>
        <div className="setup-section">
          <button className="start-button" onClick={() => setMode("local")}>Jugar local (hotseat)</button>
        </div>
        <div className="setup-section">
          <button className="start-button" onClick={() => setMode("online")}>Jugar online</button>
        </div>
      </div>
    </div>
  );
};

export default App;