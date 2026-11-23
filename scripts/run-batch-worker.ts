import { setTimeout as delay } from "node:timers/promises";

async function main(): Promise<void> {
  let running = true;
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const { env } = await import("@/backend/config/env");
    const [
      { BatchSchedulerService, configuredBatchSchedules },
      { BatchExecutionService },
      { closeDatabase },
    ] = await Promise.all([
      import("@/backend/services/batch-scheduler.service"),
      import("@/backend/services/batch-execution.service"),
      import("@/backend/db"),
    ]);
    const scheduler = new BatchSchedulerService(
      configuredBatchSchedules(),
      new BatchExecutionService(),
    );
    try {
      while (running) {
        try {
          await scheduler.tick();
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "batch.worker.error",
              reasonCode: "TICK_FAILED",
              message: error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
            }),
          );
        }
        if (running) await delay(env.BATCH_POLL_SECONDS * 1000);
      }
    } finally {
      await closeDatabase();
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "batch.config.invalid",
        reasonCode: "INVALID_CONFIGURATION",
        message: error instanceof Error ? error.message : "Invalid configuration",
      }),
    );
    process.exitCode = 1;
  }
}

void main();
