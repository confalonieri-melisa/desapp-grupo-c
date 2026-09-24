import { describe, expect, it } from "vitest";
import { getPlayerImage } from "@/utils/image-mapper";

describe("getPlayerImage", () => {
  it("returns the provided image URL when one exists", () => {
    const imageUrl = "https://example.com/player.png";

    expect(getPlayerImage("player-1", imageUrl)).toBe(imageUrl);
  });

  it("returns the same placeholder for the same player ID", () => {
    const firstResult = getPlayerImage("player-1");
    const secondResult = getPlayerImage("player-1");

    expect(firstResult).toBe(secondResult);
  });

  it("returns a placeholder when the image URL is undefined", () => {
    const result = getPlayerImage("player-1");

    expect(result).toEqual(expect.stringMatching(/\/src\/assets\/players\/[1-6]\.png$/));
  });

  it("maps different player IDs to available placeholders", () => {
    const results = new Set(
      ["player-1", "player-2", "player-3", "player-4", "player-5", "player-6"]
        .map((playerId) => getPlayerImage(playerId)),
    );

    expect(results.size).toBeGreaterThan(1);
    expect(results.size).toBeLessThanOrEqual(6);
  });
});
