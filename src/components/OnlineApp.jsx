import { useOnlineGame } from "../hooks/useOnlineGame";
import Lobby from "./Lobby";
import OnlineGameTable from "./OnlineGameTable";

const OnlineApp = () => {
  const game = useOnlineGame();
  if (!game.publicState || !(game.publicState.started || game.room?.started)) {
    return <Lobby game={game} />;
  }
  return <OnlineGameTable game={game} />;
};

export default OnlineApp;