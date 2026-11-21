import { useRef, useState } from "react";
import Card from "./Card";

const PlayerHand = ({
  cards,
  onCardSelect,
  selectedCards,
  isFaceDown,
  soparableIds,
  lastDrawnCardId,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragIndex,
  dragOverIndex,
  onSort,
}) => {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const targetIndexRef = useRef(null);
  const [indicatorLeft, setIndicatorLeft] = useState(null);

  const computeTargetIndex = (clientX) => {
    if (!containerRef.current) return cards.length;
    const containerRect = containerRef.current.getBoundingClientRect();
    if (clientX <= containerRect.left) return 0;
    if (clientX >= containerRect.right) return cards.length;
    for (let i = 0; i < cards.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      if (clientX < mid) return i;
    }
    return cards.length;
  };

  const updateIndicator = (clientX) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const idx = computeTargetIndex(clientX);
    targetIndexRef.current = idx;
    // posición del indicador
    let left = 0;
    if (idx >= cards.length) {
      left = containerRect.width;
    } else {
      const el = cardRefs.current[idx];
      if (el) {
        const r = el.getBoundingClientRect();
        left = r.left - containerRect.left;
      }
    }
    setIndicatorLeft(left);
    if (onDragOver) onDragOver(null, idx);
  };

  return (
    <div className="hand-wrapper">
      {draggable && onSort && (
        <div className="hand-toolbar">
          <button className="icon-btn" onClick={() => onSort("suit")} title="Ordenar por palo">
            ♠️
          </button>
          <button className="icon-btn" onClick={() => onSort("rank")} title="Ordenar por número">
            🔢
          </button>
          <button className="icon-btn" onClick={() => onSort("random")} title="Ordenar aleatorio">
            🎲
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="player-hand drag-container"
        onDragOver={(e) => {
          if (!draggable) return;
          e.preventDefault();
          updateIndicator(e.clientX);
        }}
        onDrop={(e) => {
          if (!draggable) return;
          e.preventDefault();
          const idx = targetIndexRef.current;
          if (onDrop) onDrop(idx);
          targetIndexRef.current = null;
          setIndicatorLeft(null);
        }}
        onDragLeave={() => {
          setIndicatorLeft(null);
        }}
      >
        {cards.map((card, index) => {
          const isSelected = (selectedCards || []).some((selected) => selected.id === card.id);
          const isSoparable = (soparableIds || []).includes(card.id);
          return (
            <div
              key={card.id}
              ref={(el) => (cardRefs.current[index] = el)}
              className={`draggable-card ${dragIndex === index ? "dragging" : ""}`}
              draggable={!!draggable && !isFaceDown}
              onDragStart={() => draggable && onDragStart && onDragStart(index)}
              onDragEnd={() => {
                if (draggable && onDragEnd) onDragEnd();
                setIndicatorLeft(null);
              }}
            >
              <Card
                rank={isFaceDown ? "?" : card.rank}
                suit={isFaceDown ? "" : card.suit}
                onClick={isFaceDown ? null : () => onCardSelect && onCardSelect(card)}
                isSelected={isSelected}
                isSoparable={isSoparable}
                isDrawn={lastDrawnCardId === card.id}
              />
            </div>
          );
        })}
        {draggable && indicatorLeft !== null && (
          <div className="drag-indicator" style={{ left: `${indicatorLeft}px` }} />
        )}
      </div>
    </div>
  );
};

export default PlayerHand;