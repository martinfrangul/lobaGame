const Card = ({ rank, suit, onClick, isSelected }) => {
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

  console.log("Rendering card:", { rank, suit }); // Verifica los valores de rank y sui

  return (
    <div
      className={`card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      style={{
        borderColor: suitColors[suit],
        color: suitColors[suit],
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div className="rank">{rank}</div>
      <div className="suit">{suitSymbols[suit]}</div>
    </div>
  );
};

export default Card;
