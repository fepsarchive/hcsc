import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const port = Number(process.env.PORT ?? "8787");
const runnerToken = process.env.STRIX_RUNNER_TOKEN?.trim() ?? "";
const callbackUrl = process.env.HCSC_CALLBACK_URL?.trim() ?? "";
const callbackToken = process.env.STRIX_RUNNER_CALLBACK_TOKEN?.trim() ?? "";
const strixBinary = process.env.STRIX_BINARY?.trim() || "strix";
const artifactsRoot = resolve(process.env.STRIX_RUNNER_ARTIFACTS_DIR?.trim() || join(tmpdir(), "hcsc-strix-runs"));
const allowedTargets = new Set(
  (process.env.STRIX_ALLOWED_TARGETS ?? "")
    .split(",")
    .map(normalizeTarget)
    .filter(Boolean),
);

const jobs = new Map();
const queue = [];
let workerActive = false;

const callbackMaxAttempts = 3;
const callbackRetryBaseMs = 750;

function normalizeTarget(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return "";
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return "";
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function bearerToken(request) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function commandAvailable(command, args, timeoutMs = 5_000) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      env: { PATH: process.env.PATH ?? "" },
      shell: false,
      stdio: "ignore",
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolvePromise(false);
    }, timeoutMs);
    child.once("error", () => {
      clearTimeout(timeout);
      resolvePromise(false);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolvePromise(code === 0);
    });
  });
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 256 * 1024) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateScanRequest(payload) {
  const target = normalizeTarget(payload?.target);
  if (!payload || typeof payload !== "object") throw new Error("INVALID_REQUEST");
  if (typeof payload.hcscRunId !== "string" || !payload.hcscRunId.trim()) throw new Error("INVALID_RUN_ID");
  if (!target || !allowedTargets.has(target)) throw new Error("TARGET_NOT_ALLOWED");
  if (!["quick", "standard", "deep"].includes(payload.scanMode)) throw new Error("INVALID_SCAN_MODE");
  if (!Array.isArray(payload.scope) || !payload.scope.length) throw new Error("INVALID_SCOPE");
  const maxTurns = Number(payload.maxTurns);
  if (!Number.isInteger(maxTurns) || maxTurns < 25 || maxTurns > 500) throw new Error("INVALID_MAX_TURNS");
  const maxBudgetUsd = payload.maxBudgetUsd == null ? null : Number(payload.maxBudgetUsd);
  if (maxBudgetUsd !== null && (!Number.isFinite(maxBudgetUsd) || maxBudgetUsd <= 0 || maxBudgetUsd > 1000)) {
    throw new Error("INVALID_MAX_BUDGET");
  }
  return {
    hcscRunId: payload.hcscRunId.trim(),
    target,
    scanMode: payload.scanMode,
    scope: payload.scope.map(String).slice(0, 24),
    exclusions: Array.isArray(payload.exclusions) ? payload.exclusions.map(String).slice(0, 24) : [],
    instructions: typeof payload.instructions === "string" ? payload.instructions.slice(0, 2000) : "",
    maxTurns,
    maxBudgetUsd,
  };
}

function buildInstructions(job) {
  const sections = [
    "HCSC rules of engagement:",
    `Allowed scope:\n${job.scope.map((entry) => `- ${entry}`).join("\n")}`,
    `Explicit exclusions:\n${job.exclusions.length ? job.exclusions.map((entry) => `- ${entry}`).join("\n") : "- None declared"}`,
    "Do not test outside the exact authorized target and scope. Stop if scope is ambiguous.",
  ];
  if (job.instructions) sections.push(`Operator instructions:\n${job.instructions}`);
  return sections.join("\n\n");
}

async function postCallback(job, status, extras = {}) {
  let lastError = new Error("HCSC callback delivery failed.");

  for (let attempt = 1; attempt <= callbackMaxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${callbackToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          hcscRunId: job.hcscRunId,
          externalRunId: job.externalRunId,
          status,
          findings: [],
          ...extras,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }

    if (response?.ok) return;
    if (response) {
      lastError = new Error(`HCSC callback rejected update (${response.status}).`);
      if (response.status < 500 && response.status !== 429) throw lastError;
    }
    if (attempt < callbackMaxAttempts) {
      await new Promise((resolvePromise) => {
        setTimeout(resolvePromise, callbackRetryBaseMs * 2 ** (attempt - 1));
      });
    }
  }

  throw lastError;
}

async function findFiles(directory, filename, depth = 0) {
  if (depth > 5) return [];
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(path, filename, depth + 1)));
    else if (entry.isFile() && entry.name === filename) files.push(path);
  }
  return files;
}

function sarifSeverity(result) {
  const declared = String(result.properties?.severity ?? result.properties?.["security-severity"] ?? "").toLowerCase();
  if (["critical", "high", "medium", "low", "info"].includes(declared)) return declared;
  const score = Number(declared);
  if (Number.isFinite(score)) {
    if (score >= 9) return "critical";
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    if (score > 0) return "low";
  }
  return result.level === "error" ? "high" : result.level === "warning" ? "medium" : "info";
}

function sarifLocation(result) {
  const location = result.locations?.[0]?.physicalLocation;
  const uri = location?.artifactLocation?.uri ?? "Authorized target";
  const line = location?.region?.startLine;
  return line ? `${uri}:${line}` : uri;
}

