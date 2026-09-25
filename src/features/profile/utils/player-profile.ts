import type {PlayerStatistics} from "@/models/Player";
export { formatEnumLabel, leagueLabels } from "@/utils/player-labels";

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
