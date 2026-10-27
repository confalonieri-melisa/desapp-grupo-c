import "dotenv/config";
import postgres from "postgres";

// Local UI fixture. These are simulated values, never historical market data.
const fixture = "demo-quote-history-v1";
const slots = [
  { name: "d90", daysBefore: 90, hour: 12, scoreChange: -0.11 },
  { name: "d45-morning", daysBefore: 45, hour: 10, scoreChange: -0.04 },
  { name: "d45-evening", daysBefore: 45, hour: 18, scoreChange: 0.015 },
  { name: "d7", daysBefore: 7, hour: 12, scoreChange: 0.06 },
] as const;

async function main() {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL is required");
  const target = new URL(connection);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
    throw new Error("Demo quotes can only be loaded into a local, non-production database");
  }

  const sql = postgres(connection, { max: 1, prepare: false });
  try {
    const apply = process.argv.includes("--apply");
    const [counts] = await sql<{ total: string; marked: string }[]>`
      SELECT COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE explanation ? 'demoFixture')::text AS marked
      FROM player_quotes
    `;
    console.log(`Cotizaciones en la base: ${counts.total}; marcadas como demo: ${counts.marked}.`);
    const sources = await sql<{
      id: string; player_id: string; strategy_version_id: string; strategy_code: string;
      calculated_at: Date; final_score: string;
    }[]>`
      SELECT DISTINCT ON (q.player_id)
        q.id, q.player_id, q.strategy_version_id, v.strategy_code,
        q.calculated_at, q.final_score
      FROM player_quotes q
      JOIN valuation_strategy_versions v ON v.id = q.strategy_version_id
      WHERE NOT (q.explanation ? 'demoFixture')
      ORDER BY q.player_id, q.calculated_at DESC, q.id DESC
    `;
    const eligible = sources.filter((row) => row.strategy_code === "INDIVIDUAL_PERFORMANCE");
    const existing = await sql<{ player_id: string; slot: string }[]>`
      SELECT player_id, explanation->>'slot' AS slot
      FROM player_quotes
      WHERE explanation->>'demoFixture' = ${fixture}
    `;
    const existingKeys = new Set(existing.map((row) => `${row.player_id}:${row.slot}`));
    const pending = eligible.flatMap((source) => slots
      .filter((slot) => !existingKeys.has(`${source.player_id}:${slot.name}`))
      .map((slot) => ({ source, slot })));

    console.log(`Base local: ${target.hostname}${target.pathname}`);
    console.log(`Jugadores con cotización individual real: ${eligible.length}. Registros de demostración existentes: ${existing.length}. Pendientes: ${pending.length}.`);
    if (eligible[0]) {
      const date = new Date(eligible[0].calculated_at);
      date.setUTCDate(date.getUTCDate() - 45);
      const upperBound = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
      const [sample] = await sql<{ slot: string | null; calculated_at: Date; quote_value: string }[]>`
        SELECT explanation->>'slot' AS slot, calculated_at, quote_value
        FROM player_quotes
        WHERE player_id = ${eligible[0].player_id} AND calculated_at < ${upperBound}
        ORDER BY calculated_at DESC, id DESC LIMIT 1
      `;
      console.log(`Fecha para probar la consulta puntual: ${date.toISOString().slice(0, 10)} (dos registros ese día).`);
      if (sample) console.log(`Resultado de ejemplo: ${sample.quote_value} créditos, ${new Date(sample.calculated_at).toISOString()}, ${sample.slot ?? "registro real"}.`);
    }
    if (sources.length !== eligible.length) {
      console.log(`Se omitieron ${sources.length - eligible.length} jugadores con otra estrategia para no mezclar cálculos.`);
    }
    if (!apply || pending.length === 0) {
      if (pending.length > 0) console.log("Vista previa solamente. Ejecutá con --apply para insertar.");
      return;
    }

    await sql.begin(async (tx) => {
      for (const { source, slot } of pending) {
        const baseDate = new Date(source.calculated_at);
        const calculatedAt = new Date(Date.UTC(
          baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() - slot.daysBefore,
          slot.hour,
        ));
        const score = Math.max(0, Math.min(1, Number(source.final_score) + slot.scoreChange));
        const quoteValue = Math.round((1 + 99 * score) * 100) / 100;
        const explanation = {
          demoFixture: fixture,
          slot: slot.name,
          aviso: "Valor simulado para probar la interfaz; no corresponde a datos históricos reales.",
          cotizacionBase: source.id,
          ajusteDelScore: slot.scoreChange,
          formula: "1 + 99 × score",
        };
        await tx`
          INSERT INTO player_quotes (
            player_id, strategy_version_id, individual_score, team_score,
            final_score, quote_value, calculated_at, explanation
          ) VALUES (
            ${source.player_id}, ${source.strategy_version_id}, ${score.toFixed(6)}, NULL,
            ${score.toFixed(6)}, ${quoteValue.toFixed(2)}, ${calculatedAt}, ${tx.json(explanation)}
          )
        `;
      }
    });
    console.log(`Insertados ${pending.length} registros de demostración.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
