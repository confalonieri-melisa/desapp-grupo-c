import { closeDatabase } from "@/backend/db";
import { BatchExecutionService } from "@/backend/services/batch-execution.service";
import { ConflictError } from "@/backend/errors/http.error";

async function main(): Promise<void> {
  const result = await new BatchExecutionService().runManualSync();
  console.log(JSON.stringify(result));
}

main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        errorCode: error instanceof ConflictError ? "BATCH_CONFLICT" : "BATCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
