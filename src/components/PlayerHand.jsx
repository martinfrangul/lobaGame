import Card from "./Card";

const PlayerHand = ({ cards, onCardSelect, selectedCards, isFaceDown, soparableIds, lastDrawnCardId }) => {
  return (
    <div className="player-hand">
      {cards.map((card) => {
        const isSelected = selectedCards.some((selected) => selected.id === card.id);
        const isSoparable = (soparableIds || []).includes(card.id);
        return (
          <Card
            key={card.id} // Clave única basada en el ID
            rank={isFaceDown ? "?" : card.rank}
            suit={isFaceDown ? "" : card.suit}
            onClick={isFaceDown ? null : () => onCardSelect(card)}
            isSelected={isSelected} // Selección basada en ID único
            isSoparable={isSoparable}
            isDrawn={lastDrawnCardId === card.id}
          />
        );
      })}
    </div>
  );
};

export default PlayerHand;