function parseSarif(sarif) {
  const findings = [];
  for (const run of Array.isArray(sarif?.runs) ? sarif.runs : []) {
    for (const result of Array.isArray(run?.results) ? run.results : []) {
      const message = String(result.message?.text ?? result.message?.markdown ?? "Validated Strix finding").slice(0, 10_000);
      const location = sarifLocation(result);
      const fingerprintSource = JSON.stringify({ ruleId: result.ruleId, message, location });
      const externalId =
        Object.values(result.partialFingerprints ?? {})[0] ??
        createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 32);
      const cvssCandidate = Number(result.properties?.cvssScore ?? result.properties?.cvss);
      findings.push({
        externalId: String(externalId).slice(0, 160),
        title: String(result.properties?.title ?? message.split("\n")[0] ?? result.ruleId ?? "Validated finding").slice(0, 240),
        severity: sarifSeverity(result),
        category: String(result.ruleId ?? "strix_validated_finding").slice(0, 120),
        description: message,
        evidence: [`SARIF location: ${location}`],
        remediation: String(result.properties?.remediation ?? "Review the validated evidence and apply the narrowest effective fix.").slice(0, 10_000),
        affectedResource: String(location).slice(0, 1000),
        cvssScore: Number.isFinite(cvssCandidate) && cvssCandidate >= 0 && cvssCandidate <= 10 ? cvssCandidate : null,
        pocAvailable: Boolean(result.properties?.pocAvailable),
        metadata: { source: "strix_sarif", ruleId: result.ruleId ?? null },
      });
    }
  }
  return findings.slice(0, 200);
}

async function readLatestSarif(jobDirectory) {
  const files = await findFiles(jobDirectory, "findings.sarif");
  const ranked = await Promise.all(files.map(async (path) => ({ path, modified: (await stat(path)).mtimeMs })));
  ranked.sort((left, right) => right.modified - left.modified);
  if (!ranked[0]) return [];
  return parseSarif(JSON.parse(await readFile(ranked[0].path, "utf8")));
}

function runStrix(job, directory) {
  const args = [
    "--non-interactive",
    "--target",
    job.target,
    "--scan-mode",
    job.scanMode,
    "--max-turns",
    String(job.maxTurns),
    "--instruction",
    buildInstructions(job),
  ];
  if (job.maxBudgetUsd !== null) args.push("--max-budget", String(job.maxBudgetUsd));

  const allowedEnvironmentKeys = [
    "PATH",
    "HOME",
    "USER",
    "TMPDIR",
    "DOCKER_HOST",
    "STRIX_LLM",
    "LLM_API_KEY",
    "LLM_API_BASE",
    "PERPLEXITY_API_KEY",
    "POSTMAN_API_KEY",
    "STRIX_REASONING_EFFORT",
  ];
  const childEnvironment = Object.fromEntries(
    allowedEnvironmentKeys.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
  );

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(strixBinary, args, {
      cwd: directory,
      env: childEnvironment,
      shell: false,
      stdio: "ignore",
    });
    child.once("error", rejectPromise);
    child.once("close", (code) => resolvePromise({ code }));
  });
}

async function processJob(job) {
  const jobDirectory = await mkdtemp(join(artifactsRoot, `${job.externalRunId}-`));
  job.status = "running";
  await postCallback(job, "running", { summary: "Authorized Strix assessment started." });

  const result = await runStrix(job, jobDirectory);
  const findings = await readLatestSarif(jobDirectory);
  const completed = result.code === 0 || result.code === 2;
  job.status = completed ? "completed" : "failed";
  await postCallback(job, job.status, {
    summary: completed
      ? `Authorized Strix assessment completed with ${findings.length} normalized finding(s).`
      : "Strix assessment failed before a valid completion signal.",
    errorMessage: completed ? null : `Strix exited with code ${result.code ?? "unknown"}. See runner-local logs.`,
    findings,
    metadata: { exitCode: result.code, artifactsRetained: true },
  });
}

async function drainQueue() {
  if (workerActive) return;
  workerActive = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        await processJob(job);
      } catch (error) {
        job.status = "failed";
        await postCallback(job, "failed", {
          errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Runner execution failed.",
        }).catch(() => undefined);
      }
    }
  } finally {
    workerActive = false;
  }
}

await mkdir(artifactsRoot, { recursive: true });

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    const [strixReady, dockerReady] = await Promise.all([
      commandAvailable(strixBinary, ["--version"], 30_000),
      commandAvailable("docker", ["info"]),
    ]);
    const configured = Boolean(runnerToken && callbackUrl && callbackToken && allowedTargets.size);
    const ready = configured && strixReady && dockerReady;
    return sendJson(response, ready ? 200 : 503, {
      ready,
      configured,
      strixReady,
      dockerReady,
      queueDepth: queue.length,
      active: workerActive,
    });
  }

  if (request.method !== "POST" || request.url !== "/v1/scans") {
    return sendJson(response, 404, { error: "NOT_FOUND" });
  }
  if (!runnerToken || !safeEqual(bearerToken(request), runnerToken)) {
    return sendJson(response, 401, { error: "UNAUTHORIZED" });
  }

  try {
    const scan = validateScanRequest(await readJsonBody(request));
    const existing = [...jobs.values()].find((job) => job.hcscRunId === scan.hcscRunId);
    if (existing) return sendJson(response, 202, { runId: existing.externalRunId, status: existing.status });

    const job = { ...scan, externalRunId: randomUUID(), status: "queued" };
    jobs.set(job.externalRunId, job);
    queue.push(job);
    void drainQueue();
    return sendJson(response, 202, { runId: job.externalRunId, status: job.status });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    const status = code === "TARGET_NOT_ALLOWED" ? 403 : code === "REQUEST_TOO_LARGE" ? 413 : 400;
    return sendJson(response, status, { error: code });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HCSC Strix runner listening on port ${port}.`);
});
