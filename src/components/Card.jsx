const Card = ({ rank, suit, onClick, isSelected, isSoparable, isDrawn, isMustUse }) => {
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
      className={`card ${isSelected ? "selected" : ""} ${isSoparable ? "soparable" : ""} ${isDrawn ? "drawn" : ""} ${isJoker ? "joker" : ""} ${isMustUse ? "must-use" : ""}`}
      onClick={onClick}
      style={{
        borderColor: isMustUse ? "#f59e0b" : color,
        color: color,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {isMustUse && <div className="must-use-badge">USAR</div>}
      <div className="rank">{isJoker ? "★" : rank}</div>
      <div className="suit">{isJoker ? "JOKER" : suitSymbols[suit]}</div>
    </div>
  );
};

export default Card;