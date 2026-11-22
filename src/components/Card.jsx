const Card = ({ rank, suit, onClick, isSelected, isSoparable, isDrawn }) => {
  const isJoker = rank === "JOKER";

  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  const suitColors = {
    hearts: "#e11d48",
    diamonds: "#e11d48",
    clubs: "#111827",
    spades: "#111827",
  };

  const color = isJoker ? "#7c3aed" : suitColors[suit] || "#374151";

  return (
    <div
      className={`card ${isSelected ? "selected" : ""} ${isSoparable ? "soparable" : ""} ${isDrawn ? "drawn" : ""} ${isJoker ? "joker" : ""}`}
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