import { isOfficialLeague, League, Position } from "./enums";
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
    if (!isOfficialLeague(props.league)) {
      throw new InvalidLeagueError(String(props.league));
    }

    const statistics = props.statistics ?? {};
    Player.validateStatistics(statistics);

    this.id = props.id ?? crypto.randomUUID();
    this.name = props.name;
    this.team = props.team;
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
