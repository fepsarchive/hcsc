# Redis reconnection — 2026-10-09

## Outcome

The new Upstash Redis is reachable from a production-target HCSC candidate. The public production domain has not been promoted to this candidate.

- Project: `fepsarchives-projects/hcsc` (`prj_abzeJZPTi1U5ChinwV7pPLY8MSaQ`).
- User-created Redis: `hcsc-rate-limit`, ID `5a6f863b-a92f-483b-93eb-b03a7c3ed0c6`.
- REST endpoint: `https://precious-raven-45045.upstash.io`.
- User entered the replacement `UPSTASH_REDIS_REST_TOKEN` directly in Vercel. The agent did not read or download it.
- Agent updated `UPSTASH_REDIS_REST_URL` using the linked project's Production entry. The existing variable remains scoped to Production and Preview; runtime verification was performed only against Production.
- No local `.env` was modified and no production secrets were pulled. Local Redis configuration is not verified by this test.

The three previously approved admin exception settings were also persisted in Vercel Production (not Preview):

```dotenv
HCSC_PASSWORD_ONLY_ADMIN_ENABLED=true
HCSC_PASSWORD_ONLY_ADMIN_EMAIL=firat@backhub.tr
HCSC_PASSWORD_ONLY_ADMIN_USER_ID=cmp594549000104jycvk1vqfa
```

The candidate build's read-only database guard confirmed this exact active ADMIN account and its security-admin membership. Password and TOTP enrollment were not changed.

## Deployment result

- URL: https://hcsc-6dxii6v4u-fepsarchives-projects.vercel.app
- Deployment: `dpl_E4ZUg8hQJ2j3Zg9aa9WDdYYwhbtc`
- Target: production, staged using `--skip-domain`.
- Build status: READY; Next.js 16.4.0; reported build duration 18 seconds.
- Source: `codex/release-hardening`, base commit `6bee165`, plus the existing uncommitted admin/dependency changes. This is not a clean-commit release.
- Checks: 34 unit tests and 11 server-flow tests passed; `git diff --check` passed. Remote build and TypeScript compilation passed.

## Runtime verification

Flow: Vercel configuration → candidate health API → authenticated Upstash REST PING → PONG → health response.

At `2026-10-09T07:08:39.788Z` (10:08:39 Europe/Istanbul), `/api/health/ready` reported:

| Check | Result |
| --- | --- |
| Redis | healthy, 397 ms; probe requires successful HTTP response and PONG |
| PostgreSQL and expected tables | healthy, 480 ms |
| Production configuration | unavailable; 2 issues, 1 warning |
| Overall readiness | HTTP 503, not_ready |

This verifies the Redis connection and token acceptance, not a successful admin login or a full rate-limit write/enforcement test. The overall configuration gate remains closed. No real-user password was used or requested.

## Remaining release blockers

Production metadata still lacks `INTEGRATION_ENCRYPTION_KEY` and real Strix provider configuration. Preserve any existing encrypted integration data when setting its encryption key; do not silently rotate a previously used key. Strix must be configured with the chosen real provider and valid credentials, not a placeholder used to silence readiness.

The candidate was not promoted. Inspection confirmed `www.hcsc.space` remains on `dpl_85RKXo2mNKYwvQLXtzMvur5XnYHK`. The existing public deployment does not automatically receive edited environment variables; they apply to new builds/deployments. No DNS changes or Git push were performed.

Post-deploy observability: dependency health response inspected; no broad runtime error-log scan, drain inventory or monitoring installation was performed in this scoped Redis repair. A complete release and real admin login verification remain pending.
