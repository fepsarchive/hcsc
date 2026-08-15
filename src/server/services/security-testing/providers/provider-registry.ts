import "server-only";

import type { SecurityTestProvider } from "@prisma/client";

import { demoSecurityTestProvider } from "@/server/services/security-testing/providers/demo-provider";
import { createSelfHostedSecurityTestProvider } from "@/server/services/security-testing/providers/self-hosted-provider";
import { createManagedStrixProvider } from "@/server/services/security-testing/providers/managed-strix-provider";
import type { SecurityTestProviderRuntime } from "@/server/services/security-testing/providers/security-test-provider";

function configuredProvider(): SecurityTestProvider {
  const value = process.env.HCSC_SECURITY_TEST_PROVIDER?.trim().toLowerCase();
  if (value === "self_hosted" || value === "managed") return value;
  return "demo";
}

export function getSecurityTestProvider(): SecurityTestProviderRuntime {
  const provider = configuredProvider();
  if (provider === "self_hosted") return createSelfHostedSecurityTestProvider();
  if (provider === "managed") return createManagedStrixProvider();
  return demoSecurityTestProvider;
}
