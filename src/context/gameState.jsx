import { createContext, useContext, useState } from "react";
import { generateDeck } from "../utils/deck";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [deck, setDeck] = useState(generateDeck());
  const [discardPile, setDiscardPile] = useState([]);
  const [players, setPlayers] = useState([
    { name: "Player 1", hand: [], points: 0 },
    { name: "Player 2", hand: [], points: 0 },
    { name: "Player 3", hand: [], points: 0 },
    { name: "Player 4", hand: [], points: 0 },
  ]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [combinationBoard, setCombinationBoard] = useState([]);

  return (
    <GameContext.Provider
      value={{
        deck,
        setDeck,
        discardPile,
        setDiscardPile,
        players,
        setPlayers,
        currentTurn,
        setCurrentTurn,
        combinationBoard,
        setCombinationBoard,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => useContext(GameContext);
