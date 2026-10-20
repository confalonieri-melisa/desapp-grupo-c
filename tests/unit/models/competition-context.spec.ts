import { describe, expect, it } from "vitest";
import { League } from "@/backend/models/enums";
import { resolveConfirmedTeamLink } from "@/backend/models/competition-context";

describe("competition context team association", () => {
  const base = {
    league: League.LA_LIGA,
    season: 2026,
    whoscoredTeamName: "Atlético de Madrid",
  };

  it("prefers an exact identity match", () => {
    expect(resolveConfirmedTeamLink({
      ...base,
      candidates: [{ externalId: "10", name: "Atletico de Madrid" }],
    })?.footballDataTeamExternalId).toBe("10");
  });

  it("accepts a validated alias and rejects ambiguity", () => {
    expect(resolveConfirmedTeamLink({
      ...base,
      candidates: [{ externalId: "20", name: "Atletico Madrid" }],
      validatedAliases: { atleticodemadrid: "20" },
    })?.footballDataTeamExternalId).toBe("20");
    expect(resolveConfirmedTeamLink({
      ...base,
      candidates: [
        { externalId: "20", name: "Atletico Madrid" },
        { externalId: "21", name: "Atletico Madrid" },
      ],
    })).toBeNull();
  });
});
