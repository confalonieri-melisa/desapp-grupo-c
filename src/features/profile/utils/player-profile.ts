import {League, Position} from "@/models/enums";
import type {PlayerStatistics} from "@/models/Player";

export const formatEnumLabel = (value: string) => value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatStatistic = (value: number | undefined) => value ?? "-";

export const summaryStatistics = [
    ["Apariciones", "appearances"],
    ["Minutos jugados", "minutesPlayed"],
    ["Goles", "goals"],
    ["Asistencias", "assists"],
] as const satisfies readonly [string, keyof PlayerStatistics][];

export const detailedStatistics = [
    ["Tiros por partido", "shotsPerGame"],
    ["Entradas por partido", "tacklesPerGame"],
    ["Inter. por partido", "interceptionsPerGame"],
    ["Faltas por partido", "foulsPerGame"],
    ["Tarjetas amarillas", "yellowCards"],
    ["Tarjetas rojas", "redCards"],
] as const satisfies readonly [string, keyof PlayerStatistics][];

export const leagueLabels: Record<League, string> = {
    [League.PREMIER_LEAGUE]: "Premier League",
    [League.BUNDESLIGA]: "Bundesliga",
    [League.LA_LIGA]: "La Liga",
    [League.SERIE_A]: "Serie A",
    [League.LIGUE_1]: "Ligue 1",
};

export const positionLabels: Record<Position, string> = {
    [Position.UNKNOWN]: "Sin posición",
    [Position.GOALKEEPER]: "Arquero",
    [Position.DEFENDER]: "Defensor",
    [Position.MIDFIELDER]: "Mediocampista",
    [Position.FORWARD]: "Delantero",
};
