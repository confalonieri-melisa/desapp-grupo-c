import { describe, expect, it } from "vitest";
import { League } from "@/backend/models/enums";
import {
  formatEnumLabel,
  leagueLabels,
} from "@/frontend/utils/player-labels";
import {
  detailedStatistics,
  summaryStatistics,
} from "@/frontend/features/profile/utils/player-profile";

describe("player labels", () => {
  it("formats enum values for display", () => {
    expect(formatEnumLabel("PREMIER_LEAGUE")).toBe("Premier League");
  });

  it("exposes the supported league labels", () => {
    expect(leagueLabels[League.LA_LIGA]).toBe("La Liga");
  });

  it("defines the profile statistic keys", () => {
    expect(summaryStatistics).toEqual(
      expect.arrayContaining([
        ["Apariciones", "appearances"],
        ["Goles", "goals"],
      ]),
    );
    expect(detailedStatistics).toEqual(
      expect.arrayContaining([
        ["Tiros por partido", "shotsPerGame"],
        ["Tarjetas rojas", "redCards"],
      ]),
    );
  });
});
