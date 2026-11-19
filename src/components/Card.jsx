const Card = ({ rank, suit, onClick, isSelected }) => {
  const isJoker = rank === "JOKER";

  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  const suitColors = {
    hearts: "red",
    diamonds: "red",
    clubs: "black",
    spades: "black",
  };

  const color = isJoker ? "purple" : suitColors[suit];

  return (
    <div
      className={`card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      style={{
        borderColor: color,
        color: color,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="rank">{isJoker ? "★" : rank}</div>
      <div className="suit">{isJoker ? "JOKER" : suitSymbols[suit]}</div>
    </div>
  );
};

export default Card;
