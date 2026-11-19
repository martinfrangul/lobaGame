export const generateDeck = () => {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "2", "3", "4", "5", "6", "7", "8", "9", "10",
    "J", "Q", "K", "A"
  ];

  let id = 0; // ID único para cada carta

  // Generar un solo mazo
  const singleDeck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      singleDeck.push({ id: id++, rank, suit });
    }
  }

  // Duplicar el mazo, pero asignando nuevos IDs únicos
  const doubleDeck = [
    ...singleDeck,
    ...singleDeck.map((card) => ({ ...card, id: id++ })),
  ];

  // 4 comodines (jokers), como exige el reglamento (108 cartas en total)
  for (let i = 0; i < 4; i++) {
    doubleDeck.push({ id: id++, rank: "JOKER", suit: null });
  }

  return shuffleDeck(doubleDeck);
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};