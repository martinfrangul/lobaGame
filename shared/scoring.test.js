import { describe, it, expect } from "vitest";
import { sumHandValue, sumCombinationValue } from "./scoring.js";

describe("scoring", () => {
  it("sumHandValue sums card values", () => {
    const hand = [
      { rank: "A", suit: "hearts" },
      { rank: "5", suit: "clubs" },
      { rank: "JOKER", suit: null },
    ];
    // A=15, 5=5, JOKER=25 => 45
    expect(sumHandValue(hand)).toBe(45);
  });

  it("sumCombinationValue sums meld cards", () => {
    const combs = [
      {
        cards: [
          { rank: "K", suit: "spades" },
          { rank: "K", suit: "hearts" },
          { rank: "K", suit: "clubs" },
        ],
      },
    ];
    expect(sumCombinationValue(combs)).toBe(30);
  });

  it("handles empty", () => {
    expect(sumHandValue([])).toBe(0);
    expect(sumCombinationValue([])).toBe(0);
  });
});