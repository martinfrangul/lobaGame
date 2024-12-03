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

  return shuffleDeck(doubleDeck);
};

const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
