import { suitOrder, RANK_ORDER_MAP } from "./cards.js";
import { straightValid } from "./validation.js";

export const orderCards = (cards, assignment = {}) => {
  const rankOrder = {
    A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
    J: 11, Q: 12, K: 13,
  };

  // Pierna (mismo rango, sin comodines): orden por color alternado
  const isGroup =
    cards.length >= 3 &&
    cards.every((c) => c.rank === cards[0].rank) &&
    !cards.some((c) => c.rank === "JOKER");

  if (isGroup) {
    const reds = cards
      .filter((c) => c.suit === "hearts" || c.suit === "diamonds")
      .sort((a, b) => (suitOrder[a.suit] || 99) - (suitOrder[b.suit] || 99));
    const blacks = cards
      .filter((c) => c.suit === "clubs" || c.suit === "spades")
      .sort((a, b) => (suitOrder[a.suit] || 99) - (suitOrder[b.suit] || 99));

    const [first, second] = reds.length >= blacks.length ? [reds, blacks] : [blacks, reds];
    const result = [];
    const max = Math.max(first.length, second.length);
    for (let i = 0; i < max; i++) {
      if (i < first.length) result.push(first[i]);
      if (i < second.length) result.push(second[i]);
    }
    return result;
  }

  // Determinar si el As actúa como carta alta (Q-K-A) en esta escalera.
  const lowValid = straightValid(cards, assignment, false);
  const highValid = straightValid(cards, assignment, true);
  const aceHigh = highValid && !lowValid;

  const rankOf = (card) => {
    if (card.rank === "JOKER") {
      const assigned = assignment[card.id];
      if (assigned) {
        if (assigned === "A") return aceHigh ? 14 : 1;
        return rankOrder[assigned] ?? RANK_ORDER_MAP[assigned] ?? 99;
      }
      return 99; // sin asignación fija, va al final
    }
    if (card.rank === "A") return aceHigh ? 14 : 1;
    return rankOrder[card.rank] ?? RANK_ORDER_MAP[card.rank] ?? 99;
  };

  return [...cards].sort((a, b) => rankOf(a) - rankOf(b));
};

export const makeMeld = (cards, assignment = {}) => ({
  id: `${Date.now()}-${Math.random()}`,
  cards: orderCards(cards, assignment),
  jokerAssignments: assignment || {},
});
