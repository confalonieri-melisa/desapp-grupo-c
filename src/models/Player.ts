import { isOfficialLeague, isPosition, League, Position } from "./enums";
import { DomainValidationError, InvalidLeagueError } from "./errors";

export type PlayerStatistics = Record<string, number>;

export interface PlayerProps {
  id?: string;
  name: string;
  team: string;
  league: League;
  position: Position;
  statistics?: PlayerStatistics;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Football player aggregate with catalogue invariants. */
export class Player {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly league: League;
  readonly position: Position;
  readonly statistics: PlayerStatistics;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PlayerProps) {
    if (!props.name.trim() || !props.team.trim()) {
      throw new DomainValidationError("Player name and team are required");
    }

    if (!isOfficialLeague(props.league)) {
      throw new InvalidLeagueError(String(props.league));
    }

    if (!isPosition(props.position)) {
      throw new DomainValidationError("Invalid player position");
    }

    const statistics = props.statistics ?? {};
    Player.validateStatistics(statistics);

    this.id = props.id ?? crypto.randomUUID();
    this.name = props.name.trim();
    this.team = props.team.trim();
    this.league = props.league;
    this.position = props.position;
    this.statistics = { ...statistics };
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? this.createdAt;
  }

  private static validateStatistics(statistics: PlayerStatistics): void {
    for (const [metric, value] of Object.entries(statistics)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new DomainValidationError(
          `Statistic must be a non-negative number: ${metric}`,
        );
      }
    }
  }
}
