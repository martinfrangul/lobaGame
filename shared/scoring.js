import { cardValue } from "./cards.js";

export const sumHandValue = (hand) =>
  (hand || []).reduce((sum, c) => sum + cardValue(c), 0);

export const sumCombinationValue = (combinations) =>
  (combinations || []).reduce(
    (sum, meld) => sum + (meld.cards || []).reduce((s, c) => s + cardValue(c), 0),
    0
  );