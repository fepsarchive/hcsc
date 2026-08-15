import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const apiRoot = join(process.cwd(), "src", "app", "api");
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

async function routeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  }));
  return nested.flat();
}

async function main() {
const files = await routeFiles(apiRoot);
const routes = await Promise.all(files.map(async (file) => {
  const source = await readFile(file, "utf8");
  const path = `/api/${relative(apiRoot, file).split(sep).slice(0, -1).join("/")}`.replace(/\/$/, "");
  const exportedMethods = methods.filter((method) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(source));
  const auth = source.includes("requireSystemOwnerApiAuth")
    ? "system_owner"
    : source.includes("requireApiAuth")
      ? "session_permission"
      : source.includes("verifySecurityTestProviderCallback")
        ? "provider_token"
        : "public_or_custom";
  return {
    path,
    methods: exportedMethods,
    auth,
    inputValidation: source.includes("parseRequestJson") || source.includes("safeParse"),
    rateLimited: source.includes("rateLimit") || source.includes("consumeRateLimit"),
  };
}));

const mutating = routes.filter((route) => route.methods.some((method) => method !== "GET" && method !== "HEAD" && method !== "OPTIONS"));
const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    routes: routes.length,
    methods: routes.reduce((total, route) => total + route.methods.length, 0),
    protectedRoutes: routes.filter((route) => route.auth !== "public_or_custom").length,
    mutatingRoutes: mutating.length,
    validatedMutations: mutating.filter((route) => route.inputValidation).length,
  },
  review: {
    publicOrCustom: routes.filter((route) => route.auth === "public_or_custom").map((route) => route.path),
    mutationsWithoutDetectedSchema: mutating.filter((route) => !route.inputValidation).map((route) => `${route.methods.join(",")} ${route.path}`),
  },
  routes,
};

console.log(JSON.stringify(summary, null, 2));
}

void main();
