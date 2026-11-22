import { useState } from "react";
import { useOnlineGame } from "../hooks/useOnlineGame";
import Lobby from "./Lobby";
import OnlineGameTable from "./OnlineGameTable";
import ConfirmModal from "./ConfirmModal";

const OnlineApp = ({ onBack }) => {
  const game = useOnlineGame();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleBack = () => setConfirmOpen(true);
  const handleConfirm = () => {
    setConfirmOpen(false);
    if (game.room || game.publicState) game.leaveRoom();
    onBack?.();
  };

  if (!game.publicState || !(game.publicState.started || game.room?.started)) {
    return (
      <div>
        <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={handleBack} aria-label="Menú">←</button>
        <Lobby game={game} />
        <ConfirmModal
          open={confirmOpen}
          title="Cancelar partida"
          message="¿Seguro que quieres cancelar la partida? Se perderá todo el progreso."
          confirmLabel="Salir"
          cancelLabel="Seguir jugando"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }
  return (
    <div>
      <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={handleBack}>← Menú</button>
      <OnlineGameTable game={game} />
      <ConfirmModal
        open={confirmOpen}
        title="Cancelar partida"
        message="¿Seguro que quieres cancelar la partida? Se perderá todo el progreso."
        confirmLabel="Salir"
        cancelLabel="Seguir jugando"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default OnlineApp;