import Card from "./Card";

const CombinationBoard = ({ combinations }) => {
  return (
    <div className="combination-board">
      {combinations.map((combination, index) => (
        <div key={index} className="combination">
          {combination.map((card, i) => (
            <Card key={i} rank={card.rank} suit={card.suit} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CombinationBoard;
