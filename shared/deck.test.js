import { describe, it, expect } from "vitest";
import { generateDeck, shuffleDeck } from "./deck.js";

describe("deck", () => {
  it("generates 108 cards", () => {
    const deck = generateDeck();
    expect(deck).toHaveLength(108);
  });

  it("contains exactly 4 jokers", () => {
    const deck = generateDeck();
    expect(deck.filter((c) => c.rank === "JOKER")).toHaveLength(4);
  });

  it("contains 8 copies of each non-joker rank/suit combination (2 decks)", () => {
    const deck = generateDeck();
    const target = deck.filter((c) => c.rank === "A" && c.suit === "hearts");
    expect(target).toHaveLength(2);
  });

  it("shuffle keeps length and elements", () => {
    const deck = generateDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
    expect(shuffled.map((c) => c.id).sort()).toEqual(deck.map((c) => c.id).sort());
  });
});