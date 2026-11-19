const RANK_ORDER = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K",
];

const rankIndex = (rank) => RANK_ORDER.indexOf(rank);

// Valida una combinación.
// assignment: objeto opcional { [jokerCardId]: rank } para fijar qué carta representa cada comodín.
export const isValidCombination = (cards, assignment = {}) => {
  if (!Array.isArray(cards) || cards.length < 3) {
    return false;
  }

  const jokers = cards.filter((card) => card.rank === "JOKER");
  const naturals = cards.filter((card) => card.rank !== "JOKER");

  // Pierna (grupo): solo cartas naturales, mismo rango, palos distintos.
  // Los comodines nunca pueden usarse en piernas.
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

  // Escalera: consecutivas del mismo palo. Los comodines solo aquí.
  const isStraight = (() => {
    if (naturals.length === 0 && jokers.length === 0) return false;

    // Si hay comodines fijados por assignment, los convertimos en cartas naturales.
    const fixedJokers = jokers
      .filter((j) => assignment && assignment[j.id])
      .map((j) => {
        // El palo lo define la primera carta natural (todas comparten palo)
        const suit = naturals.length > 0 ? naturals[0].suit : null;
        return { rank: assignment[j.id], suit };
      });

    const effectiveNaturals = [...naturals, ...fixedJokers];

    // Si quedan comodines sin fijar, validamos de forma flexible (existencia).
    const remainingJokers = jokers.filter((j) => !(assignment && assignment[j.id]));

    if (effectiveNaturals.length === 0) return false;

    const allSameSuit = effectiveNaturals.every(
      (card) => card.suit === effectiveNaturals[0].suit
    );
    if (!allSameSuit) return false;

    const sorted = effectiveNaturals
      .slice()
      .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));

    // Detectar duplicados
    for (let i = 1; i < sorted.length; i++) {
      if (rankIndex(sorted[i].rank) <= rankIndex(sorted[i - 1].rank)) {
        return false;
      }
    }

    // Si no quedan comodines flexibles, basta con que sea consecutivo.
    if (remainingJokers.length === 0) {
      for (let i = 1; i < sorted.length; i++) {
        if (rankIndex(sorted[i].rank) !== rankIndex(sorted[i - 1].rank) + 1) {
          return false;
        }
      }
      return sorted.length >= 3;
    }

    // Validación flexible con comodines restantes.
    let jokerCount = remainingJokers.length;
    for (let i = 1; i < sorted.length; i++) {
      const gap = rankIndex(sorted[i].rank) - rankIndex(sorted[i - 1].rank) - 1;
      if (gap < 0) return false;
      if (gap > 0) {
        if (jokerCount < gap) return false;
        jokerCount -= gap;
      }
    }

    // Los comodines restantes pueden ir a los extremos.
    return true;
  })();

  if (isStraight) return true;

  return false;
};

// Enumera las posibles asignaciones de los comodines de una combinación
// que la vuelven válida. Devuelve un array de objetos { [jokerId]: rank }.
export const possibleJokerAssignments = (cards) => {
  const jokers = cards.filter((c) => c.rank === "JOKER");
  if (jokers.length === 0) return [{}];

  const results = [];
  const ranks = [...RANK_ORDER];

  const tryAssign = (index, current) => {
    if (index === jokers.length) {
      if (isValidCombination(cards, current)) {
        results.push({ ...current });
      }
      return;
    }
    for (const rank of ranks) {
      current[jokers[index].id] = rank;
      tryAssign(index + 1, current);
    }
    delete current[jokers[index].id];
  };

  tryAssign(0, {});
  // Eliminar duplicados por valores (orden de jokers no importa para el resultado)
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    const key = jokers.map((j) => r[j.id]).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
};

export const RANKS = RANK_ORDER;