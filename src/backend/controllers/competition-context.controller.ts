import { competitionContextRequestSchema } from "@/backend/schemas/football-data.schema";
import { validate } from "@/backend/utils/validate";
import { CompetitionContextService } from "@/backend/services/competition-context.service";

export class CompetitionContextController {
  constructor(private readonly service: CompetitionContextService) {}

  async update(input: unknown, requestedBy: string) {
    const { season } = validate(competitionContextRequestSchema, input);
    return this.service.update(season, requestedBy);
  }
}
