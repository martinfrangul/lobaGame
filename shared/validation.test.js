import { describe, it, expect } from "vitest";
import {
  isValidCombination,
  possibleJokerAssignments,
  possibleAssignmentsForCards,
  isSoparable,
} from "./validation.js";

describe("isValidCombination", () => {
  it("validates a group of 3 same rank different suits", () => {
    const cards = [
      { id: 1, rank: "7", suit: "hearts" },
      { id: 2, rank: "7", suit: "clubs" },
      { id: 3, rank: "7", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(true);
  });

  it("rejects group with repeated suit", () => {
    const cards = [
      { id: 1, rank: "7", suit: "hearts" },
      { id: 2, rank: "7", suit: "hearts" },
      { id: 3, rank: "7", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(false);
  });

  it("validates a straight of 3 same suit", () => {
    const cards = [
      { id: 1, rank: "4", suit: "spades" },
      { id: 2, rank: "5", suit: "spades" },
      { id: 3, rank: "6", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(true);
  });

  it("validates J-Q-K-A as high ace straight", () => {
    const cards = [
      { id: 1, rank: "J", suit: "spades" },
      { id: 2, rank: "Q", suit: "spades" },
      { id: 3, rank: "K", suit: "spades" },
      { id: 4, rank: "A", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(true);
  });

  it("validates Q-K-A as high ace straight", () => {
    const cards = [
      { id: 1, rank: "Q", suit: "spades" },
      { id: 2, rank: "K", suit: "spades" },
      { id: 3, rank: "A", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(true);
  });

  it("rejects K-A-2 wrap-around", () => {
    const cards = [
      { id: 1, rank: "K", suit: "spades" },
      { id: 2, rank: "A", suit: "spades" },
      { id: 3, rank: "2", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(false);
  });

  it("rejects straight with adjacent jokers", () => {
    const cards = [
      { id: 1, rank: "4", suit: "spades" },
      { id: 2, rank: "JOKER", suit: null },
      { id: 3, rank: "JOKER", suit: null },
      { id: 4, rank: "7", suit: "spades" },
    ];
    // two jokers adjacent internally -> invalid
    expect(isValidCombination(cards)).toBe(false);
  });

  it("requires at least 3 cards", () => {
    const cards = [
      { id: 1, rank: "4", suit: "spades" },
      { id: 2, rank: "5", suit: "spades" },
    ];
    expect(isValidCombination(cards)).toBe(false);
  });
});

describe("possibleJokerAssignments", () => {
  it("returns [{}] when no jokers", () => {
    const cards = [
      { id: 1, rank: "4", suit: "spades" },
      { id: 2, rank: "5", suit: "spades" },
      { id: 3, rank: "6", suit: "spades" },
    ];
    expect(possibleJokerAssignments(cards)).toEqual([{}]);
  });
});

describe("possibleAssignmentsForCards", () => {
  it("returns assignments for joker straight", () => {
    const cards = [
      { id: 1, rank: "4", suit: "spades" },
      { id: 2, rank: "JOKER", suit: null },
      { id: 3, rank: "6", suit: "spades" },
    ];
    const opts = possibleAssignmentsForCards(cards, {});
    expect(opts.length).toBeGreaterThan(0);
  });
});

describe("isSoparable", () => {
  it("true when an identical natural card exists in a group meld", () => {
    const players = [
      {
        combinations: [
          {
            cards: [
              { id: 10, rank: "7", suit: "hearts" },
              { id: 11, rank: "7", suit: "clubs" },
              { id: 12, rank: "7", suit: "spades" },
            ],
          },
        ],
      },
    ];
    expect(isSoparable({ rank: "7", suit: "hearts" }, players)).toBe(true);
  });

  it("false when no matching meld", () => {
    const players = [{ combinations: [] }];
    expect(isSoparable({ rank: "7", suit: "hearts" }, players)).toBe(false);
  });
});