import { describe, it, expect } from "vitest";
import { startGame, startNewRound, computeEndRound } from "./rounds.js";

describe("rounds", () => {
  it("startGame deals 9 cards to each player", () => {
    const res = startGame({ playerCount: 2 });
    expect(res.players).toHaveLength(2);
    expect(res.players[0].hand).toHaveLength(9);
    expect(res.players[1].hand).toHaveLength(9);
    expect(res.discardPile).toHaveLength(1);
    // 108 - 18 - 1 = 89
    expect(res.deck).toHaveLength(89);
  });

  it("startGame supports 4 players", () => {
    const res = startGame({ playerCount: 4 });
    expect(res.players).toHaveLength(4);
    res.players.forEach((p) => expect(p.hand).toHaveLength(9));
  });

  it("startNewRound resets combinations", () => {
    const players = [
      { name: "Jugador 1", hand: [], points: 10, combinations: [{ cards: [] }], eliminated: false, reenganches: 0 },
      { name: "Jugador 2", hand: [], points: 5, combinations: [], eliminated: false, reenganches: 0 },
    ];
    const res = startNewRound(0, players);
    expect(res.players[0].combinations).toEqual([]);
    expect(res.players[0].hand).toHaveLength(9);
    expect(res.currentTurn).toBe(0);
  });

  it("computeEndRound menos eliminates at 101 and wins last standing", () => {
    const players = [
      { name: "P1", hand: [], points: 0, combinations: [], eliminated: false, reenganches: 0 },
      { name: "P2", hand: [{ rank: "K", suit: "spades" }], points: 100, combinations: [], eliminated: false, reenganches: 0 },
    ];
    // P1 wins round (salio), P2 gets hand value 10 -> 110 >=101 eliminated
    const res = computeEndRound(players, 0, "menos");
    expect(res.players[1].eliminated).toBe(true);
    expect(res.gameOver).toBe(true);
    expect(res.winnerName).toBe("P1");
  });

  it("computeEndRound mas reaches 150", () => {
    const players = [
      { name: "P1", hand: [], points: 140, combinations: [{ cards: [{ rank: "K", suit: "spades" }, { rank: "K", suit: "hearts" }, { rank: "K", suit: "clubs" }] }], eliminated: false, reenganches: 0 },
      { name: "P2", hand: [], points: 0, combinations: [], eliminated: false, reenganches: 0 },
    ];
    const res = computeEndRound(players, 0, "mas");
    // P1: 140 + 30 + 5 = 175
    expect(res.players[0].points).toBe(175);
    expect(res.gameOver).toBe(true);
    expect(res.winnerName).toBe("P1");
  });
});