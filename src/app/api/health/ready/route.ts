import { NextResponse } from "next/server";

import { evaluateRuntimeReadiness } from "@/lib/runtime-readiness";
import { probeDatabase } from "@/server/health/dependency-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, configuration] = await Promise.all([
    probeDatabase(),
    Promise.resolve(evaluateRuntimeReadiness(process.env)),
  ]);
  const ready = database.status === "healthy" && configuration.ready;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        database: {
          status: database.status,
          latencyMs: database.latencyMs,
        },
        configuration: {
          status: configuration.ready ? "healthy" : "unavailable",
          issueCount: configuration.issues.length,
          warningCount: configuration.warnings.length,
        },
      },
      checkedAt: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
