import { League, Position } from "../../../src/backend/models/enums";

const id = (suffix: number) => `00000000-0000-4000-8000-${suffix.toString(16).padStart(12, "0")}`;

export const E2E_SOURCE = "E2E";
export const E2E_EMAIL_DOMAIN = "e2e.mediocampo.test";
export const E2E_PASSWORD = "e2e-password";

export const E2E_IDS = {
  investor: id(0xe2e001),
  trader: id(0xe2e002),
  superuser: id(0xe2e003),
  strategy: id(0xe2e004),
  players: Array.from({ length: 21 }, (_, index) => id(0xe2e100 + index)),
  quotes: Array.from({ length: 22 }, (_, index) => id(0xe2e200 + index)),
  operations: Array.from({ length: 22 }, (_, index) => id(0xe2e300 + index)),
};

export const E2E_USERS = {
  investor: { id: E2E_IDS.investor, email: `investor@${E2E_EMAIL_DOMAIN}`, name: "E2E Investor", password: E2E_PASSWORD },
  trader: { id: E2E_IDS.trader, email: `trader@${E2E_EMAIL_DOMAIN}`, name: "E2E Trader", password: E2E_PASSWORD },
  superuser: { id: E2E_IDS.superuser, email: `superuser@${E2E_EMAIL_DOMAIN}`, name: "E2E Superuser", password: E2E_PASSWORD },
} as const;

const leagues = Object.values(League);
const positions = [Position.FORWARD, Position.GOALKEEPER, Position.MIDFIELDER, Position.DEFENDER];
const teams = ["E2E United", "E2E Athletic", "E2E City"];

export const E2E_PLAYERS = E2E_IDS.players.map((playerId, index) => ({
  id: playerId,
  externalId: `e2e-player-${String(index + 1).padStart(2, "0")}`,
  name: index === 0 ? "E2E Ada Striker" : index === 1 ? "E2E Beto Keeper" : `E2E Player ${String(index + 1).padStart(2, "0")}`,
  team: teams[index % teams.length],
  league: leagues[index % leagues.length],
  position: positions[index % positions.length],
  statistics: {
    appearances: 20 + index,
    minutesPlayed: 1500 + index * 10,
    rating: Number((7 + index / 100).toFixed(2)),
    goals: index + 1,
    assists: index % 7,
  },
}));

export const E2E_CURRENT_QUOTE_DATE = new Date("2026-10-25T12:00:00.000Z");
export const E2E_OLDER_QUOTE_DATE = new Date("2026-09-25T12:00:00.000Z");
