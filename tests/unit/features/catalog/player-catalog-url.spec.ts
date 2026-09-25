import { describe, expect, it } from "vitest";
import { League, Position } from "@/models/enums";
import {
  emptyPlayerCatalogFilters,
  parsePlayerCatalogFilters,
  parsePlayerCatalogPage,
  serializePlayerCatalogFilters,
} from "@/features/catalog/utils/player-catalog-url";

describe("player catalog URL filters", () => {
  it("parses valid filters and ignores invalid enum values", () => {
    expect(parsePlayerCatalogFilters(new URLSearchParams(
      "league=BUNDESLIGA&team=Schalke&position=DEFENDER",
    ))).toEqual({
      league: League.BUNDESLIGA,
      team: "Schalke",
      position: Position.DEFENDER,
    });

    expect(parsePlayerCatalogFilters(new URLSearchParams(
      "league=INVALID&position=INVALID",
    ))).toEqual(emptyPlayerCatalogFilters);
  });

  it("uses empty values when filters are absent", () => {
    expect(parsePlayerCatalogFilters(new URLSearchParams())).toEqual(
      emptyPlayerCatalogFilters,
    );
  });

  it("serializes only active filters", () => {
    expect(serializePlayerCatalogFilters({
      league: League.BUNDESLIGA,
      team: "",
      position: Position.DEFENDER,
    })).toBe("league=BUNDESLIGA&position=DEFENDER");
  });

  it("preserves an active team filter", () => {
    expect(serializePlayerCatalogFilters({
      league: "",
      team: "Paris FC",
      position: "",
    })).toBe("team=Paris+FC");
  });

  it("serializes an empty query when no filters are active", () => {
    expect(serializePlayerCatalogFilters(emptyPlayerCatalogFilters)).toBe("");
  });

  it("parses valid and invalid pages", () => {
    expect(parsePlayerCatalogPage(new URLSearchParams("page=3"))).toBe(3);
    expect(parsePlayerCatalogPage(new URLSearchParams("page=0"))).toBe(1);
    expect(parsePlayerCatalogPage(new URLSearchParams("page=invalid"))).toBe(1);
    expect(parsePlayerCatalogPage(new URLSearchParams())).toBe(1);
  });

  it("serializes the page only when it is greater than one", () => {
    expect(serializePlayerCatalogFilters(emptyPlayerCatalogFilters, 1)).toBe("");
    expect(serializePlayerCatalogFilters(emptyPlayerCatalogFilters, 3)).toBe("page=3");
  });
});
