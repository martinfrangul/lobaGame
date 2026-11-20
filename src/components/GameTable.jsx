import { useState } from "react";
import PlayerHand from "./PlayerHand";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import { useGameContext } from "../context/gameState";
import { isValidCombination, possibleJokerAssignments, RANKS } from "../utils/gameUtils";
import { generateDeck, shuffleDeck } from "../utils/deck";

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

  const cardValue = (card) => {
    if (card.rank === "JOKER") return 25;
    if (card.rank === "A") return 15;
    if (["J", "Q", "K"].includes(card.rank)) return 10;
    return Number(card.rank) || 0;
  };

  const [selectedCards, setSelectedCards] = useState([]);
  const [cardDrawn, setCardDrawn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState(4);
  const [jokerMode, setJokerMode] = useState("mobile"); // "fixed" | "mobile"
  const [gameMode, setGameMode] = useState("menos"); // "menos" | "mas"
  const [selectedMeld, setSelectedMeld] = useState(null); // { playerIndex, meldIndex }
  const [pendingJokers, setPendingJokers] = useState(0);
  const [jokerChoice, setJokerChoice] = useState(null); // { cards, options, context }
  const [moveChoice, setMoveChoice] = useState(null); // { meldRef, naturalCard, jokerCard, leftRank, rightRank }
  const [showLegend, setShowLegend] = useState(false);

  const startGame = () => {
    const tempDeck = [...deck];
    const newPlayers = Array.from({ length: playerCount }, (_, index) => ({
      name: `Jugador ${index + 1}`,
      hand: tempDeck.splice(0, 9),
      points: 0,
      combinations: [],
      eliminated: false,
      reenganches: 0,
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
    setJokerChoice(null);
    setMoveChoice(null);
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
        // Actualizar combinaciones del dueño del meld
        if (pIndex === playerIndex) {
          const updatedCombinations = player.combinations.map((meld, mIndex) => {
            if (mIndex !== meldIndex) return meld;
            return makeMeld(cards, assignment);
          });
          // Si el dueño es el jugador actual, quitar cartas de su mano
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
        }
        // Si el dueño no es el actual pero el jugador actual aportó cartas, quitarlas de su mano
        if (pIndex === currentTurn && playerIndex !== currentTurn) {
          return {
            ...player,
            hand: player.hand.filter(
              (card) => !selectedCards.some((selected) => selected.id === card.id)
            ),
          };
        }
        return player;
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
    // Siempre se permite pegar a combinaciones de cualquier jugador

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
    if (jokerMode === "fixed") {
      alert("La sustitución de comodín no está disponible en modo fijo.");
      return;
    }
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

  const finalizeMoveJoker = (meldRef, naturalCard, jokerCard, chosenRank) => {
    const { playerIndex, meldIndex } = meldRef;
    setPlayers((prev) =>
      prev.map((player, pIndex) => {
        if (pIndex !== playerIndex) {
          // Quitar la carta natural de la mano del jugador actual si no es el dueño
          if (pIndex === currentTurn && playerIndex !== currentTurn) {
            return {
              ...player,
              hand: player.hand.filter((c) => c.id !== naturalCard.id),
            };
          }
          return player;
        }

        const meld = player.combinations[meldIndex];
        const jokerIndex = meld.cards.findIndex((c) => c.id === jokerCard.id);
        const newCards = meld.cards.map((c, i) =>
          i === jokerIndex ? naturalCard : c
        );
        newCards.push(jokerCard);

        const newAssignment = { ...(meld.jokerAssignments || {}) };
        newAssignment[jokerCard.id] = chosenRank;

        if (!isValidCombination(newCards, newAssignment)) {
          alert("El movimiento del comodín no es válido.");
          return player;
        }

        const updatedCombinations = player.combinations.map((m, mi) => {
          if (mi !== meldIndex) return m;
          return makeMeld(newCards, newAssignment);
        });

        const newHand = player.hand.filter((c) => c.id !== naturalCard.id);
        return { ...player, hand: newHand, combinations: updatedCombinations };
      })
    );
    setSelectedCards([]);
    setSelectedMeld(null);
    setMoveChoice(null);
  };

  const handleReplaceAndMoveJoker = () => {
    if (jokerMode === "fixed") {
      alert("El movimiento de comodín no está disponible en modo fijo.");
      return;
    }
    if (!selectedMeld) {
      alert("Selecciona una combinación con comodín.");
      return;
    }
    if (selectedCards.length !== 1) {
      alert("Selecciona exactamente una carta natural para reemplazar el comodín.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    if (playerIndex !== currentTurn) {
      alert("Solo puedes mover comodines en tu turno.");
      return;
    }

    const meld = players[playerIndex].combinations[meldIndex];
    const natural = selectedCards[0];

    const jokerIndex = meld.cards.findIndex(
      (c) =>
        c.rank === "JOKER" &&
        (meld.jokerAssignments || {})[c.id] === natural.rank
    );

    if (jokerIndex === -1) {
      alert("No hay un comodín representando esa carta.");
      return;
    }

    const jokerCard = meld.cards[jokerIndex];
    const assignedIdx = RANKS.indexOf(natural.rank);

    const occupied = new Set();
    meld.cards.forEach((c, i) => {
      if (i === jokerIndex) return;
      if (c.rank === "JOKER") {
        occupied.add((meld.jokerAssignments || {})[c.id]);
      } else {
        occupied.add(c.rank);
      }
    });

    const leftIdx = assignedIdx - 1;
    const rightIdx = assignedIdx + 1;
    const leftRank = leftIdx >= 0 ? RANKS[leftIdx] : null;
    const rightRank = rightIdx < RANKS.length ? RANKS[rightIdx] : null;

    const leftAvailable = !!leftRank && !occupied.has(leftRank);
    const rightAvailable = !!rightRank && !occupied.has(rightRank);

    if (!leftAvailable && !rightAvailable) {
      alert("No hay hueco adyacente para mover el comodín.");
      return;
    }

    if (leftAvailable && !rightAvailable) {
      finalizeMoveJoker(selectedMeld, natural, jokerCard, leftRank);
    } else if (!leftAvailable && rightAvailable) {
      finalizeMoveJoker(selectedMeld, natural, jokerCard, rightRank);
    } else {
      setMoveChoice({
        meldRef: selectedMeld,
        naturalCard: natural,
        jokerCard,
        leftRank,
        rightRank,
      });
    }
  };

  const finalizeMoveChoice = (direction) => {
    if (!moveChoice) return;
    const chosenRank =
      direction === "left" ? moveChoice.leftRank : moveChoice.rightRank;
    finalizeMoveJoker(
      moveChoice.meldRef,
      moveChoice.naturalCard,
      moveChoice.jokerCard,
      chosenRank
    );
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

  const isSoparable = (card) => {
    return players.some((player) =>
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

  const handleSopar = () => {
    if (selectedCards.length === 0) {
      alert("Selecciona las cartas que quieres sopar.");
      return;
    }
    if (!selectedCards.every(isSoparable)) {
      alert("Solo se pueden sopar cartas idénticas a una pierna en mesa.");
      return;
    }

    const soparedIds = new Set(selectedCards.map((c) => c.id));

    setDiscardPile((prev) => [...prev, ...selectedCards]);
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === currentTurn
          ? {
              ...player,
              hand: player.hand.filter((c) => !soparedIds.has(c.id)),
            }
          : player
      )
    );

    const currentPlayer = players[currentTurn];
    const newHand = currentPlayer.hand.filter((c) => !soparedIds.has(c.id));

    setSelectedCards([]);

    if (newHand.length === 0) {
      // Se considera que sales en ese momento
      endRound(currentTurn);
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
      // Fin de ronda (el jugador "sale")
      endRound(currentTurn);
      return;
    }

    setCardDrawn(false);
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setCurrentTurn((currentTurn + 1) % players.length);
  };

  const sumHandValue = (hand) => hand.reduce((sum, c) => sum + cardValue(c), 0);

  const sumCombinationValue = (combinations) =>
    combinations.reduce(
      (sum, meld) => sum + meld.cards.reduce((s, c) => s + cardValue(c), 0),
      0
    );

  const endRound = (winnerIndex) => {
    const winner = players[winnerIndex];

    if (gameMode === "menos") {
      // Penalización: el que sale anota 0; el resto suma su mano
      const updated = players.map((player, index) => {
        if (player.eliminated) return player;
        if (index === winnerIndex) return { ...player, points: player.points }; // 0 esta ronda
        return { ...player, points: player.points + sumHandValue(player.hand) };
      });

      // Eliminación a 101
      const afterElimination = updated.map((player) => {
        if (player.eliminated) return player;
        if (player.points >= 101) {
          return { ...player, eliminated: true };
        }
        return player;
      });

      const active = afterElimination.filter((p) => !p.eliminated);

      // Victoria: último en pie
      if (active.length <= 1) {
        if (active.length === 1) {
          setPlayers(afterElimination);
          setGameOver(true);
          alert(`¡${active[0].name} ha ganado la partida!`);
          return;
        }
        // Todos eliminados en la misma ronda: gana el de menor puntaje
        const sorted = [...afterElimination].sort((a, b) => a.points - b.points);
        setPlayers(afterElimination);
        setGameOver(true);
        alert(`¡${sorted[0].name} ha ganado la partida!`);
        return;
      }

      setPlayers(afterElimination);
      // Nueva ronda: repartir de nuevo
      startNewRound(winnerIndex, afterElimination);
    } else {
      // Loba de Más: sumar combinaciones +5 por combinación para el que sale
      const updated = players.map((player, index) => {
        if (player.eliminated) return player;
        let roundPoints = sumCombinationValue(player.combinations);
        if (index === winnerIndex) {
          roundPoints += player.combinations.length * 5;
        }
        return { ...player, points: player.points + roundPoints };
      });

      // Victoria: primero en llegar a 150
      const reached = updated.find((p) => p.points >= 150);
      if (reached) {
        setPlayers(updated);
        setGameOver(true);
        alert(`¡${reached.name} ha ganado la partida!`);
        return;
      }

      setPlayers(updated);
      startNewRound(winnerIndex, updated);
    }
  };

  const startNewRound = (winnerIndex, currentPlayers) => {
    // Resetear manos y repartir
    const tempDeck = generateDeck();
    const newPlayers = currentPlayers.map((player) => {
      if (player.eliminated) {
        return { ...player, hand: [], combinations: [] };
      }
      return {
        ...player,
        hand: tempDeck.splice(0, 9),
        combinations: [],
      };
    });

    const firstDiscard = tempDeck.length > 0 ? tempDeck.splice(0, 1)[0] : null;

    setPlayers(newPlayers);
    setDeck(tempDeck);
    if (firstDiscard) setDiscardPile([firstDiscard]);
    else setDiscardPile([]);
    setCurrentTurn(winnerIndex >= 0 ? winnerIndex : 0);
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setJokerChoice(null);
    setMoveChoice(null);
    setCardDrawn(false);
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
        <p>Modo de juego:</p>
        <div className="game-mode-options">
          <button
            className={gameMode === "menos" ? "selected" : ""}
            onClick={() => setGameMode("menos")}
          >
            Loba de Menos
          </button>
          <button
            className={gameMode === "mas" ? "selected" : ""}
            onClick={() => setGameMode("mas")}
          >
            Loba de Más
          </button>
        </div>

        <p>Modo de comodín:</p>
        <div className="joker-mode-options">
          <button
            className={jokerMode === "fixed" ? "selected" : ""}
            onClick={() => setJokerMode("fixed")}
          >
            Fijo
          </button>
          <button
            className={jokerMode === "mobile" ? "selected" : ""}
            onClick={() => setJokerMode("mobile")}
          >
            Móvil
          </button>
        </div>
        <button onClick={startGame}>Iniciar partida</button>
      </div>
    );
  }

  if (moveChoice) {
    return (
      <div className="game-table">
        <h2>Mover comodín</h2>
        <p>Elige hacia dónde mover el comodín:</p>
        <button onClick={() => finalizeMoveChoice("left")}>
          Izquierda ({moveChoice.leftRank})
        </button>
        <button onClick={() => finalizeMoveChoice("right")}>
          Derecha ({moveChoice.rightRank})
        </button>
        <button
          onClick={() => {
            setMoveChoice(null);
            setSelectedCards([]);
          }}
        >
          Cancelar
        </button>
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

  // Layout específico para 2 jugadores (funcional primero)
  if (players.length === 2) {
    return (
      <div className="game-table layout-2p">
        {gameOver && (
          <div className="game-over-overlay">
            <h1>¡Juego terminado!</h1>
          </div>
        )}

        <header className="top-bar">
          <span className="turn-indicator">
            Turno: {players[currentTurn]?.name}
          </span>
          <span className="scoreboard">
            {players.map((p, i) => (
              <span key={i} className={p.eliminated ? "eliminated" : ""}>
                {p.name}: {p.points}
                {p.eliminated ? " (eliminado)" : ""}
              </span>
            ))}
          </span>
          <button className="icon-btn" onClick={() => setShowLegend(true)} title="Leyenda">
            ❓
          </button>
        </header>

        <section className="opponent-area">
          <h3>
            {players[1].name} — {players[1].points} pts
            {players[1].eliminated ? " (eliminado)" : ""}
          </h3>
          <PlayerHand
            cards={players[1].hand}
            selectedCards={[]}
            onCardSelect={undefined}
            isFaceDown={true}
            soparableIds={[]}
          />
        </section>

        <section className="table-area">
          <div className="deck-row">
            <button
              className="icon-btn"
              onClick={() => handleDrawCard("deck")}
              disabled={cardDrawn}
              title="Robar del mazo"
            >
              🂠
            </button>
            <DiscardPile topCard={discardPile[discardPile.length - 1]} />
          </div>

          <div className="table-combinations">
            {players.map((player, pIndex) => (
              <div key={pIndex} className="player-combinations">
                {(player.combinations || []).map((meld, meldIndex) => {
                  const isSelectedMeld =
                    selectedMeld &&
                    selectedMeld.playerIndex === pIndex &&
                    selectedMeld.meldIndex === meldIndex;
                  return (
                    <div
                      key={meld.id || meldIndex}
                      className={`combination player-${pIndex} ${isSelectedMeld ? "selected-meld" : ""}`}
                      onClick={() => handleMeldClick(pIndex, meldIndex)}
                    >
                      {meld.cards.map((card) => (
                        <Card key={card.id} rank={card.rank} suit={card.suit} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="player-area-bottom">
          <PlayerHand
            cards={players[0].hand}
            selectedCards={selectedCards}
            onCardSelect={handleCardSelect}
            isFaceDown={false}
            soparableIds={players[0].hand
              .filter(isSoparable)
              .map((c) => c.id)}
          />

          <div className="actions">
            <button
              className="icon-btn"
              onClick={() => handleDrawCard("discardPile")}
              disabled={cardDrawn || discardPile.length === 0}
              title="Robar del pozo"
            >
              📥
            </button>
            <button
              className="icon-btn"
              onClick={handleDropCombination}
              title="Bajar combinación"
            >
              ➕
            </button>
            <button
              className="icon-btn"
              onClick={handleLayoff}
              title="Agregar a combinación"
            >
              📎
            </button>
            <button
              className="icon-btn"
              onClick={handleSopar}
              title="Sopar seleccionadas"
            >
              💨
            </button>
            {jokerMode === "mobile" && (
              <>
                <button
                  className="icon-btn"
                  onClick={handleSubstituteJoker}
                  title="Sustituir comodín"
                >
                  🔄
                </button>
                <button
                  className="icon-btn"
                  onClick={handleReplaceAndMoveJoker}
                  title="Reemplazar y mover comodín"
                >
                  ↔️
                </button>
              </>
            )}
            <button
              className="icon-btn"
              onClick={handleDiscard}
              title="Descartar"
            >
              🗑️
            </button>
          </div>
        </section>

        {showLegend && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Leyenda de iconos</h3>
              <ul className="legend-list">
                <li>🂠 Robar del mazo</li>
                <li>📥 Robar del pozo</li>
                <li>➕ Bajar combinación</li>
                <li>📎 Agregar a combinación</li>
                <li>💨 Sopar seleccionadas</li>
                <li>🔄 Sustituir comodín (solo modo móvil)</li>
                <li>↔️ Reemplazar y mover comodín (solo modo móvil)</li>
                <li>🗑️ Descartar</li>
              </ul>
              <button onClick={() => setShowLegend(false)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-table layout-3-4">
      {gameOver && <h1>¡Juego terminado!</h1>}

      <header className="top-bar">
        <span className="turn-indicator">Turno: {players[currentTurn]?.name}</span>
        <span className="scoreboard">
          {players.map((p, i) => (
            <span key={i} className={p.eliminated ? "eliminated" : ""}>
              {p.name}: {p.points}
              {p.eliminated ? " (eliminado)" : ""}
            </span>
          ))}
        </span>
        <button className="icon-btn" onClick={() => setShowLegend(true)} title="Leyenda">❓</button>
      </header>

      <div className="center-area">
        {!gameOver && (
          <div className="actions">
            <button className="icon-btn" onClick={() => handleDrawCard("deck")} disabled={cardDrawn} title="Robar del mazo">🂠</button>
            <button className="icon-btn" onClick={() => handleDrawCard("discardPile")} disabled={cardDrawn || discardPile.length === 0} title="Robar del pozo">📥</button>
            {currentTurn !== null && (
              <>
                <button className="icon-btn" onClick={handleDropCombination} title="Bajar combinación">➕</button>
                <button className="icon-btn" onClick={handleLayoff} title="Agregar a combinación">📎</button>
                <button className="icon-btn" onClick={handleSopar} title="Sopar seleccionadas">💨</button>
                {jokerMode === "mobile" && (
                  <>
                    <button className="icon-btn" onClick={handleSubstituteJoker} title="Sustituir comodín">🔄</button>
                    <button className="icon-btn" onClick={handleReplaceAndMoveJoker} title="Reemplazar y mover comodín">↔️</button>
                  </>
                )}
                <button className="icon-btn" onClick={handleDiscard} title="Descartar">🗑️</button>
              </>
            )}
          </div>
        )}
        <div className="deck-row">
          <span className="deck-label">Mazo</span>
          <DiscardPile topCard={discardPile[discardPile.length - 1]} />
        </div>

        <div className="table-combinations">
          {players.map((player, pIndex) => (
            <div key={pIndex} className="player-combinations">
              {(player.combinations || []).map((meld, meldIndex) => {
                const isSelectedMeld =
                  selectedMeld &&
                  selectedMeld.playerIndex === pIndex &&
                  selectedMeld.meldIndex === meldIndex;
                return (
                  <div
                    key={meld.id || meldIndex}
                    className={`combination player-${pIndex} ${isSelectedMeld ? "selected-meld" : ""}`}
                    onClick={() => handleMeldClick(pIndex, meldIndex)}
                  >
                    {meld.cards.map((card) => (
                      <Card key={card.id} rank={card.rank} suit={card.suit} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Renderizado de jugadores (solo manos) */}
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
            soparableIds={
              currentTurn === index
                ? (players[index]?.hand || [])
                    .filter(isSoparable)
                    .map((c) => c.id)
                : []
            }
          />
        </div>
      ))}

      {showLegend && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Leyenda de iconos</h3>
            <ul className="legend-list">
              <li>🂠 Robar del mazo</li>
              <li>📥 Robar del pozo</li>
              <li>➕ Bajar combinación</li>
              <li>📎 Agregar a combinación</li>
              <li>💨 Sopar seleccionadas</li>
              <li>🔄 Sustituir comodín (solo modo móvil)</li>
              <li>↔️ Reemplazar y mover comodín (solo modo móvil)</li>
              <li>🗑️ Descartar</li>
            </ul>
            <button onClick={() => setShowLegend(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTable;
