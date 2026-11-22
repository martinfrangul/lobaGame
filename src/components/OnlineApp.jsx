import { useOnlineGame } from "../hooks/useOnlineGame";
import Lobby from "./Lobby";
import OnlineGameTable from "./OnlineGameTable";

const OnlineApp = ({ onBack }) => {
  const game = useOnlineGame();
  const handleBack = () => {
    if (game.room || game.publicState) {
      if (!window.confirm("¿Seguro que quieres cancelar la partida? Se perderá todo el progreso.")) return;
      game.leaveRoom();
    }
    onBack?.();
  };
  if (!game.publicState || !(game.publicState.started || game.room?.started)) {
    return (
      <div>
        <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={handleBack}>← Menú</button>
        <Lobby game={game} />
      </div>
    );
  }
  return (
    <div>
      <button className="icon-btn" style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }} onClick={handleBack}>← Menú</button>
      <OnlineGameTable game={game} />
    </div>
  );
};

export default OnlineApp;