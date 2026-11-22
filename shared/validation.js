import { RANK_ORDER, RANKS, rankIndex } from "./cards.js";

const MAX_RANK_INDEX = (aceHigh) => (aceHigh ? 13 : 12);

const modeRankIndex = (rank, aceHigh) => {
  if (rank === "A") return aceHigh ? 13 : 0;
  const idx = RANK_ORDER.indexOf(rank);
  return idx >= 0 ? idx : 99;
};

export const straightValid = (cards, assignment = {}, aceHigh = false) => {
  if (!Array.isArray(cards) || cards.length < 3) return false;

  const jokers = cards.filter((card) => card.rank === "JOKER");
  const naturals = cards.filter((card) => card.rank !== "JOKER");

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
    .sort((a, b) => modeRankIndex(a.rank, aceHigh) - modeRankIndex(b.rank, aceHigh));

  // Detectar duplicados
  for (let i = 1; i < sorted.length; i++) {
    if (modeRankIndex(sorted[i].rank, aceHigh) <= modeRankIndex(sorted[i - 1].rank, aceHigh)) {
      return false;
    }
  }

  // Comodines fijos no pueden ser adyacentes entre sí
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].isJoker && sorted[i - 1].isJoker) {
      return false;
    }
  }

  const maxIdx = MAX_RANK_INDEX(aceHigh);

  // Si no quedan comodines flexibles, debe ser consecutivo
  if (remainingJokers.length === 0) {
    for (let i = 1; i < sorted.length; i++) {
      if (modeRankIndex(sorted[i].rank, aceHigh) !== modeRankIndex(sorted[i - 1].rank, aceHigh) + 1) {
        return false;
      }
    }
    return sorted.length >= 3;
  }

  // Validación flexible con comodines restantes.
  let jokerCount = remainingJokers.length;

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      modeRankIndex(sorted[i].rank, aceHigh) -
      modeRankIndex(sorted[i - 1].rank, aceHigh) -
      1;
    if (gap < 0) return false;
    if (gap > 1) {
      return false;
    }
    if (gap === 1) {
      if (jokerCount < 1) return false;
      jokerCount -= 1;
    }
  }

  const firstIdx = modeRankIndex(sorted[0].rank, aceHigh);
  const lastIdx = modeRankIndex(sorted[sorted.length - 1].rank, aceHigh);
  const leftAvailable = firstIdx > 0 ? 1 : 0;
  const rightAvailable = lastIdx < maxIdx ? 1 : 0;

  if (jokerCount > leftAvailable + rightAvailable) return false;

  return true;
};

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
  // El As puede ser carta baja (A-2-3) o carta alta (Q-K-A), se prueba ambos modos.
  return straightValid(cards, assignment, false) || straightValid(cards, assignment, true);
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

export const canUseDiscardCard = (card, hand, players, jokerMode = "fixed") => {
  if (!card) return false;
  const h = Array.isArray(hand) ? hand : [];
  const allowReassign = jokerMode === "mobile";
  const others = h.filter((c) => c.id !== card.id);

  // 1) Bajada nueva (drop): la carta + 2+ de la mano forman combinación válida
  const n = others.length;
  for (let size = 2; size <= n; size++) {
    const combo = [];
    let found = false;
    const rec = (start) => {
      if (found) return;
      if (combo.length === size) {
        const cards = [card, ...combo];
        if (possibleAssignmentsForCards(cards, {}).length > 0) found = true;
        return;
      }
      for (let i = start; i < n; i++) {
        combo.push(others[i]);
        rec(i + 1);
        combo.pop();
        if (found) return;
      }
    };
    rec(0);
    if (found) return true;
  }

  // 2) Pegado (layoff) a una combinación existente
  for (const player of players || []) {
    for (const meld of player.combinations || []) {
      const newCards = [...(meld.cards || []), card];
      const baseAssignment = allowReassign ? {} : { ...(meld.jokerAssignments || {}) };
      if (possibleAssignmentsForCards(newCards, baseAssignment).length > 0) {
        return true;
      }
    }
  }

  return false;
};

export const isAceHighContext = (cards, assignment = {}) => {
  const ranks = new Set();
  (cards || []).forEach((c) => {
    if (c.rank === "JOKER") {
      const a = (assignment || {})[c.id];
      if (a) ranks.add(a);
    } else {
      ranks.add(c.rank);
    }
  });
  const hasK = ranks.has("K");
  const has2 = ranks.has("2");
  if (hasK && !has2) return true;
  if (has2) return false;
  return hasK;
};
