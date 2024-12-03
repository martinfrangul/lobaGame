import { GameProvider } from "./context/gameState";
import GameTable from "./components/GameTable";

const App = () => {
  return (
    <GameProvider>
      <GameTable />
    </GameProvider>
  );
};

export default App;
