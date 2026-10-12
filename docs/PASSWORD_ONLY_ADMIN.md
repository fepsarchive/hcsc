# Operator-approved password-only admin

## Current decision — 2026-10-09

The operator subsequently requested real MFA re-enrollment for the designated admin after losing the authenticator entry. `HCSC_PASSWORD_ONLY_ADMIN_ENABLED=false` is now set locally and in Vercel Production. The email/immutable-ID configuration remains an explicit admin designation; it no longer exempts the account from MFA when the flag is false. Removing either identifier or the database ADMIN role removes that designation. Existing system-owner access is unchanged.

The updated code preserves a one-hour session deadline for this designated admin even when using real MFA. Turning off the exception revokes prior password-only sessions on access. Environment edits do not update already-built Vercel deployments. See [SYSTEM_SCAN_2026-10-09.md](SYSTEM_SCAN_2026-10-09.md) for the actual release/recovery state.

The following sections describe the optional exception and its historical provisioning, not the currently enabled login policy.

This is a deliberate reduction in authentication strength for one approved admin, not an MFA verification. Use a unique strong password. Other accounts retain their existing MFA requirements.

## Configuration (server only)

All three values are required in each runtime environment:

```dotenv
HCSC_PASSWORD_ONLY_ADMIN_ENABLED=true
HCSC_PASSWORD_ONLY_ADMIN_EMAIL=<approved-email>
HCSC_PASSWORD_ONLY_ADMIN_USER_ID=<existing-immutable-user-id>
```

The database user must also be active with `platformRole=ADMIN`. Email alone never grants access. Public registration cannot assign platform-admin rights. No `NEXT_PUBLIC_` setting is used. This exception does not replace or remove the existing system owner.

## Provision an existing account

Supply the environment's own DATABASE_URL through a secure runtime; do not paste it into chat or commit it. The helper loads Next.js env files (development by default, production when NODE_ENV=production).

```sh
node --import tsx scripts/provision-password-only-admin.ts
# Review the exact account and organization before applying:
node --import tsx scripts/provision-password-only-admin.ts --apply
```

The helper requires matching email + ID, active status and an existing security-admin membership. It grants platform admin, revokes existing sessions, and writes an audit entry. It does not create a password, reset a password, delete TOTP secrets, change the system owner, or add access to other workspaces.

## Session behavior

- Correct password and normal rate limits remain mandatory.
- Password-only admin sessions and their browser cookies expire after one hour. Activity does not renew the deadline; accepting a workspace invite preserves the original expiry.
- The database and API retain `is2FAVerified/twoFactorVerified=false`; a distinct `twoFactorExempt=true` represents the policy exception.
- Each request rechecks current identity, active status, membership and platform role.
- Only a fresh password login creates an exempt active session. Existing pending sessions are not upgraded automatically.
- Every exempt login writes a warning audit event and attempts a security notification.
- MFA enrollment remains intact for rollback. Recovery-code UI does not claim MFA verification.

## Rollback

Set `HCSC_PASSWORD_ONLY_ADMIN_ENABLED=false` and restart/redeploy the runtime. Existing password-only sessions are rejected and revoked on their next request. Subsequent logins require normal MFA. If an immediate global cutoff is needed, revoke this user's sessions in the database/admin UI as well. Rotating the password is not necessary to disable the exception.

## Deployment gate

Verify the same immutable account in the production database; never assume a local connection targets production. Set the production values, deploy a reviewed build without assigning domains, then check readiness and a real password login before promoting it. Keep secrets out of files/logs. A passed build is not proof of working Redis, email or Strix credentials.

`npm run build` executes `scripts/provision-password-only-admin.ts --deployment-check` before Next.js compilation. When the exception is enabled, this read-only guard requires the exact active admin and an existing security-admin membership in the build environment's database. It never changes roles, passwords or sessions. A failed check blocks the build. It is skipped when the exception is disabled. Deployment-specific overrides do not persist as project environment variables for future deployments.
