import { useState } from "react";
import PlayerHand from "./PlayerHand";
import Card from "./Card";
import DiscardPile from "./DiscardPile";
import { isSoparable } from "@shared";

const OnlineGameTable = ({ game }) => {
  const {
    publicState,
    privateHand,
    room,
    socketId,
    draw,
    discard,
    drop,
    layoff,
    sopar,
    substitute,
    moveJoker,
    chooseJoker,
    chooseMove,
    sort,
    promptJoker,
    promptMove,
    cancelPrompt,
    error,
    clearError,
  } = game;

  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedMeld, setSelectedMeld] = useState(null);

  if (!publicState) {
    return <div className="game-table setup-screen"><p>Esperando estado...</p></div>;
  }

  const players = publicState.players || [];
  const roomPlayers = room?.players || [];
  const myIndex = roomPlayers.findIndex((p) => p.socketId === socketId);
  const me = myIndex >= 0 ? players[myIndex] : null;
  const currentTurn = publicState.currentTurn;
  const jokerMode = publicState.config?.jokerMode || "fixed";

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

  const handleDraw = (source) => {
    draw(source);
    setSelectedCards([]);
  };

  const handleDiscard = () => {
    if (!publicState.cardDrawn) {
      alert("Primero debes tomar una carta.");
      return;
    }
    if ((publicState.pendingJokers || 0) > 0) {
      alert("Debes jugar el comodín recuperado antes de descartar.");
      return;
    }
    if (selectedCards.length !== 1) {
      alert("Debes seleccionar exactamente una carta para descartar.");
      return;
    }
    discard(selectedCards[0].id);
    setSelectedCards([]);
  };

  const handleDrop = () => {
    if (selectedCards.length < 3) {
      alert("Necesitas al menos 3 cartas para formar una combinación.");
      return;
    }
    drop(selectedCards.map((c) => c.id));
    setSelectedCards([]);
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
    layoff(selectedCards.map((c) => c.id), selectedMeld, null);
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleSopar = () => {
    if (selectedCards.length === 0) {
      alert("Selecciona las cartas que quieres sopar.");
      return;
    }
    const ok = selectedCards.every((c) => isSoparable(c, players));
    if (!ok) {
      alert("Solo se pueden sopar cartas idénticas a una pierna en mesa.");
      return;
    }
    sopar(selectedCards.map((c) => c.id));
    setSelectedCards([]);
  };

  const handleSubstitute = () => {
    if (jokerMode !== "mobile") {
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
    substitute(selectedCards[0].id, selectedMeld, null);
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleMoveJoker = () => {
    if (jokerMode !== "mobile") {
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
    moveJoker(selectedCards[0].id, selectedMeld);
    setSelectedCards([]);
    setSelectedMeld(null);
  };

  const handleSort = (mode) => {
    sort(mode);
  };

  const soparableIds = privateHand
    .filter((c) => isSoparable(c, players))
    .map((c) => c.id);

  const isMyTurn = myIndex >= 0 && myIndex === currentTurn;

  return (
    <div className="game-table layout-3-4">
      {publicState.gameOver && <h1>¡Juego terminado!</h1>}

      {error && (
        <div className="modal-overlay">
          <div className="modal setup-card">
            <p>{error}</p>
            <button onClick={clearError}>Cerrar</button>
          </div>
        </div>
      )}

      <header className="top-bar">
        <span className="turn-indicator">Turno: {players[currentTurn]?.name}</span>
        <span className="thinking-slot" />
        <button className="icon-btn" onClick={() => {}} title="Leyenda">❓</button>
      </header>

      <div className="center-area">
        <div className="deck-row">
          <span className="deck-label">Mazo</span>
          <button
            className="icon-btn"
            onClick={() => handleDraw("deck")}
            disabled={!isMyTurn || publicState.cardDrawn}
            title="Robar del mazo"
          >
            🂠
          </button>
          <DiscardPile topCard={publicState.discardPile?.[publicState.discardPile.length - 1]} />
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
                    onClick={() => isMyTurn && handleMeldClick(pIndex, meldIndex)}
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

      <div className="opponents-layer">
        {players.map((p, i) => {
          if (i === myIndex) return null;
          let posClass = "pos-right";
          if (players.length === 2) posClass = "pos-top";
          else if (i === 2 && myIndex !== 2) posClass = "pos-top";
          else if (i === 3) posClass = "pos-left";
          return (
            <div key={i} className={`opponent-badge ${posClass} ${i === currentTurn ? "active" : ""}`}>
              <span className="opp-deck">🂠</span>
              <span className="opp-count">{p.handCount}</span>
              <span className="opp-name">{p.name}</span>
            </div>
          );
        })}
      </div>

      <section className="bottom-area current-turn">
        {me && (
          <>
            <PlayerHand
              cards={privateHand}
              selectedCards={selectedCards}
              onCardSelect={isMyTurn ? handleCardSelect : undefined}
              isFaceDown={false}
              soparableIds={soparableIds}
              lastDrawnCardId={null}
              onSort={isMyTurn ? handleSort : undefined}
              draggable={false}
              onDragStart={() => {}}
              onDragOver={() => {}}
              onDrop={() => {}}
              onDragEnd={() => {}}
              dragIndex={null}
              dragOverIndex={null}
            />
            {isMyTurn && (
              <div className="actions">
                <button className="icon-btn" onClick={() => handleDraw("deck")} disabled={publicState.cardDrawn} title="Robar del mazo">🂠</button>
                <button className="icon-btn" onClick={() => handleDraw("discardPile")} disabled={publicState.cardDrawn || (publicState.discardPile?.length || 0) === 0} title="Robar del pozo">📥</button>
                <button className="icon-btn" onClick={handleDrop} title="Bajar combinación">➕</button>
                <button className="icon-btn" onClick={handleLayoff} disabled={!selectedMeld} title="Agregar a combinación">📎</button>
                <button className="icon-btn" onClick={handleSopar} title="Sopar seleccionadas">💨</button>
                {jokerMode === "mobile" && (
                  <>
                    <button className="icon-btn" onClick={handleSubstitute} title="Sustituir comodín">🔄</button>
                    <button className="icon-btn" onClick={handleMoveJoker} title="Reemplazar y mover comodín">↔️</button>
                  </>
                )}
                <button className="icon-btn" onClick={handleDiscard} title="Descartar">🗑️</button>
              </div>
            )}
          </>
        )}
      </section>

      {promptJoker && (
        <div className="modal-overlay">
          <div className="modal setup-card">
            <h2>Elegir valor del comodín</h2>
            <p>Hay varias interpretaciones válidas. Elige una:</p>
            <div className="joker-choice-options">
              {promptJoker.options.map((opt, idx) => {
                const jokers = (promptJoker.cards || []).filter((c) => c.rank === "JOKER");
                return (
                  <button
                    key={idx}
                    className="setup-option"
                    onClick={() => chooseJoker(opt)}
                  >
                    {jokers.map((j) => opt[j.id]).join(" / ")}
                  </button>
                );
              })}
            </div>
            <button className="setup-option" onClick={cancelPrompt}>Cancelar</button>
          </div>
        </div>
      )}

      {promptMove && (
        <div className="modal-overlay">
          <div className="modal setup-card">
            <h2>Mover comodín</h2>
            <p>Elige hacia dónde mover el comodín:</p>
            <div className="joker-choice-options">
              <button className="setup-option" onClick={() => chooseMove("left")}>
                Izquierda ({promptMove.leftRank})
              </button>
              <button className="setup-option" onClick={() => chooseMove("right")}>
                Derecha ({promptMove.rightRank})
              </button>
            </div>
            <button className="setup-option" onClick={cancelPrompt}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineGameTable;