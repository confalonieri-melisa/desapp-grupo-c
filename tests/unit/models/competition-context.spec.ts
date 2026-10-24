import { describe, expect, it } from "vitest";
import { League } from "@/backend/models/enums";
import { resolveTeamLink } from "@/backend/models/team-identity";

describe("competition context team association", () => {
  const base = {
    league: League.LA_LIGA,
    season: 2026,
    whoscoredTeamName: "Atlético de Madrid",
  };

  it("prefers an exact identity match", () => {
    expect(resolveTeamLink({
      ...base,
      candidates: [{ externalId: "10", name: "Atletico de Madrid" }],
    })?.footballDataTeamExternalId).toBe("10");
  });

  it("resolves known provider aliases and rejects ambiguity", () => {
    expect(resolveTeamLink({
      league: League.BUNDESLIGA,
      season: 2026,
      whoscoredTeamName: "RBL",
      candidates: [{ externalId: "20", name: "RB Leipzig" }],
    })?.footballDataTeamExternalId).toBe("20");
    expect(resolveTeamLink({
      ...base,
      candidates: [
        { externalId: "20", name: "Atletico Madrid" },
        { externalId: "21", name: "Atletico Madrid" },
      ],
    })).toBeNull();
  });

  it("resolves known provider naming differences automatically", () => {
    expect(resolveTeamLink({
      league: League.BUNDESLIGA,
      season: 2026,
      whoscoredTeamName: "RBL",
      candidates: [{ externalId: "721", name: "RB Leipzig" }],
    })?.footballDataTeamExternalId).toBe("721");
  });
});
