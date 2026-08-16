import { loadEnvConfig } from "@next/env";

import { evaluateRuntimeReadiness } from "../src/lib/runtime-readiness";

loadEnvConfig(process.cwd());

const forceProduction = process.argv.includes("--production");
const readiness = evaluateRuntimeReadiness({
  ...process.env,
  NODE_ENV: forceProduction ? "production" : process.env.NODE_ENV,
});

const summary = {
  environment: readiness.environment,
  provider: readiness.provider,
  ready: readiness.ready,
  issues: readiness.issues.map((issue) => ({ key: issue.key, code: issue.code, message: issue.message })),
  warnings: readiness.warnings,
};

console.log(JSON.stringify(summary, null, 2));

if (!readiness.ready) process.exit(1);
