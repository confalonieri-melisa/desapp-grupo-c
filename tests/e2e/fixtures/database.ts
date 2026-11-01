import postgres from "postgres";
import type { TransactionSql } from "postgres";
import {
  E2E_CURRENT_QUOTE_DATE,
  E2E_EMAIL_DOMAIN,
  E2E_IDS,
  E2E_OLDER_QUOTE_DATE,
  E2E_PLAYERS,
  E2E_SOURCE,
  E2E_USERS,
} from "./data";

const emailPattern = `%@${E2E_EMAIL_DOMAIN}`;

export function e2eDatabaseUrl(): string {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) throw new Error("E2E_DATABASE_URL is required for E2E fixture setup");
  const parsed = new URL(value);
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!/e2e/i.test(databaseName)) throw new Error("E2E_DATABASE_URL must point to an E2E database");
  return value;
}

async function deleteFixtureRows(tx: TransactionSql): Promise<void> {
  await tx`
    DELETE FROM financial_audit_records
    WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
       OR operation_id IN (
         SELECT id FROM market_operations
         WHERE investor_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
            OR player_id IN (SELECT id FROM players WHERE source = ${E2E_SOURCE})
       )
  `;
  await tx`
    DELETE FROM market_operations
    WHERE investor_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
       OR player_id IN (SELECT id FROM players WHERE source = ${E2E_SOURCE})
  `;
  await tx`
    DELETE FROM token_holdings
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${emailPattern})
       OR player_id IN (SELECT id FROM players WHERE source = ${E2E_SOURCE})
  `;
  await tx`
    DELETE FROM player_quotes
    WHERE player_id IN (SELECT id FROM players WHERE source = ${E2E_SOURCE})
       OR strategy_version_id = ${E2E_IDS.strategy}
  `;
  await tx`DELETE FROM valuation_strategy_versions WHERE id = ${E2E_IDS.strategy}`;
  await tx`DELETE FROM players WHERE source = ${E2E_SOURCE}`;
  await tx`DELETE FROM users WHERE email LIKE ${emailPattern}`;
}

export async function seedE2EData(): Promise<void> {
  const sql = postgres(e2eDatabaseUrl(), { max: 1, prepare: false });
  try {
    await sql.begin(async (tx) => {
      const [otherActive] = await tx`
        SELECT id FROM valuation_strategy_versions
        WHERE is_active = 1 AND id <> ${E2E_IDS.strategy}
        LIMIT 1
      `;
      if (otherActive) throw new Error("E2E database contains another active valuation strategy");
      const [otherSuperuser] = await tx`
        SELECT id FROM users
        WHERE role = 'SUPERUSER' AND email NOT LIKE ${emailPattern}
        LIMIT 1
      `;
      if (otherSuperuser) throw new Error("E2E database contains another market pool account");

      await deleteFixtureRows(tx);

      for (const [user, role, balance] of [
        [E2E_USERS.investor, "INVESTOR", "1000.00"],
        [E2E_USERS.trader, "INVESTOR", "1000.00"],
        [E2E_USERS.superuser, "SUPERUSER", "10000.00"],
      ] as const) {
        await tx`
          INSERT INTO users (id, email, password, name, role, credit_balance)
          VALUES (${user.id}, ${user.email}, ${user.password}, ${user.name}, ${role}, ${balance})
        `;
      }

      for (const player of E2E_PLAYERS) {
        await tx`
          INSERT INTO players (id, source, external_id, name, team, league, position, statistics)
          VALUES (${player.id}, ${E2E_SOURCE}, ${player.externalId}, ${player.name},
                  ${player.team}, ${player.league}, ${player.position}, ${sql.json(player.statistics)})
        `;
      }

      await tx`
        INSERT INTO valuation_strategy_versions
          (id, strategy_code, version, configuration, is_active, created_by, activated_at)
        VALUES (${E2E_IDS.strategy}, 'INDIVIDUAL_PERFORMANCE', 'e2e-1',
                ${sql.json({})}, 1, ${E2E_USERS.superuser.id}, ${E2E_CURRENT_QUOTE_DATE})
      `;

      for (const [index, player] of E2E_PLAYERS.entries()) {
        const score = (0.90 - index * 0.02).toFixed(6);
        const price = (30 - index * 0.5).toFixed(2);
        const explanation = {
          strategyCode: "INDIVIDUAL_PERFORMANCE",
          version: "e2e-1",
          individual: [],
          team: [],
          missingMetrics: [],
          effectivePolicy: "INDIVIDUAL_ONLY",
          degraded: false,
        };
        await tx`
          INSERT INTO player_quotes
            (id, player_id, strategy_version_id, individual_score, final_score,
             quote_value, calculated_at, explanation)
          VALUES (${E2E_IDS.quotes[index]}, ${player.id}, ${E2E_IDS.strategy},
                  ${score}, ${score}, ${price}, ${E2E_CURRENT_QUOTE_DATE}, ${sql.json(explanation)})
        `;
      }
      await tx`
        INSERT INTO player_quotes
          (id, player_id, strategy_version_id, individual_score, final_score,
           quote_value, calculated_at, explanation)
        VALUES (${E2E_IDS.quotes[21]}, ${E2E_PLAYERS[0].id}, ${E2E_IDS.strategy},
                '0.750000', '0.750000', '25.00', ${E2E_OLDER_QUOTE_DATE},
                ${sql.json({ strategyCode: "INDIVIDUAL_PERFORMANCE", version: "e2e-1", individual: [], team: [], missingMetrics: [], effectivePolicy: "INDIVIDUAL_ONLY", degraded: false })})
      `;

      for (const [index, player] of E2E_PLAYERS.entries()) {
        await tx`
          INSERT INTO token_holdings (user_id, player_id, quantity, average_purchase_price)
          VALUES (${E2E_USERS.superuser.id}, ${player.id}, ${index === 0 ? 95 : 100}, '1.00')
        `;
      }
      await tx`
        INSERT INTO token_holdings (user_id, player_id, quantity, average_purchase_price)
        VALUES (${E2E_USERS.investor.id}, ${E2E_PLAYERS[0].id}, 5, '25.00')
      `;

      for (const [index, operationId] of E2E_IDS.operations.entries()) {
        const playerIndex = index % 2;
        const date = new Date(index < 11 ? "2026-10-20T12:00:00.000Z" : "2026-09-20T12:00:00.000Z");
        date.setUTCMinutes(index);
        await tx`
          INSERT INTO market_operations
            (id, type, investor_id, player_id, quote_id, quote_value, quantity, total, created_at)
          VALUES (${operationId}, ${index % 3 === 0 ? "SELL" : "BUY"},
                  ${E2E_USERS.investor.id}, ${E2E_PLAYERS[playerIndex].id},
                  ${E2E_IDS.quotes[playerIndex]}, '10.00', 1, '10.00', ${date})
        `;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function cleanE2EData(): Promise<void> {
  const sql = postgres(e2eDatabaseUrl(), { max: 1, prepare: false });
  try {
    await sql.begin(deleteFixtureRows);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
