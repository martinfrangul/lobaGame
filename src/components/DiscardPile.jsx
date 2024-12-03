import Card from "./Card";

const DiscardPile = ({ topCard, onTakeDiscard }) => {
  return (
    <div className="discard-pile" onClick={onTakeDiscard}>
      {topCard ? (
        <Card rank={topCard.rank} suit={topCard.suit} />
      ) : (
        <div className="empty-pile">Pila vacía</div>
      )}
    </div>
  );
};

export default DiscardPile;
