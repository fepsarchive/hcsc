import "server-only";

import type {
  SecurityTestLaunchResult,
  SecurityTestProviderRuntime,
} from "@/server/services/security-testing/providers/security-test-provider";

function getRunnerConfig() {
  const baseUrl = process.env.STRIX_RUNNER_URL?.trim().replace(/\/$/, "") ?? "";
  const token = process.env.STRIX_RUNNER_TOKEN?.trim() ?? "";
  const callbackToken = process.env.STRIX_RUNNER_CALLBACK_TOKEN?.trim() ?? "";
  let secureUrl = false;
  try {
    const parsed = new URL(baseUrl);
    secureUrl =
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost"));
  } catch {
    secureUrl = false;
  }
  return { baseUrl, token, ready: Boolean(baseUrl && token && callbackToken && secureUrl) };
}

export function createSelfHostedSecurityTestProvider(): SecurityTestProviderRuntime {
  const config = getRunnerConfig();

  return {
    mode: "self_hosted",
    ready: config.ready,
    label: "Self-hosted Strix Runner",
    description: config.ready
      ? "Authorized scans are dispatched to the isolated runner service."
      : "Runner URL, outbound token or callback token is not configured; live scans remain disabled.",
    attribution: "Powered by Strix (Apache-2.0)",
    async launch(input): Promise<SecurityTestLaunchResult> {
      if (!config.ready) {
        throw new Error("Self-hosted Strix runner is not configured.");
      }

      const response = await fetch(`${config.baseUrl}/v1/scans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hcscRunId: input.runId,
          target: input.target.target,
          targetType: input.target.targetType,
          environment: input.target.environment,
          scope: input.target.scope,
          exclusions: input.target.exclusions,
          scanMode: input.scanMode,
          instructions: input.instructions,
          maxBudgetUsd: input.maxBudgetUsd,
          maxTurns: input.maxTurns,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Strix runner rejected the scan request (${response.status}).`);
      }

      const result = (await response.json()) as {
        runId: string;
        status?: "queued" | "running";
      };

      if (!result.runId) {
        throw new Error("Strix runner response did not include a run id.");
      }

      return {
        externalRunId: result.runId,
        status: result.status ?? "queued",
        summary: "Authorized scan was accepted by the isolated Strix runner.",
        findings: [],
        metadata: {
          runner: "self_hosted",
        },
      };
    },
  };
}
