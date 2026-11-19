const RANK_ORDER = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K",
];

export const isValidCombination = (cards) => {
  if (!Array.isArray(cards) || cards.length < 3) {
    return false; // Las combinaciones deben tener al menos 3 cartas
  }

  const jokers = cards.filter((card) => card.rank === "JOKER");
  const naturals = cards.filter((card) => card.rank !== "JOKER");

  // Pierna (grupo): mismo rango, palos distintos, SOLO cartas naturales
  const isGroup = (() => {
    if (jokers.length > 0) return false;
    if (naturals.length < 3) return false;

    const allSameRank = naturals.every(
      (card) => card.rank === naturals[0].rank
    );
    const uniqueSuits = new Set(naturals.map((card) => card.suit));
    const noRepeatedSuits = uniqueSuits.size === naturals.length;

    return allSameRank && noRepeatedSuits;
  })();

  if (isGroup) return true;

  // Escalera: consecutivas del mismo palo; los comodines solo aquí
  const isStraight = (() => {
    if (naturals.length === 0) return false; // hace falta al menos una carta natural (define el palo)
    if (naturals.length < 3 && jokers.length === 0) return false;

    const allSameSuit = naturals.every(
      (card) => card.suit === naturals[0].suit
    );
    if (!allSameSuit) return false;

    const sorted = naturals
      .slice()
      .sort(
        (a, b) =>
          RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank)
      );

    // Detectar duplicados o desorden
    for (let i = 1; i < sorted.length; i++) {
      if (RANK_ORDER.indexOf(sorted[i].rank) <= RANK_ORDER.indexOf(sorted[i - 1].rank)) {
        return false;
      }
    }

    let jokerCount = jokers.length;

    // Rellenar huecos internos con comodines
    for (let i = 1; i < sorted.length; i++) {
      const prevIndex = RANK_ORDER.indexOf(sorted[i - 1].rank);
      const currIndex = RANK_ORDER.indexOf(sorted[i].rank);
      const gap = currIndex - prevIndex - 1;
      if (gap < 0) return false;
      if (gap > 0) {
        if (jokerCount < gap) return false;
        jokerCount -= gap;
      }
    }

    // Los comodines restantes pueden ir a los extremos (siempre válido)
    return true;
  })();

  if (isStraight) return true;

  return false;
};