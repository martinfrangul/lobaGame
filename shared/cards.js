export const RANK_ORDER = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K",
];

export const RANKS = RANK_ORDER;

export const RANK_ORDER_MAP = {
  A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13, JOKER: 99,
};

export const cardValue = (card) => {
  if (card.rank === "JOKER") return 25;
  if (card.rank === "A") return 15;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank) || 0;
};

export const rankIndex = (rank) => RANK_ORDER.indexOf(rank);

export const suitOrder = { clubs: 1, diamonds: 2, hearts: 3, spades: 4 };