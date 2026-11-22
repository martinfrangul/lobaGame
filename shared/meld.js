import { suitOrder } from "./cards.js";

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

  const rankOf = (card) => {
    if (card.rank === "JOKER") {
      const assigned = assignment[card.id];
      if (assigned && rankOrder[assigned]) {
        return rankOrder[assigned];
      }
      return 99; // sin asignación fija, va al final
    }
    return rankOrder[card.rank] ?? 99;
  };

  return [...cards].sort((a, b) => rankOf(a) - rankOf(b));
};

export const makeMeld = (cards, assignment = {}) => ({
  id: `${Date.now()}-${Math.random()}`,
  cards: orderCards(cards, assignment),
  jokerAssignments: assignment || {},
});