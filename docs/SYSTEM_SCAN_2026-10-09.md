# HCSC system review and MFA recovery — 2026-10-09

## Scope and limits

Reviewed the current `codex/release-hardening` checkout based on `6bee165` plus pending changes. Ran dependency audits, unit/server tests, lint/type/schema checks, static API inventory, anonymous API checks, and read-only Vercel health probes. Reviewed authentication, recovery, domain/provider integration, webhook projection/egress, and Strix runner boundaries.

This is not an exhaustive penetration test or proof that every screen and authenticated workflow works. No exploit scan, third-party domain scan, real email send, or actual user-password/TOTP submission was performed. Secrets were not copied from Vercel. Unrelated `hcsc-logo/` assets were preserved and excluded from deployment.

## Evidence

| Check | Result |
| --- | --- |
| Unit/server tests | 34 unit + 13 server = 47 passing after changes |
| Lint / TypeScript | Passed after final authentication changes |
| Prisma schema | Validated successfully |
| Production dependency audit | 0 known advisories in the current checkout; not a statement about the old live build |
| Full dependency audit | 9 high package records in development tooling, originating from the braces advisory; no forced downgrade |
| Static API inventory | 78 routes, 88 methods, 68 detected protected routes; heuristic classification, not an authorization proof |
| Anonymous local requests | All 27 non-parameterized protected GET routes returned 401 |
| Anonymous candidate admin API | `/api/admin/users` returned 401 |
| Local browser | Login rendered; no captured warning/error console messages; no authenticated browser session established |
| Strix runner | `node --check` passed; real scan execution not verified |
| Tracked env files | Only `.env.example`; narrow private-key/token pattern scan found no matches in scanned source directories (not a comprehensive secret-history scan) |

Candidate `dpl_E4ZUg8hQJ2j3Zg9aa9WDdYYwhbtc` at 07:16:16 UTC returned HTTP 503: Redis healthy (385 ms), database healthy (444 ms), configuration unavailable (2 issues, 1 warning). This confirms PING/PONG, not a live rate-limit write/enforcement test. The old public deployment's HTTP 200 readiness only checks its database.

## Fixes implemented in this review

1. Redis limiter now validates all three command results, rejects error/missing/invalid expiry responses, keeps timeout active through body parsing, rejects redirects and avoids raw transport errors in logs. Production remains fail-closed. A regression test reproduced the previous partial-error acceptance before the fix.
2. Integration endpoint API responses now explicitly select public fields instead of spreading the database record. Previously, encrypted signing-key ciphertext and internal fields reached the response. A fixture regression reproduced and then prevented that disclosure. This was encrypted data, not evidence that plaintext keys were compromised.
3. Admin designation is separate from the password-only exemption. The designated active ADMIN can access admin features after real MFA; unrelated ADMIN IDs and incomplete MFA are rejected. The designated admin's pending/active session deadline remains one hour. MFA confirmation redirects the designated admin to `/admin`.

Redis response handling was checked against the [official Upstash REST API contract](https://upstash.com/docs/redis/features/restapi).

## User-approved MFA recovery

The user explicitly chose: preserve the account, reset local and live MFA, then re-enroll with their phone.

- Exact account: `firat@backhub.tr`, immutable ID `cmp594549000104jycvk1vqfa`.
- Locally and in Vercel Production, `HCSC_PASSWORD_ONLY_ADMIN_ENABLED=false`; no static OTP was introduced.
- Local and Vercel Production connection targets have the same normalized host/database SHA-256 fingerprint: `030e9780a0c29304694ff6ff4fe83d06405bc90c49d4b0f414fa88464b61418a`. They currently share the database. Do not repeat recovery separately for local use.
- Inside Vercel's production environment, an explicit one-off maintenance command verified the fingerprint, exact active ADMIN identity and existing security-admin membership before applying one serializable transaction.
- Confirmed command output: 1 old TOTP record and 10 recovery-code records removed, 2 sessions revoked; post-action counts were all zero. Password, roles, memberships, account and prior history were preserved.
- Audit/request ID: `mfa-recovery-20261009-firat-7b0c`. A repeated command with this request ID skips mutation, so later re-enrollment cannot be erased by replaying this recovery.
- Deleted TOTP/recovery codes are intentionally not restored; the user must enroll again and retain newly issued recovery codes privately.

The maintenance helper is `scripts/reset-user-two-factor.ts`, dry-run by default; applying requires explicit `--apply`, exact ID/email, request ID, and expected database fingerprint. It is not exposed through HTTP or wired into normal builds. A temporary local Vercel configuration outside the repository invoked it for this single production-target candidate; no database secret was exported. Do not reuse the temporary config for routine releases.

## Release status

- Recovery candidate: `dpl_7rFkcGdqTHC8reQWGDTSCzApHPwt`, https://hcsc-nxbrrnlm9-fepsarchives-projects.vercel.app.
- Framework: Next.js 16.4.0. Compilation and TypeScript succeeded; remote build completed in 59 seconds.
- The CLI connection reset while reading the final deployment status after outputs were being deployed. Independent `vercel inspect` subsequently confirmed **READY**; recovery had already committed successfully before compilation.
- No promotion, main push, DNS changes or account deletion occurred. Last confirmed public alias remained on the August 16 deployment `dpl_85RKXo2mNKYwvQLXtzMvur5XnYHK`.
- Existing earlier candidates carry their original environment snapshots; changing project variables does not retrofit their authentication behavior.
- Final candidate probe at `2026-10-09T14:08:49.226Z` (17:08 Europe/Istanbul): HTTP 503, Redis healthy (474 ms), database healthy (489 ms), configuration unavailable (2 issues, 0 warnings). The approved password-only exception warning is gone. Independent inspection confirmed the normal project build command was unchanged and `www.hcsc.space` still targeted the August 16 deployment.

## Remaining work / release gates

1. Real user password → new QR enrollment → phone TOTP confirmation → admin access must be completed by the user; do not request their password, QR secret or recovery codes in chat. Live UI behavior remains dependent on its older deployment.
2. Separate local/test and production database targets before further fixture or destructive test work. Current shared data is a meaningful operational risk.
3. Production `INTEGRATION_ENCRYPTION_KEY` and real Strix provider configuration remain missing. Read-only inventory found zero integration endpoints and zero encrypted domain tokens in the shared database, but do not silently rotate future keys or bypass readiness.
4. Outbound webhook policy needs further SSRF hardening before arbitrary customer endpoints are enabled: the current IP denylist misses some reserved/mapped address forms, and DNS validation is separate from fetch resolution (rebinding window). This review did not implement DNS-pinned delivery or perform an exploit against a network target. Use explicit trusted endpoint allowlisting meanwhile; follow the [OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
5. Email delivery, live rate-limit enforcement, real Strix run/callback/report and domain onboarding/provider checks still need end-to-end validation. Domain integration currently verifies Cloudflare configuration; adding a hostname alone does not put HCSC in the traffic path or prove protection.
6. Development-tool dependency advisory remains; do not suppress it or force incompatible framework downgrades. Runtime error-log review, drain inventory and monitoring setup were not completed.

Readiness gates were preserved. Do not describe this system as fully secured or fully production-ready based on these tests.
