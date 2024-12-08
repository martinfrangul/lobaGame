import { useState, useEffect } from "react";
import PlayerHand from "./PlayerHand";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import { useGameContext } from "../context/gameState";
import { isValidCombination } from "../utils/gameUtils";

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

  // Reparte 9 cartas a todos los jugadores al inicio
  useEffect(() => {
    const tempDeck = [...deck];
    const newPlayers = players.map((player) => ({
      ...player,
      hand: tempDeck.splice(0, 9), // Tomar 9 cartas para cada jugador
      combinations: [], // Inicializamos las combinaciones como array vacío
    }));
    setPlayers(newPlayers);
    setDeck(tempDeck); // Actualizar el mazo restante
  }, []);
  

  const handleCardSelect = (card) => {
    setSelectedCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  };
  
  const orderCards = (cards) => {
    const rankOrder = {
      A: 1,  // Por defecto, el As es el más bajo
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
  
    // Determinar si el As debe ser alto o bajo
    const hasKing = cards.some((card) => card.rank === "K");
    if (hasKing) {
      rankOrder["A"] = 14; // Si hay una K, el As se considera como el más alto
    }
  
    return [...cards].sort((a, b) => {
      const rankA = rankOrder[a.rank];
      const rankB = rankOrder[b.rank];
      return rankA - rankB;
    });
  };
  
  const handleDropCombination = () => {
    if (selectedCards.length < 3) {
      alert("Necesitas al menos 3 cartas para formar una combinación.");
      return;
    }
  
    if (isValidCombination(selectedCards)) {
      const orderedCombination = orderCards(selectedCards); // Ordenamos las cartas
  
      const updatedPlayers = players.map((player, index) => {
        if (index === currentTurn) {
          return {
            ...player,
            hand: player.hand.filter(
              (card) =>
                !selectedCards.some((selected) => selected.id === card.id)
            ),
            combinations: [...player.combinations, orderedCombination], // Guardar la combinación ordenada
          };
        }
        return player;
      });
  
      setPlayers(updatedPlayers);
      setSelectedCards([]);
    } else {
      alert("Combinación inválida");
      setSelectedCards([]);
    }
  };
  

  const handleDrawCard = (source) => {
    if (cardDrawn) {
      alert("Ya has tomado una carta este turno.");
      return;
    }

    let card;
    if (source === "deck") {
      if (deck.length === 0) {
        alert("El mazo está vacío.");
        return;
      }
      card = deck.pop();
      setDeck([...deck]);
    } else if (source === "discardPile") {
      if (discardPile.length === 0) {
        alert("El pozo está vacío.");
        return;
      }
      card = discardPile.pop();
      setDiscardPile([...discardPile]);
    }

    if (card) {
      players[currentTurn].hand.push(card);
      setPlayers([...players]);
      setCardDrawn(true);
    }
  };

  const handleDiscard = () => {
    if (!cardDrawn) {
      alert("Primero debes tomar una carta.");
      return;
    }

    if (selectedCards.length !== 1) {
      alert("Debes seleccionar exactamente una carta para descartar.");
      return;
    }

    const cardToDiscard = selectedCards[0];
    setDiscardPile([...discardPile, cardToDiscard]);

    const newHand = players[currentTurn].hand.filter(
      (card) => card.id !== cardToDiscard.id
    );

    players[currentTurn].hand = newHand;
    setPlayers([...players]);

    if (newHand.length === 0) {
      setGameOver(true);
      alert(`¡${players[currentTurn].name} ha ganado!`);
      return;
    }

    setCardDrawn(false);
    setSelectedCards([]);
    setCurrentTurn((currentTurn + 1) % players.length);
  };

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
            {player?.combinations?.map((combination, combIndex) => (
              <div key={combIndex} className="combination">
                {combination.map((card) => (
                  <Card
                    key={card.id}
                    rank={card.rank} // Mostrará el número o letra de la carta
                    suit={card.suit} // Mostrará el ícono correspondiente
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameTable;
