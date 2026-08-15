import { NextResponse } from "next/server";

import { probeDatabase } from "@/server/health/dependency-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await probeDatabase();
  const ready = database.status === "healthy";

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        database: {
          status: database.status,
          latencyMs: database.latencyMs,
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
