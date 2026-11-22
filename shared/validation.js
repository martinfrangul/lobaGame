import { RANK_ORDER, RANKS, rankIndex } from "./cards.js";

export const isValidCombination = (cards, assignment = {}) => {
  if (!Array.isArray(cards) || cards.length < 3) {
    return false;
  }

  const jokers = cards.filter((card) => card.rank === "JOKER");
  const naturals = cards.filter((card) => card.rank !== "JOKER");

  // Pierna (grupo): solo cartas naturales, mismo rango, palos distintos.
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

    const fixedJokers = jokers
      .filter((j) => assignment && assignment[j.id])
      .map((j) => {
        const suit = naturals.length > 0 ? naturals[0].suit : null;
        return { rank: assignment[j.id], suit, isJoker: true };
      });

    const effectiveNaturals = [
      ...naturals.map((c) => ({ rank: c.rank, suit: c.suit, isJoker: false })),
      ...fixedJokers,
    ];

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

    // Comodines fijos no pueden ser adyacentes entre sí
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].isJoker && sorted[i - 1].isJoker) {
        return false;
      }
    }

    // Si no quedan comodines flexibles, debe ser consecutivo
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
      if (gap > 1) {
        return false;
      }
      if (gap === 1) {
        if (jokerCount < 1) return false;
        jokerCount -= 1;
      }
    }

    const firstIdx = rankIndex(sorted[0].rank);
    const lastIdx = rankIndex(sorted[sorted.length - 1].rank);
    const leftAvailable = firstIdx > 0 ? 1 : 0;
    const rightAvailable = lastIdx < RANK_ORDER.length - 1 ? 1 : 0;

    if (jokerCount > leftAvailable + rightAvailable) return false;

    return true;
  })();

  if (isStraight) return true;

  return false;
};

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

export const possibleAssignmentsForCards = (cards, baseAssignment = {}) => {
  const freeJokers = cards.filter(
    (c) => c.rank === "JOKER" && !Object.prototype.hasOwnProperty.call(baseAssignment, c.id)
  );

  const results = [];
  const tryAssign = (index, current) => {
    if (index === freeJokers.length) {
      const full = { ...baseAssignment, ...current };
      if (isValidCombination(cards, full)) {
        results.push(full);
      }
      return;
    }
    for (const rank of RANKS) {
      current[freeJokers[index].id] = rank;
      tryAssign(index + 1, current);
    }
    delete current[freeJokers[index].id];
  };

  if (freeJokers.length === 0) {
    if (isValidCombination(cards, baseAssignment)) {
      return [baseAssignment];
    }
    return [];
  }

  tryAssign(0, {});

  const unique = [];
  const seen = new Set();
  for (const r of results) {
    const key = freeJokers.map((j) => r[j.id]).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  return unique;
};

export const isSoparable = (card, players) => {
  return (players || []).some((player) =>
    (player.combinations || []).some((meld) => {
      const cards = meld.cards || [];
      const isGroup =
        cards.length >= 3 &&
        cards.every((c) => c.rank === cards[0].rank) &&
        !cards.some((c) => c.rank === "JOKER");
      if (!isGroup) return false;
      return cards.some((c) => c.rank === card.rank && c.suit === card.suit);
    })
  );
};