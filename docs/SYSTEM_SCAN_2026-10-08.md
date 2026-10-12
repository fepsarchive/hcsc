# HCSC scan — 2026-10-08

Update, 2026-10-09: Redis was reconnected and the admin exception settings persisted in Production. See [REDIS_RECONNECTION_2026-10-09.md](REDIS_RECONNECTION_2026-10-09.md) for the new candidate and verified healthy Redis result. The historical findings below describe the earlier scan; configuration blockers still prevent promotion.

Scope: current `codex/release-hardening` checkout, installed dependencies, API inventory, local configuration service probes, public production readiness. No active exploit/Strix scan or third-party domain probing was performed.

## Findings and changes

| Check | Evidence / result |
| --- | --- |
| Production dependencies before fixes | 4 affected packages: 1 critical, 2 high, 1 moderate |
| Production dependencies after fixes | `npm audit --omit=dev`: 0 known advisories |
| Full dependency tree after fixes | 9 high package records remain in the development toolchain, all stemming from `braces` |
| Updated key versions | Next.js + eslint-config-next 16.4.0; sharp 0.35.5; fast-uri 3.1.8; source-map-js 1.2.2 |
| Database (local configuration) | Healthy, read-only probe succeeded |
| Rate-limit cache (local configuration) | Unavailable; production authentication fails closed if the production cache is also unavailable |
| Email (local configuration) | Provider returned HTTP 401; delivery not verified |
| Strix (local configuration) | Synthetic demo selected; no real scan available |
| Live `/api/health/ready` | HTTP 200, database healthy. Currently deployed response only proves database readiness, not full service readiness |
| API inventory | 78 routes / 88 methods; 68 recognized protected routes. Static inventory is not a penetration test |
| Local development server | Started on loopback port 3001; login UI and anonymous `/api/auth/me` response verified |

`braces` advisory currently lists no patched version: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Nine package records are not nine independent root vulnerabilities. Do not process untrusted glob patterns with the affected development tools. No forced downgrade or advisory suppression was used.

Next.js advisory applicability depends on application features; a vulnerable installed version is not evidence of exploitation. The production dependency tree was updated and tested; this does not patch the existing remote deployment until released.

## Admin change

Requested account: `firat@backhub.tr`; immutable ID in the configured local database: `cmp594549000104jycvk1vqfa`. Existing workspace-admin membership was preserved. Platform role upgraded from USER to ADMIN; prior active/pending sessions revoked. Password and MFA enrollment were preserved.

Local ignored `.env.development.local` enables the single-account exception. See [PASSWORD_ONLY_ADMIN.md](PASSWORD_ONLY_ADMIN.md). No default/demo password was assigned.

Vercel project verified: `fepsarchives-projects/hcsc`, `prj_abzeJZPTi1U5ChinwV7pPLY8MSaQ`. With explicit user approval, attempted to read only the production DATABASE_URL in memory; the response omitted its value. No production secrets were downloaded. Subsequently a production-target candidate build performed the exact-account check inside Vercel using its injected database connection: the same ID/email, active ADMIN role and existing security-admin membership were confirmed without changing the database.

Candidate: `dpl_3uYJBBWSHZAqfeX84XjLWTufoZZF`, https://hcsc-7hn1zgs7q-fepsarchives-projects.vercel.app. Built with `--prod --skip-domain`, using the three exception values as deployment-specific build/runtime overrides. These are NOT persisted as project settings for future deployments. Local `.env*` files and unrelated `hcsc-logo/` assets were excluded from upload.

At 2026-10-08 13:11:05 UTC the candidate `/api/health/ready` returned HTTP 503: database healthy, cache unavailable, configuration unavailable (2 issues, 1 warning). Production metadata lacks INTEGRATION_ENCRYPTION_KEY and real Strix provider configuration. No production mail delivery or successful password login was attempted after this failed readiness gate. The candidate was NOT promoted. `www.hcsc.space` still resolves to the previous deployment `dpl_85RKXo2mNKYwvQLXtzMvur5XnYHK`.

## Verification

- 45 tests passed (34 unit / 11 server-flow). Lint and typecheck passed; Prisma schema generation and the remote production candidate build passed after the final runtime changes. The unit suite used `node --import tsx --test tests/**/*.test.ts` because the sandbox denied the tsx CLI IPC socket.
- Authentication tests cover wrong password, correct password → cookie → `/api/auth/me` → permission-protected API, explicit exception removal/revocation, unchanged ordinary 2FA requirement, immutable identity matching and pending-session isolation.
- Browser login form renders. The approved account's audit log records a successful `password_only_admin_login` at 2026-10-08 15:36:27 Europe/Istanbul; the developer server also recorded HTTP 200 for admin pages. The existing password was not read or changed by the agent.
- Cookie lifetime now matches database expiry; accepting a workspace invite preserves the original deadline. Expired-session rejection and one-hour cookie lifetime are tested.
- A production-target candidate deployment was created but not promoted; no main push, DNS change, external vulnerability scan or password reset was performed.

## Remaining release work

1. Production account identity is verified. Repair the production Upstash connection through its provider/Vercel dashboard; no cache secrets were retrieved by the agent.
2. Configure the missing INTEGRATION_ENCRYPTION_KEY and real Strix provider. Verify mail delivery separately; local provider rejection does not establish production mail status.
3. Persist the three approved server-only exception variables for future releases, rebuild with corrected configuration, verify readiness and an actual admin login, then promote. Do not claim protection/Strix activation until its separate provider and authorization gates pass.
4. Follow the upstream `braces` fix; retain the distinction between runtime and development-only findings.
