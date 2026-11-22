import { isValidCombination } from "./validation.js";

export const findBotCombination = (hand) => {
  const tryCombo = (indices) => {
    const cards = indices.map((i) => hand[i]);
    return isValidCombination(cards) ? cards : null;
  };

  // 3 cartas
  for (let a = 0; a < hand.length; a++) {
    for (let b = a + 1; b < hand.length; b++) {
      for (let c = b + 1; c < hand.length; c++) {
        const combo = tryCombo([a, b, c]);
        if (combo) return combo;
      }
    }
  }
  // 4 cartas
  for (let a = 0; a < hand.length; a++) {
    for (let b = a + 1; b < hand.length; b++) {
      for (let c = b + 1; c < hand.length; c++) {
        for (let d = c + 1; d < hand.length; d++) {
          const combo = tryCombo([a, b, c, d]);
          if (combo) return combo;
        }
      }
    }
  }
  return null;
};