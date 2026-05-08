import type { NextRequest } from "next/server";

import { triggerTrapForRequest } from "@/server/services/deception/trap-service";

export const dynamic = "force-dynamic";

function buildSafeTrapResponse() {
  return new Response("Resource unavailable", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function handleTrap(request: NextRequest, params: Promise<{ trapSlug: string }>) {
  const { trapSlug } = await params;

  await triggerTrapForRequest(trapSlug, request);

  // This endpoint is a safe deception surface only. It never proxies real resources,
  // never returns secrets, and never performs offensive actions.
  return buildSafeTrapResponse();
}

export async function GET(request: NextRequest, context: { params: Promise<{ trapSlug: string }> }) {
  return handleTrap(request, context.params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ trapSlug: string }> }) {
  return handleTrap(request, context.params);
}
