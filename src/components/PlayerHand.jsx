import { Fragment } from "react";
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
}) => {
  return (
    <div
      className="player-hand"
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
      }}
    >
      {cards.map((card, index) => {
        const isSelected = (selectedCards || []).some((selected) => selected.id === card.id);
        const isSoparable = (soparableIds || []).includes(card.id);
        const showPlaceholderBefore =
          draggable &&
          dragIndex !== null &&
          dragOverIndex === index &&
          dragIndex !== index;

        return (
          <Fragment key={card.id}>
            {showPlaceholderBefore && <div className="drag-placeholder" />}
            <div
              className={`draggable-card ${dragIndex === index ? "dragging" : ""}`}
              draggable={!!draggable && !isFaceDown}
              onDragStart={() => draggable && onDragStart && onDragStart(index)}
              onDragOver={(e) => draggable && onDragOver && onDragOver(e, index)}
              onDrop={() => draggable && onDrop && onDrop(index)}
              onDragEnd={() => draggable && onDragEnd && onDragEnd()}
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
          </Fragment>
        );
      })}
      {draggable &&
        dragIndex !== null &&
        dragOverIndex === cards.length && <div className="drag-placeholder" />}
    </div>
  );
};

export default PlayerHand;