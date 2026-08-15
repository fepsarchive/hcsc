# HCSC v2.0 Backend Security Foundation

## Adversary Validation
- HCSC tasarım dilinde yetkili hedef, güvenlik testi koşusu ve bulgu merkezi eklendi.
- Demo ve self-hosted runner sağlayıcıları için ayrık provider sınırı kuruldu.
- Süresi dolmamış yazılı yetki, organization scope ve production kilidi zorunlu hale getirildi.
- Yüksek/kritik doğrulama bulguları Security Event ve bildirim akışına bağlandı.

## Added
- Security Event Engine foundation with organization-scoped create/list/detail/status/metrics functions.
- Data Asset Inventory foundation on the existing `Asset` model with inventory metadata, risk fields, create/update APIs, and safe demo seed data.
- Deterministic Risk Scoring service for event, asset, user, organization, and security health calculations.
- `/api/security/events`, `/api/security/events/[id]`, and status update endpoints.
- High severity notification linkage through the centralized security event service.

## Improved
- Audit/security event correlation for auth failures, MFA failures, unauthorized admin attempts, role/status/settings updates, report generation, trap triggers, and high-risk asset changes.
- Trap endpoint event integration while preserving safe 404 responses and rate limiting.
- Admin overview and security posture backend metrics now use real security event and asset risk data.

## Security
- Secret-safe metadata sanitization for security events.
- Organization-scoped security event and data asset queries.
- Existing System Owner admin guards and server-only Prisma access remain intact.
- No client-side database access or real trap data exposure was added.

## Verification
- lint: pass
- typecheck: pass
- test: pass (10/10)
- build: pass
- prisma validate/generate: pass

# HCSC v1.1 Stable Release

## Fixed
- Fixed the 2FA "Farkli hesapla giris yap" loop by clearing the pending session before routing back to `/login`.
- Stabilized React external-store subscriptions to avoid `getServerSnapshot` and maximum update depth loops.
- Added explicit redirect tests for unauthenticated, pending 2FA, verified user, and System Owner states.

## Improved
- Moved app-shell redirect decisions into a small testable helper.
- Reduced broad store subscriptions in high-traffic layout and dashboard components.
- Added a minimum in-memory rate limit guard for public deception trap probes.

## Security
- Logout cleanup now covers pending 2FA sessions before account switching.
- Trap endpoints continue to return only a safe 404 response and never expose real resources or secrets.
- Trap probes create defensive telemetry while rate limiting repeated writes from the same source.

## QA
- Added `npm run test` using Node's test runner through `tsx`.
- Added `npm run typecheck`.
- Verified lint, typecheck, test, Prisma validate/generate, production build, and local browser smoke.

## Known Limitations
- `prisma migrate status` currently returns a Prisma schema engine error against the configured Neon datasource.
- `npm audit` reports transitive dependency vulnerabilities; no automatic dependency upgrade was applied in this stabilization pass.
- Seed was not run automatically because it writes to the configured database.

## Verification
- lint: pass
- typecheck: pass
- test: pass
- build: pass
- prisma: validate/generate pass; migrate status blocked by schema engine error
- smoke: local `/login` -> `/verify-2fa` -> switch account -> `/login` pass
