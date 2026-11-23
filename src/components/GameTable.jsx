import { useState, useEffect } from "react";
import PlayerHand from "./PlayerHand";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import { useGameContext } from "../context/gameState";
import {
  isValidCombination,
  canUseDiscardCard,
  RANKS,
  RANK_ORDER_MAP,
  cardValue,
  orderCards,
  makeMeld,
  possibleAssignmentsForCards,
  isSoparable,
  startGame as sharedStartGame,
  startNewRound as sharedStartNewRound,
  computeEndRound,
  findBotCombination,
  shuffleDeck,
} from "@shared";

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
  const [notice, setNotice] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [roundCountdown, setRoundCountdown] = useState(0);
  const [cardDrawn, setCardDrawn] = useState(false);
  const [drawnFromDiscard, setDrawnFromDiscard] = useState(false);
  const [drawnCardId, setDrawnCardId] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [jokerMode, setJokerMode] = useState("fixed"); // "fixed" | "mobile"
  const [gameMode, setGameMode] = useState("menos"); // "menos" | "mas"
  const [selectedMeld, setSelectedMeld] = useState(null); // { playerIndex, meldIndex }
  const [pendingJokers, setPendingJokers] = useState(0);
  const [jokerChoice, setJokerChoice] = useState(null); // { cards, options, context }
  const [moveChoice, setMoveChoice] = useState(null); // { meldRef, naturalCard, jokerCard, leftRank, rightRank }
  const [showLegend, setShowLegend] = useState(false);
  const [autoPlayOpponents, setAutoPlayOpponents] = useState(false);
  const [lastDrawnCardId, setLastDrawnCardId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!roundResult) return;
    if (roundCountdown <= 0) {
      continueRound();
      return;
    }
    const t = setTimeout(() => setRoundCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [roundResult, roundCountdown]);

  const startGame = () => {
    const result = sharedStartGame({ playerCount }, deck);

    setPlayers(result.players);
    setDeck(result.deck);
    setDiscardPile(result.discardPile);
    setCurrentTurn(Math.floor(Math.random() * playerCount));
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setJokerChoice(null);
    setMoveChoice(null);
    setCardDrawn(false);
    setDrawnFromDiscard(false);
    setDrawnCardId(null);
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

  const finalizeDropCombination = (cards, assignment) => {
    const updatedPlayers = players.map((player, index) => {
      if (index !== currentTurn) return player;
      return {
        ...player,
        hand: player.hand.filter(
          (card) => !cards.some((selected) => selected.id === card.id)
        ),
        combinations: [...player.combinations, makeMeld(cards, assignment)],
      };
    });
    setPlayers(updatedPlayers);
    if (drawnFromDiscard && cards.some((c) => c.id === drawnCardId)) {
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
    }
    setSelectedCards([]);
    if ((updatedPlayers[currentTurn]?.hand || []).length === 0) {
      endRound(currentTurn, updatedPlayers);
    }
  };

  const handleDropCombination = () => {
    if (selectedCards.length < 3) {
      setNotice("Necesitas al menos 3 cartas para formar una combinación.");
      return;
    }

    const options = possibleAssignmentsForCards(selectedCards, {});
    if (options.length === 0) {
      setNotice("Combinación inválida");
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
    const updatedPlayers = players.map((player, pIndex) => {
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
    });
    setPlayers(updatedPlayers);
    if (drawnFromDiscard && selectedCards.some((c) => c.id === drawnCardId)) {
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
    }
    setSelectedCards([]);
    setSelectedMeld(null);
    if ((updatedPlayers[currentTurn]?.hand || []).length === 0) {
      endRound(currentTurn, updatedPlayers);
    }
  };

  const handleLayoff = () => {
    if (!selectedMeld) {
      setNotice("Selecciona una combinación para agregar cartas.");
      return;
    }
    if (selectedCards.length === 0) {
      setNotice("Selecciona las cartas a agregar.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    // Siempre se permite pegar a combinaciones de cualquier jugador

    const meld = players[playerIndex].combinations[meldIndex];
    const newCards = [...meld.cards, ...selectedCards];
    const baseAssignment = meld.jokerAssignments || {};
    // En modo móvil se permite reasignar comodines existentes si es necesario
    const allowReassign = jokerMode === "mobile";
    const options = possibleAssignmentsForCards(
      newCards,
      allowReassign ? {} : baseAssignment
    );

    if (options.length === 0) {
      setNotice("La combinación resultante no es válida.");
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
    if (drawnFromDiscard && selectedCards.some((c) => c.id === drawnCardId)) {
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
    }
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleSubstituteJoker = () => {
    if (jokerMode === "fixed") {
      setNotice("La sustitución de comodín no está disponible en modo fijo.");
      return;
    }
    if (!selectedMeld) {
      setNotice("Selecciona una combinación con comodín.");
      return;
    }
    if (selectedCards.length !== 1) {
      setNotice("Selecciona exactamente una carta natural para sustituir el comodín.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    if (playerIndex !== currentTurn) {
      setNotice("Solo puedes sustituir en tu turno.");
      return;
    }

    const meld = players[playerIndex].combinations[meldIndex];
    const jokerIndex = meld.cards.findIndex((c) => c.rank === "JOKER");
    if (jokerIndex === -1) {
      setNotice("La combinación seleccionada no tiene comodín.");
      return;
    }

    const naturalCard = selectedCards[0];
    const jokerCard = meld.cards[jokerIndex];
    const newCards = meld.cards.map((c, i) => (i === jokerIndex ? naturalCard : c));

    const baseAssignment = { ...(meld.jokerAssignments || {}) };
    delete baseAssignment[jokerCard.id];

    const options = possibleAssignmentsForCards(newCards, baseAssignment);
    if (options.length === 0) {
      setNotice("La sustitución no es válida.");
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
      setNotice("Ya has tomado una carta este turno.");
      return;
    }

    if (source === "deck") {
      let workingDeck = [...deck];
      let workingDiscard = [...discardPile];

      // Reciclar el pozo si el mazo se agotó (se deja la carta superior)
      if (workingDeck.length === 0) {
        if (workingDiscard.length <= 1) {
          setNotice("El mazo está vacío.");
          return;
        }
        const topCard = workingDiscard[workingDiscard.length - 1];
        const toShuffle = workingDiscard.slice(0, -1);
        workingDeck = shuffleDeck(toShuffle);
        workingDiscard = [topCard];
      }

      if (workingDeck.length === 0) {
        setNotice("El mazo está vacío.");
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
      setLastDrawnCardId(card.id);
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
      return;
    }

    if (source === "discardPile") {
      if (discardPile.length === 0) {
        setNotice("El pozo está vacío.");
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
      setLastDrawnCardId(card.id);
      setDrawnFromDiscard(true);
      setDrawnCardId(card.id);
    }
  };

  const handleUndoDraw = () => {
    if (!cardDrawn || !drawnFromDiscard) {
      setNotice("No hay robo que deshacer.");
      return;
    }
    const currentPlayer = players[currentTurn];
    const card = (currentPlayer.hand || []).find((c) => c.id === drawnCardId);
    if (!card) {
      setNotice("La carta ya no está en tu mano.");
      return;
    }
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === currentTurn
          ? { ...player, hand: player.hand.filter((c) => c.id !== drawnCardId) }
          : player
      )
    );
    setDiscardPile((prev) => [...prev, card]);
    setCardDrawn(false);
    setDrawnFromDiscard(false);
    setDrawnCardId(null);
    setLastDrawnCardId(null);
    setNotice("Robo deshecho.");
  };

  const finalizeMoveJoker = (meldRef, naturalCard, jokerCard, chosenRank) => {
    const { playerIndex, meldIndex } = meldRef;
    const owner = players[playerIndex];
    const meld = owner?.combinations?.[meldIndex];
    if (!meld) return;
    const jokerIndex = meld.cards.findIndex((c) => c.id === jokerCard.id);
    const newCards = meld.cards.map((c, i) =>
      i === jokerIndex ? naturalCard : c
    );
    newCards.push(jokerCard);

    const newAssignment = { ...(meld.jokerAssignments || {}) };
    newAssignment[jokerCard.id] = chosenRank;

    if (!isValidCombination(newCards, newAssignment)) {
      setNotice("El movimiento del comodín no es válido.");
      return;
    }

    const updatedPlayers = players.map((player, pIndex) => {
      if (pIndex !== playerIndex) {
        if (pIndex === currentTurn && playerIndex !== currentTurn) {
          return {
            ...player,
            hand: player.hand.filter((c) => c.id !== naturalCard.id),
          };
        }
        return player;
      }
      const updatedCombinations = player.combinations.map((m, mi) => {
        if (mi !== meldIndex) return m;
        return makeMeld(newCards, newAssignment);
      });
      const newHand = player.hand.filter((c) => c.id !== naturalCard.id);
      return { ...player, hand: newHand, combinations: updatedCombinations };
    });
    setPlayers(updatedPlayers);
    setSelectedCards([]);
    setSelectedMeld(null);
    setMoveChoice(null);
    if (drawnFromDiscard && selectedCards.some((c) => c.id === drawnCardId)) {
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
    }
    if ((updatedPlayers[currentTurn]?.hand || []).length === 0) {
      endRound(currentTurn, updatedPlayers);
    }
  };

  const handleReplaceAndMoveJoker = () => {
    if (jokerMode === "fixed") {
      setNotice("El movimiento de comodín no está disponible en modo fijo.");
      return;
    }
    if (!selectedMeld) {
      setNotice("Selecciona una combinación con comodín.");
      return;
    }
    if (selectedCards.length !== 1) {
      setNotice("Selecciona exactamente una carta natural para reemplazar el comodín.");
      return;
    }

    const { playerIndex, meldIndex } = selectedMeld;
    if (playerIndex !== currentTurn) {
      setNotice("Solo puedes mover comodines en tu turno.");
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
      setNotice("No hay un comodín representando esa carta.");
      return;
    }

    const jokerCard = meld.cards[jokerIndex];

    const occupied = new Set();
    meld.cards.forEach((c, i) => {
      if (i === jokerIndex) return;
      if (c.rank === "JOKER") {
        occupied.add((meld.jokerAssignments || {})[c.id]);
      } else {
        occupied.add(c.rank);
      }
    });

    let leftRank = null;
    let rightRank = null;
    if (natural.rank === "A") {
      const highPossible = !occupied.has("2");
      const lowPossible = !occupied.has("K");
      if (highPossible) leftRank = "K";
      if (lowPossible) rightRank = "2";
    } else {
      const assignedIdx = RANKS.indexOf(natural.rank);
      const leftIdx = assignedIdx - 1;
      const rightIdx = assignedIdx + 1;
      leftRank = leftIdx >= 0 ? RANKS[leftIdx] : null;
      rightRank = rightIdx < RANKS.length ? RANKS[rightIdx] : null;
    }

    const leftAvailable = !!leftRank && !occupied.has(leftRank);
    const rightAvailable = !!rightRank && !occupied.has(rightRank);

    if (!leftAvailable && !rightAvailable) {
      setNotice("No hay hueco adyacente para mover el comodín.");
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

  const handleSopar = () => {
    if (selectedCards.length === 0) {
      setNotice("Selecciona las cartas que quieres sopar.");
      return;
    }
    if (!selectedCards.every((c) => isSoparable(c, players))) {
      setNotice("Solo se pueden sopar cartas idénticas a una pierna en mesa.");
      return;
    }

    const soparedIds = new Set(selectedCards.map((c) => c.id));

    const updatedPlayers = players.map((player, index) =>
      index === currentTurn
        ? {
            ...player,
            hand: player.hand.filter((c) => !soparedIds.has(c.id)),
          }
        : player
    );

    setDiscardPile((prev) => [...prev, ...selectedCards]);
    setPlayers(updatedPlayers);

    const newHand = updatedPlayers[currentTurn].hand;

    setSelectedCards([]);

    if (drawnFromDiscard && selectedCards.some((c) => c.id === drawnCardId)) {
      setDrawnFromDiscard(false);
      setDrawnCardId(null);
    }

    if (newHand.length === 0) {
      // Se considera que sales en ese momento
      endRound(currentTurn, updatedPlayers);
    }
  };

  const sortHand = (mode) => {
    setLastDrawnCardId(null);
    setPlayers((prev) =>
      prev.map((player, index) => {
        if (index !== 0) return player;
        const hand = [...player.hand];
        if (mode === "suit") {
          hand.sort((a, b) => {
            if ((a.suit || "") !== (b.suit || "")) {
              return (a.suit || "").localeCompare(b.suit || "");
            }
            return (RANK_ORDER_MAP[a.rank] || 99) - (RANK_ORDER_MAP[b.rank] || 99);
          });
        } else if (mode === "rank") {
          hand.sort((a, b) => {
            const r = (RANK_ORDER_MAP[a.rank] || 99) - (RANK_ORDER_MAP[b.rank] || 99);
            if (r !== 0) return r;
            return (a.suit || "").localeCompare(b.suit || "");
          });
        } else if (mode === "random") {
          for (let i = hand.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [hand[i], hand[j]] = [hand[j], hand[i]];
          }
        }
        return { ...player, hand };
      })
    );
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index = null) => {
    const target = index !== null ? index : dragOverIndex;
    if (dragIndex === null) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    if (target === null || target === dragIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPlayers((prev) =>
      prev.map((player, pIndex) => {
        if (pIndex !== currentTurn) return player;
        const hand = [...player.hand];
        const [moved] = hand.splice(dragIndex, 1);
        // Insertar antes del objetivo; si el objetivo era posterior, ajustar
        const insertAt = target > dragIndex ? target - 1 : target;
        const safeIndex = Math.max(0, Math.min(hand.length, insertAt));
        hand.splice(safeIndex, 0, moved);
        return { ...player, hand };
      })
    );
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setLastDrawnCardId(null);
  };

  const handleDiscard = () => {
    if (!cardDrawn) {
      setNotice("Primero debes tomar una carta.");
      return;
    }

    if (pendingJokers > 0) {
      setNotice("Debes jugar el comodín recuperado antes de descartar.");
      return;
    }

    const currentPlayer = players[currentTurn];
    if (drawnFromDiscard && (currentPlayer.hand || []).some((c) => c.id === drawnCardId)) {
      setNotice("Debes usar la carta del pozo antes de descartar.");
      return;
    }

    if (selectedCards.length !== 1) {
      setNotice("Debes seleccionar exactamente una carta para descartar.");
      return;
    }

    const cardToDiscard = selectedCards[0];
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
    setLastDrawnCardId(null);
    setDrawnFromDiscard(false);
    setDrawnCardId(null);
    setCurrentTurn((currentTurn + 1) % players.length);
  };

  const endRound = (winnerIndex, playersOverride) => {
    const basePlayers = playersOverride || players;
    const result = computeEndRound(basePlayers, winnerIndex, gameMode);

    setPlayers(result.players);

    if (result.gameOver) {
      setGameOver(true);
      if (result.winnerName) {
        setNotice(`¡${result.winnerName} ha ganado la partida!`);
      }
      return;
    }

    const deltas = result.players.map((p, i) => p.points - (players[i]?.points || 0));
    setRoundResult({
      winnerIndex,
      winnerName: players[winnerIndex]?.name || `Jugador ${winnerIndex + 1}`,
      players: result.players,
      deltas,
    });
    setRoundCountdown(6);
  };

  const continueRound = () => {
    if (!roundResult) return;
    startNewRound(roundResult.winnerIndex, roundResult.players);
    setRoundResult(null);
    setRoundCountdown(0);
  };

  const startNewRound = (winnerIndex, currentPlayers) => {
    const result = sharedStartNewRound(winnerIndex, currentPlayers);
    setPlayers(result.players);
    setDeck(result.deck);
    setDiscardPile(result.discardPile);
    setCurrentTurn(result.currentTurn);
    setSelectedCards([]);
    setSelectedMeld(null);
    setPendingJokers(0);
    setJokerChoice(null);
    setMoveChoice(null);
    setCardDrawn(false);
    setDrawnFromDiscard(false);
    setDrawnCardId(null);
  };

  const handleSimulateRound = () => {
    if (gameOver) return;

    let simPlayers = players.map((p) => ({
      ...p,
      hand: [...(p.hand || [])],
      combinations: [...(p.combinations || [])],
    }));
    let simDeck = [...deck];
    let simDiscard = [...discardPile];
    let simTurn = currentTurn;
    let roundEnded = false;
    let winnerIndex = null;
    let guard = 0;

    while (!roundEnded && guard < 1000) {
      guard++;
      if (simPlayers.every((p) => p.eliminated)) break;
      if (simPlayers[simTurn].eliminated) {
        simTurn = (simTurn + 1) % simPlayers.length;
        continue;
      }

      const player = simPlayers[simTurn];

      // Robar del mazo (reciclar pozo si hace falta)
      if (simDeck.length === 0) {
        if (simDiscard.length <= 1) break;
        const top = simDiscard[simDiscard.length - 1];
        simDeck = shuffleDeck(simDiscard.slice(0, -1));
        simDiscard = [top];
      }
      if (simDeck.length === 0) break;
      const drawn = simDeck[simDeck.length - 1];
      simDeck = simDeck.slice(0, -1);
      player.hand.push(drawn);

      // Intentar bajar una combinación
      const combo = findBotCombination(player.hand);
      if (combo) {
        const ids = new Set(combo.map((c) => c.id));
        player.hand = player.hand.filter((c) => !ids.has(c.id));
        player.combinations = [...player.combinations, { id: `${Date.now()}-${Math.random()}`, cards: orderCards(combo), jokerAssignments: {} }];
      }

      // Descartar
      if (player.hand.length === 0) {
        winnerIndex = simTurn;
        roundEnded = true;
        break;
      }
      const cardToDiscard = [...player.hand].sort((a, b) => cardValue(b) - cardValue(a))[0];
      player.hand = player.hand.filter((c) => c.id !== cardToDiscard.id);
      simDiscard.push(cardToDiscard);

      if (player.hand.length === 0) {
        winnerIndex = simTurn;
        roundEnded = true;
        break;
      }

      simTurn = (simTurn + 1) % simPlayers.length;
    }

    if (winnerIndex === null) {
      setNotice("No se pudo simular la ronda.");
      return;
    }

    const result = computeEndRound(simPlayers, winnerIndex, gameMode);
    setPlayers(result.players);

    if (result.gameOver) {
      setGameOver(true);
      if (result.winnerName) setNotice(`¡${result.winnerName} ha ganado la partida!`);
      return;
    }

    const deltas = result.players.map((p, i) => p.points - (simPlayers[i]?.points || 0));
    setRoundResult({
      winnerIndex,
      winnerName: simPlayers[winnerIndex]?.name || `Jugador ${winnerIndex + 1}`,
      players: result.players,
      deltas,
    });
    setRoundCountdown(6);
    setCurrentTurn(winnerIndex);
    setCardDrawn(false);
    setDrawnFromDiscard(false);
    setDrawnCardId(null);
    setSelectedCards([]);
  };

  // --- Simulación de rivales (bots) ---
  useEffect(() => {
    if (!gameStarted || !autoPlayOpponents) return;
    if (currentTurn === 0) return; // humano
    if (gameOver) return;
    if (roundResult) return; // no jugar mientras hay modal de resultados

    const timer = setTimeout(() => {
      // 1) Robar
      let workingDeck = [...deck];
      let workingDiscard = [...discardPile];
      if (workingDeck.length === 0 && workingDiscard.length > 1) {
        const top = workingDiscard[workingDiscard.length - 1];
        workingDeck = shuffleDeck(workingDiscard.slice(0, -1));
        workingDiscard = [top];
      }
      if (workingDeck.length === 0) return;

      const drawn = workingDeck[workingDeck.length - 1];
      const restDeck = workingDeck.slice(0, -1);

      setDeck(restDeck);
      setDiscardPile(workingDiscard);

      setPlayers((prev) =>
        prev.map((player, index) =>
          index === currentTurn
            ? { ...player, hand: [...player.hand, drawn] }
            : player
        )
      );

      // 2) Bajar combinación si puede (tras un pequeño delay)
      setTimeout(() => {
        setPlayers((prev) => {
          const player = prev[currentTurn];
          const combo = findBotCombination(player.hand);
          if (!combo) return prev;

          const comboIds = new Set(combo.map((c) => c.id));
          const updated = prev.map((p, index) => {
            if (index !== currentTurn) return p;
            return {
              ...p,
              hand: p.hand.filter((c) => !comboIds.has(c.id)),
              combinations: [...p.combinations, { id: `${Date.now()}`, cards: orderCards(combo), jokerAssignments: {} }],
            };
          });
          return updated;
        });

        // 3) Descartar
        setTimeout(() => {
          setPlayers((prev) => {
            const player = prev[currentTurn];
            if (player.hand.length === 0) return prev;

            // Elegir carta de mayor penalización
            const cardToDiscard = [...player.hand].sort(
              (a, b) => cardValue(b) - cardValue(a)
            )[0];

            const newHand = player.hand.filter((c) => c.id !== cardToDiscard.id);

            setDiscardPile((d) => [...d, cardToDiscard]);

            const updated = prev.map((p, index) =>
              index === currentTurn ? { ...p, hand: newHand } : p
            );

            if (newHand.length === 0) {
              endRound(currentTurn);
            } else {
              setCardDrawn(false);
              setSelectedCards([]);
              setPendingJokers(0);
              setCurrentTurn((currentTurn + 1) % players.length);
            }
            return updated;
          });
        }, 600);
      }, 600);
    }, 800);

    return () => clearTimeout(timer);
  }, [currentTurn, autoPlayOpponents, gameStarted, gameOver, roundResult]);

  if (!gameStarted) {
    return (
      <div className="game-table setup-screen">
        <div className="setup-card">
          <h1>Loba</h1>
          <p className="setup-subtitle">Configura tu partida</p>

          <div className="setup-section">
            <h3>Jugadores</h3>
            <div className="setup-options">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  className={`setup-option ${playerCount === count ? "selected" : ""}`}
                  onClick={() => setPlayerCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <h3>Modo de juego</h3>
            <div className="setup-options">
              <button
                className={`setup-option ${gameMode === "menos" ? "selected" : ""}`}
                onClick={() => setGameMode("menos")}
              >
                Loba de Menos
              </button>
              <button
                className={`setup-option ${gameMode === "mas" ? "selected" : ""}`}
                onClick={() => setGameMode("mas")}
              >
                Loba de Más
              </button>
            </div>
          </div>

          <div className="setup-section">
            <h3>Modo de comodín</h3>
            <div className="setup-options">
              <button
                className={`setup-option ${jokerMode === "fixed" ? "selected" : ""}`}
                onClick={() => setJokerMode("fixed")}
              >
                Fijo
              </button>
              <button
                className={`setup-option ${jokerMode === "mobile" ? "selected" : ""}`}
                onClick={() => setJokerMode("mobile")}
              >
                Móvil
              </button>
            </div>
          </div>

          <label className="setup-checkbox">
            <input
              type="checkbox"
              checked={autoPlayOpponents}
              onChange={(e) => setAutoPlayOpponents(e.target.checked)}
            />
            Simular rivales automáticamente
          </label>
          <button className="start-button" onClick={startGame}>
            Iniciar partida
          </button>
        </div>
      </div>
    );
  }

  if (moveChoice) {
    return (
      <div className="modal-overlay">
        <div className="modal setup-card">
          <h2>Mover comodín</h2>
          <p>Elige hacia dónde mover el comodín:</p>
          <div className="joker-choice-options">
            <button
              className="setup-option"
              onClick={() => finalizeMoveChoice("left")}
            >
              Izquierda ({moveChoice.leftRank})
            </button>
            <button
              className="setup-option"
              onClick={() => finalizeMoveChoice("right")}
            >
              Derecha ({moveChoice.rightRank})
            </button>
          </div>
          <button
            className="setup-option"
            onClick={() => {
              setMoveChoice(null);
              setSelectedCards([]);
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (jokerChoice) {
    const jokers = jokerChoice.cards.filter((c) => c.rank === "JOKER");
    return (
      <div className="modal-overlay">
        <div className="modal setup-card">
          <h2>Elegir valor del comodín</h2>
          <p>Hay varias interpretaciones válidas. Elige una:</p>
          <div className="joker-choice-options">
            {jokerChoice.options.map((opt, idx) => (
              <button
                key={idx}
                className="setup-option"
                onClick={() => finalizeJokerChoice(opt)}
              >
                {jokers.map((j) => opt[j.id]).join(" / ")}
              </button>
            ))}
          </div>
          <button
            className="setup-option"
            onClick={() => {
              setJokerChoice(null);
              setSelectedCards([]);
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-table layout-3-4">
      {notice && <div className="toast-notice">{notice}</div>}
      {gameOver && <h1>¡Juego terminado!</h1>}

      <header className="top-bar">
        <span className="turn-indicator">Turno: {players[currentTurn]?.name}</span>
        <span className="scoreboard">
          {players.map((p, i) => (
            <span key={i} className={`score-chip ${i === currentTurn ? "active" : ""} ${p.eliminated ? "eliminated" : ""}`}>
              {p.name}: {p.points}
            </span>
          ))}
        </span>
        <span className="thinking-slot">
          {autoPlayOpponents && currentTurn !== 0 && (
            <span className="bot-thinking">Rival pensando…</span>
          )}
        </span>
        <button className="icon-btn" onClick={() => setShowLegend(true)} title="Leyenda">❓</button>
      </header>

      <div className="center-area">
        <div className="deck-row">
          <span className="deck-label">Mazo</span>
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
      </div>

      {/* Rivales en sus posiciones */}
      <div className="opponents-layer">
        {players.map((p, i) => {
          if (i === 0) return null;
          let posClass = "pos-right";
          if (players.length === 2) posClass = "pos-top";
          else if (i === 2) posClass = "pos-top";
          else if (i === 3) posClass = "pos-left";
          return (
            <div key={i} className={`opponent-badge ${posClass} ${i === currentTurn ? "active" : ""}`}>
              <span className="opp-deck">🂠</span>
              <span className="opp-count">{p.hand.length}</span>
              <span className="opp-name">{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Zona inferior: mano del jugador activo */}
      <section className="bottom-area current-turn">
        {players[currentTurn] && (
          <>
            <PlayerHand
              cards={players[autoPlayOpponents && currentTurn !== 0 ? 0 : currentTurn].hand}
              selectedCards={autoPlayOpponents && currentTurn !== 0 ? [] : selectedCards}
              onCardSelect={autoPlayOpponents && currentTurn !== 0 ? undefined : handleCardSelect}
              isFaceDown={false}
              soparableIds={[]}
              lastDrawnCardId={drawnFromDiscard ? drawnCardId : null}
              onSort={sortHand}
              draggable={!(autoPlayOpponents && currentTurn !== 0)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragIndex={dragIndex}
              dragOverIndex={dragOverIndex}
            />
            <div className="actions">
              <button className="icon-btn" onClick={() => handleDrawCard("deck")} disabled={cardDrawn || currentTurn !== 0} title="Robar del mazo">🂠</button>
              <button className="icon-btn" onClick={() => handleDrawCard("discardPile")} disabled={cardDrawn || discardPile.length === 0 || currentTurn !== 0 || !(discardPile.length && canUseDiscardCard(discardPile[discardPile.length - 1], players[currentTurn]?.hand || [], players, jokerMode))} title="Robar del pozo">📥</button>
              {drawnFromDiscard && (
                <button className="icon-btn" onClick={handleUndoDraw} disabled={currentTurn !== 0} title="Deshacer robo del pozo">↩</button>
              )}
              <button className="icon-btn" onClick={handleDropCombination} disabled={currentTurn !== 0} title="Bajar combinación">➕</button>
              <button className="icon-btn" onClick={handleLayoff} disabled={currentTurn !== 0 || !selectedMeld} title="Agregar a combinación">📎</button>
              <button className="icon-btn" onClick={handleSopar} disabled={currentTurn !== 0} title="Sopar seleccionadas">💨</button>
              {jokerMode === "mobile" && (
                <>
                  <button className="icon-btn" onClick={handleSubstituteJoker} disabled={currentTurn !== 0} title="Sustituir comodín">🔄</button>
                  <button className="icon-btn" onClick={handleReplaceAndMoveJoker} disabled={currentTurn !== 0} title="Reemplazar y mover comodín">↔️</button>
                </>
              )}
              <button className="icon-btn" onClick={handleDiscard} disabled={currentTurn !== 0} title="Descartar">🗑️</button>
              <button className="icon-btn" onClick={handleSimulateRound} title="Simular ronda">🎲</button>
              <button className="icon-btn" onClick={() => setShowLegend(true)} title="Leyenda">❓</button>
            </div>
          </>
        )}
      </section>

      {roundResult && (
        <div className="modal-overlay">
          <div className="modal setup-card round-result-modal">
            <h2>Resultados de la ronda</h2>
            <p className="round-winner">Ganador: {roundResult.winnerName}</p>
            <table className="round-table">
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th>Ronda</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {roundResult.players.map((p, i) => (
                  <tr key={i} className={p.eliminated ? "eliminated" : ""}>
                    <td>{p.name}</td>
                    <td>{roundResult.deltas[i] > 0 ? `+${roundResult.deltas[i]}` : roundResult.deltas[i]}</td>
                    <td>{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="round-countdown">Continuando en {roundCountdown}s…</p>
            <button className="start-button" onClick={continueRound}>Continuar</button>
          </div>
        </div>
      )}

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
