import { FootballDataAdapter } from "@/backend/adapters/football-data.adapter";
import { competitionContextRequestSchema } from "@/backend/schemas/football-data.schema";
import { validate } from "@/backend/utils/validate";
import { CompetitionContextService } from "@/backend/services/competition-context.service";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";

export class CompetitionContextController {
  constructor(
    private readonly service = new CompetitionContextService(
      new FootballDataAdapter(),
      new CompetitionContextRepository(),
    ),
  ) {}

  async update(input: unknown, requestedBy: string) {
    const { season } = validate(competitionContextRequestSchema, input);
    return this.service.update(season, requestedBy);
  }
}
