import { useState } from "react";
import PlayerHand from "./PlayerHand";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import { useGameContext } from "../context/gameState";
import { isValidCombination, possibleJokerAssignments, RANKS } from "../utils/gameUtils";
import { shuffleDeck } from "../utils/deck";

const GameTable = () => {
  const {
    players,
    setPlayers,
    deck,
    setDeck,
    discardPile,
    setDiscardPile,
    currentTurn,
    setCurrentTurn,
  } = useGameContext();

  const [selectedCards, setSelectedCards] = useState([]);
  const [cardDrawn, setCardDrawn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState(4);
  const [allowLayoffAll, setAllowLayoffAll] = useState(false);
  const [selectedMeld, setSelectedMeld] = useState(null); // { playerIndex, meldIndex }
  const [pendingJokers, setPendingJokers] = useState(0);
  const [jokerChoice, setJokerChoice] = useState(null); // { cards, options, context }

  const startGame = () => {
    const tempDeck = [...deck];
    const newPlayers = Array.from({ length: playerCount }, (_, index) => ({
      name: `Jugador ${index + 1}`,
      hand: tempDeck.splice(0, 9),
      points: 0,
      combinations: [],
    }));
    const firstDiscard = tempDeck.length > 0 ? tempDeck.splice(0, 1)[0] : null;

    setPlayers(newPlayers);
    setDeck(tempDeck);
    if (firstDiscard) {
      setDiscardPile([firstDiscard]);
    }
    setCurrentTurn(0);
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setCardDrawn(false);
    setGameOver(false);
    setGameStarted(true);
  };
  

  const handleCardSelect = (card) => {
    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  };
  
  const orderCards = (cards) => {
    const rankOrder = {
      A: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
    };

    return [...cards].sort((a, b) => {
      // Los comodines se mantienen al final al ordenar
      if (a.rank === "JOKER" && b.rank !== "JOKER") return 1;
      if (b.rank === "JOKER" && a.rank !== "JOKER") return -1;
      const rankA = rankOrder[a.rank] ?? 99;
      const rankB = rankOrder[b.rank] ?? 99;
      return rankA - rankB;
    });
  };
  
  const handleMeldClick = (playerIndex, meldIndex) => {
    if (
      selectedMeld &&
      selectedMeld.playerIndex === playerIndex &&
      selectedMeld.meldIndex === meldIndex
    ) {
      setSelectedMeld(null);
    } else {
      setSelectedMeld({ playerIndex, meldIndex });
    }
  };

  const makeMeld = (cards, assignment = {}) => ({
    id: `${Date.now()}-${Math.random()}`,
    cards: orderCards(cards),
    jokerAssignments: assignment || {},
  });

  const possibleAssignmentsForCards = (cards, baseAssignment = {}) => {
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

    // Eliminar duplicados por valores de los comodines libres
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

  const finalizeDropCombination = (cards, assignment) => {
    setPlayers((prev) =>
      prev.map((player, index) => {
        if (index !== currentTurn) return player;
        return {
          ...player,
          hand: player.hand.filter(
            (card) => !cards.some((selected) => selected.id === card.id)
          ),
          combinations: [...player.combinations, makeMeld(cards, assignment)],
        };
      })
    );
    setSelectedCards([]);
  };

  const handleDropCombination = () => {
    if (selectedCards.length < 3) {
      alert("Necesitas al menos 3 cartas para formar una combinación.");
      return;
    }

    const options = possibleAssignmentsForCards(selectedCards, {});
    if (options.length === 0) {
      alert("Combinación inválida");
      setSelectedCards([]);
      return;
    }

    if (options.length === 1) {
      finalizeDropCombination(selectedCards, options[0]);
    } else {
      setJokerChoice({
        cards: selectedCards,
        options,
        context: { type: "drop" },
      });
    }
  };

  const finalizeLayoff = (cards, assignment) => {
    if (!selectedMeld) return;
    const { playerIndex, meldIndex } = selectedMeld;
    setPlayers((prev) =>
      prev.map((player, pIndex) => {
        if (pIndex !== playerIndex) return player;
        const updatedCombinations = player.combinations.map((meld, mIndex) => {
          if (mIndex !== meldIndex) return meld;
          return makeMeld(cards, assignment);
        });
        // Quitar cartas de la mano solo si el meld es del jugador actual
        if (playerIndex === currentTurn) {
          return {
            ...player,
            hand: player.hand.filter(
              (card) => !selectedCards.some((selected) => selected.id === card.id)
            ),
            combinations: updatedCombinations,
          };
        }
        return { ...player, combinations: updatedCombinations };
      })
    );
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleLayoff = () => {
    if (!selectedMeld) {
      alert("Selecciona una combinación para agregar cartas.");
      return;
    }
    if (selectedCards.length === 0) {
      alert("Selecciona las cartas a agregar.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    if (playerIndex !== currentTurn && !allowLayoffAll) {
      alert("No puedes agregar cartas a combinaciones de otros jugadores.");
      return;
    }

    const meld = players[playerIndex].combinations[meldIndex];
    const newCards = [...meld.cards, ...selectedCards];
    const baseAssignment = meld.jokerAssignments || {};
    const options = possibleAssignmentsForCards(newCards, baseAssignment);

    if (options.length === 0) {
      alert("La combinación resultante no es válida.");
      return;
    }

    if (options.length === 1) {
      finalizeLayoff(newCards, options[0]);
    } else {
      setJokerChoice({
        cards: newCards,
        options,
        context: { type: "layoff" },
      });
    }
  };

  const finalizeSubstitute = (newCards, assignment, context) => {
    const { meldRef, naturalCard, jokerCard } = context;
    const { playerIndex, meldIndex } = meldRef;

    setPlayers((prev) =>
      prev.map((player, pIndex) => {
        if (pIndex !== playerIndex) return player;

        const updatedCombinations = player.combinations.map((meld, mIndex) => {
          if (mIndex !== meldIndex) return meld;
          return makeMeld(newCards, assignment);
        });

        // Quitar la carta natural de la mano y agregar el comodín recuperado
        const newHand = player.hand.filter(
          (card) => card.id !== naturalCard.id
        );

        if (playerIndex === currentTurn) {
          return {
            ...player,
            hand: [...newHand, jokerCard],
            combinations: updatedCombinations,
          };
        }
        return { ...player, combinations: updatedCombinations };
      })
    );

    if (playerIndex === currentTurn) {
      setPendingJokers((prev) => prev + 1);
    }
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleSubstituteJoker = () => {
    if (!selectedMeld) {
      alert("Selecciona una combinación con comodín.");
      return;
    }
    if (selectedCards.length !== 1) {
      alert("Selecciona exactamente una carta natural para sustituir el comodín.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    if (playerIndex !== currentTurn) {
      alert("Solo puedes sustituir en tu turno.");
      return;
    }

    const meld = players[playerIndex].combinations[meldIndex];
    const jokerIndex = meld.cards.findIndex((c) => c.rank === "JOKER");
    if (jokerIndex === -1) {
      alert("La combinación seleccionada no tiene comodín.");
      return;
    }

    const naturalCard = selectedCards[0];
    const jokerCard = meld.cards[jokerIndex];
    const newCards = meld.cards.map((c, i) => (i === jokerIndex ? naturalCard : c));

    const baseAssignment = { ...(meld.jokerAssignments || {}) };
    delete baseAssignment[jokerCard.id];

    const options = possibleAssignmentsForCards(newCards, baseAssignment);
    if (options.length === 0) {
      alert("La sustitución no es válida.");
      return;
    }

    const context = {
      type: "substitute",
      meldRef: { playerIndex, meldIndex },
      naturalCard,
      jokerCard,
    };

    if (options.length === 1) {
      finalizeSubstitute(newCards, options[0], context);
    } else {
      setJokerChoice({ cards: newCards, options, context });
    }
  };
  

  const handleDrawCard = (source) => {
    if (cardDrawn) {
      alert("Ya has tomado una carta este turno.");
      return;
    }

    if (source === "deck") {
      let workingDeck = [...deck];
      let workingDiscard = [...discardPile];

      // Reciclar el pozo si el mazo se agotó (se deja la carta superior)
      if (workingDeck.length === 0) {
        if (workingDiscard.length <= 1) {
          alert("El mazo está vacío.");
          return;
        }
        const topCard = workingDiscard[workingDiscard.length - 1];
        const toShuffle = workingDiscard.slice(0, -1);
        workingDeck = shuffleDeck(toShuffle);
        workingDiscard = [topCard];
      }

      if (workingDeck.length === 0) {
        alert("El mazo está vacío.");
        return;
      }

      const card = workingDeck[workingDeck.length - 1];
      const restDeck = workingDeck.slice(0, -1);

      setDeck(restDeck);
      setDiscardPile(workingDiscard);
      setPlayers((prev) =>
        prev.map((player, index) =>
          index === currentTurn
            ? { ...player, hand: [...player.hand, card] }
            : player
        )
      );
      setCardDrawn(true);
      return;
    }

    if (source === "discardPile") {
      if (discardPile.length === 0) {
        alert("El pozo está vacío.");
        return;
      }
      const card = discardPile[discardPile.length - 1];
      const restDiscard = discardPile.slice(0, -1);

      setDiscardPile(restDiscard);
      setPlayers((prev) =>
        prev.map((player, index) =>
          index === currentTurn
            ? { ...player, hand: [...player.hand, card] }
            : player
        )
      );
      setCardDrawn(true);
    }
  };

  const finalizeJokerChoice = (assignment) => {
    if (!jokerChoice) return;
    const { context } = jokerChoice;
    setJokerChoice(null);

    if (context.type === "drop") {
      finalizeDropCombination(jokerChoice.cards, assignment);
    } else if (context.type === "layoff") {
      finalizeLayoff(jokerChoice.cards, assignment);
    } else if (context.type === "substitute") {
      finalizeSubstitute(jokerChoice.cards, assignment, context);
    }
  };

  const handleDiscard = () => {
    if (!cardDrawn) {
      alert("Primero debes tomar una carta.");
      return;
    }

    if (pendingJokers > 0) {
      alert("Debes jugar el comodín recuperado antes de descartar.");
      return;
    }

    if (selectedCards.length !== 1) {
      alert("Debes seleccionar exactamente una carta para descartar.");
      return;
    }

    const cardToDiscard = selectedCards[0];
    const currentPlayer = players[currentTurn];
    const newHand = currentPlayer.hand.filter(
      (card) => card.id !== cardToDiscard.id
    );

    setDiscardPile((prev) => [...prev, cardToDiscard]);
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === currentTurn ? { ...player, hand: newHand } : player
      )
    );

    if (newHand.length === 0) {
      setGameOver(true);
      alert(`¡${currentPlayer.name} ha ganado!`);
      return;
    }

    setCardDrawn(false);
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setCurrentTurn((currentTurn + 1) % players.length);
  };

  if (!gameStarted) {
    return (
      <div className="game-table setup-screen">
        <h1>Loba</h1>
        <p>¿Cuántos jugadores?</p>
        <div className="player-count-options">
          {[2, 3, 4].map((count) => (
            <button
              key={count}
              className={playerCount === count ? "selected" : ""}
              onClick={() => setPlayerCount(count)}
            >
              {count} jugadores
            </button>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={allowLayoffAll}
            onChange={(e) => setAllowLayoffAll(e.target.checked)}
          />
          Permitir pegar cartas a combinaciones de otros
        </label>
        <button onClick={startGame}>Iniciar partida</button>
      </div>
    );
  }

  if (jokerChoice) {
    const jokers = jokerChoice.cards.filter((c) => c.rank === "JOKER");
    return (
      <div className="game-table">
        <h2>Elegir valor del comodín</h2>
        <p>Hay varias interpretaciones válidas. Elige una:</p>
        <div className="joker-choice-options">
          {jokerChoice.options.map((opt, idx) => (
            <button key={idx} onClick={() => finalizeJokerChoice(opt)}>
              {jokers.map((j) => opt[j.id]).join(" / ")}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setJokerChoice(null);
            setSelectedCards([]);
          }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="game-table">
      {gameOver && <h1>¡Juego terminado!</h1>}

      <div className="center-area">
  {!gameOver && (
    <>
      <button onClick={() => handleDrawCard("deck")} disabled={cardDrawn}>
        Robar del mazo
      </button>
      <button
        onClick={() => handleDrawCard("discardPile")}
        disabled={cardDrawn || discardPile.length === 0}
      >
        Robar del pozo
      </button>
      {currentTurn !== null && (
        <>
          <button onClick={handleDropCombination}>Bajar combinación</button>
          <button onClick={handleLayoff}>Agregar a combinación</button>
          <button onClick={handleSubstituteJoker}>Sustituir comodín</button>
          <button onClick={handleDiscard}>Descartar</button>
        </>
      )}
    </>
  )}
  <DiscardPile topCard={discardPile[discardPile.length - 1]} />
</div>

      {/* Renderizado de jugadores */}
      {players.map((player, index) => (
        <div
          key={index}
          className={`player-area ${
            index === 0
              ? "player-bottom"
              : index === 1
              ? "player-right"
              : index === 2
              ? "player-top"
              : "player-left"
          }`}
        >
          <PlayerHand
            cards={player.hand}
            selectedCards={currentTurn === index ? selectedCards : []}
            onCardSelect={currentTurn === index ? handleCardSelect : undefined}
            isFaceDown={currentTurn !== index}
          />
          <h3>{player.name}</h3>
          <div className="combinations-area">
            {player?.combinations?.map((meld, combIndex) => {
              const isSelectedMeld =
                selectedMeld &&
                selectedMeld.playerIndex === index &&
                selectedMeld.meldIndex === combIndex;
              return (
                <div
                  key={meld.id || combIndex}
                  className={`combination ${isSelectedMeld ? "selected-meld" : ""}`}
                  onClick={() => handleMeldClick(index, combIndex)}
                >
                  {meld.cards.map((card) => (
                    <Card
                      key={card.id}
                      rank={card.rank}
                      suit={card.suit}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameTable;
