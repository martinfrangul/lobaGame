const VictoryScreen = ({ winnerName, players, roundHistory, gameMode, onPlayAgain, onMenu }) => {
  const sorted = [...(players || [])].sort((a, b) => a.points - b.points);
  return (
    <div className="victory-screen">
      <div className="victory-card">
        <div className="victory-trophy">🏆</div>
        <h1 className="victory-title">VICTORIA</h1>
        <h2 className="victory-winner">{winnerName}</h2>
        <p className="victory-subtitle">
          {gameMode === "mas" ? "Loba de Más" : "Loba de Menos"} · {roundHistory?.length || 0} manos
        </p>

        <div className="victory-podium">
          {sorted.map((p, i) => (
            <div key={i} className={`victory-player ${i === 0 ? "first" : ""} ${p.eliminated ? "eliminated" : ""}`}>
              <span className="victory-rank">{i + 1}</span>
              <span className="victory-name">{p.name}</span>
              <span className="victory-points">{p.points} pts</span>
            </div>
          ))}
        </div>

        {roundHistory && roundHistory.length > 0 && (
          <div className="victory-history">
            <h3>Historial de manos</h3>
            <div className="victory-history-list">
              {roundHistory.map((r, i) => (
                <div key={i} className="victory-history-row">
                  <span className="vh-index">#{i + 1}</span>
                  <span className="vh-winner">{r.winnerName}</span>
                  <span className="vh-points">
                    {r.players.map((p, j) => `${p.name}: +${r.deltas[j]}`).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="victory-actions">
          <button className="start-button" onClick={onPlayAgain}>Jugar de nuevo</button>
          <button className="setup-option" onClick={onMenu}>Menú</button>
        </div>
      </div>
    </div>
  );
};

export default VictoryScreen;