import { generateDeck } from "./deck.js";
import { sumHandValue, sumCombinationValue } from "./scoring.js";

export const startGame = (config, deckInput) => {
  const playerCount = (config && config.playerCount) || 2;
  const tempDeck = [...(deckInput || generateDeck())];
  const newPlayers = Array.from({ length: playerCount }, (_, index) => ({
    name: `Jugador ${index + 1}`,
    hand: tempDeck.splice(0, 9),
    points: 0,
    combinations: [],
    eliminated: false,
    reenganches: 0,
  }));
  const firstDiscard = tempDeck.length > 0 ? tempDeck.splice(0, 1)[0] : null;

  return {
    players: newPlayers,
    deck: tempDeck,
    discardPile: firstDiscard ? [firstDiscard] : [],
    currentTurn: 0,
  };
};

export const startNewRound = (winnerIndex, currentPlayers) => {
  const tempDeck = generateDeck();
  const newPlayers = (currentPlayers || []).map((player) => {
    if (player.eliminated) {
      return { ...player, hand: [], combinations: [] };
    }
    return {
      ...player,
      hand: tempDeck.splice(0, 9),
      combinations: [],
    };
  });

  const firstDiscard = tempDeck.length > 0 ? tempDeck.splice(0, 1)[0] : null;

  return {
    players: newPlayers,
    deck: tempDeck,
    discardPile: firstDiscard ? [firstDiscard] : [],
    currentTurn: winnerIndex >= 0 ? winnerIndex : 0,
  };
};

export const computeEndRound = (players, winnerIndex, gameMode) => {
  if (gameMode === "mas") {
    const updated = (players || []).map((player, index) => {
      if (player.eliminated) return player;
      let roundPoints = sumCombinationValue(player.combinations);
      if (index === winnerIndex) {
        roundPoints += (player.combinations || []).length * 5;
      }
      return { ...player, points: player.points + roundPoints };
    });

    const reached = updated.find((p) => p.points >= 150);
    return {
      players: updated,
      gameOver: !!reached,
      winnerName: reached ? reached.name : null,
      gameMode: "mas",
    };
  }

  // menos
  const updated = (players || []).map((player, index) => {
    if (player.eliminated) return player;
    if (index === winnerIndex) return { ...player, points: player.points };
    return { ...player, points: player.points + sumHandValue(player.hand) };
  });

  const afterElimination = updated.map((player) => {
    if (player.eliminated) return player;
    if (player.points >= 101) {
      return { ...player, eliminated: true };
    }
    return player;
  });

  const active = afterElimination.filter((p) => !p.eliminated);

  let gameOver = false;
  let winnerName = null;
  if (active.length <= 1) {
    gameOver = true;
    if (active.length === 1) {
      winnerName = active[0].name;
    } else {
      const sorted = [...afterElimination].sort((a, b) => a.points - b.points);
      winnerName = sorted.length ? sorted[0].name : null;
    }
  }

  return {
    players: afterElimination,
    gameOver,
    winnerName,
    gameMode: "menos",
  };
};