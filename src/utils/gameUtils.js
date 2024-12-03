export const isValidCombination = (cards, allowJoker = false) => {
  if (cards.length < 3) {
    return false; // Las combinaciones deben tener al menos 3 cartas
  }

  const rankOrder = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "J", "Q", "K", "A"
  ];

  // Filtrar comodines si están permitidos
  const jokers = cards.filter((card) => card.rank === "JOKER");
  const nonJokerCards = cards.filter((card) => card.rank !== "JOKER");

  // Tricas (grupo de mismo rango, diferentes palos)
  const isGroup = (() => {
    if (nonJokerCards.length < 3 && (!allowJoker || jokers.length === 0)) {
      return false;
    }

    const allSameRank = nonJokerCards.every(
      (card) => card.rank === nonJokerCards[0].rank
    );

    const uniqueSuits = new Set(nonJokerCards.map((card) => card.suit));
    const noRepeatedSuits = uniqueSuits.size === nonJokerCards.length;

    return allSameRank && noRepeatedSuits;
  })();

  if (isGroup) return true;

  // Escaleras (consecutivos y mismo palo)
  const isStraight = (() => {
    if (nonJokerCards.length < 3 && (!allowJoker || jokers.length === 0)) {
      return false;
    }

    const sortedCards = nonJokerCards.slice().sort((a, b) => {
      return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    });

    let jokerCount = jokers.length;

    for (let i = 1; i < sortedCards.length; i++) {
      const currentIndex = rankOrder.indexOf(sortedCards[i].rank);
      const previousIndex = rankOrder.indexOf(sortedCards[i - 1].rank);

      if (sortedCards[i].suit !== sortedCards[i - 1].suit) {
        return false; // No es el mismo palo
      }

      if (currentIndex !== previousIndex + 1) {
        if (jokerCount > 0) {
          jokerCount--; // Usa un comodín para rellenar la brecha
        } else {
          return false; // No es consecutivo y no hay más comodines
        }
      }
    }

    return true;
  })();

  if (isStraight) return true;

  return false; // No es ni trica ni escalera
};
