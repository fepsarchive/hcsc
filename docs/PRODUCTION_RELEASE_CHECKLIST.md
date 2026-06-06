# Production Release Checklist

## Env vars

- `DATABASE_URL`
- `DIRECT_URL`
- `APP_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `TWO_FACTOR_ENCRYPTION_KEY`
- `RECOVERY_CODE_HASH_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID`

## Build ve veri hazırlığı

1. `npm run prisma:generate`
2. `npm run db:push`
3. `npm run db:seed`
4. `npm run lint`
5. `npm run build`

## Auth smoke test

- register → 2FA setup → recovery codes → onboarding → dashboard
- logout → login → TOTP verify → dashboard
- logout → login → recovery code verify → dashboard
- forgot password → mail → reset password → new password login
- system owner login → 2FA verify → `/admin`
- normal user login → `/dashboard`, `/admin` erişimi reddedilir

## Security smoke test

- settings → recovery codes regenerate
- settings → team invite / revoke / role update
- auth rate limit 429
- `GET /api/auth/me`
- `GET /api/recovery-codes/status`
- normal user ile `GET /api/admin/system-health` → 403
- system owner kendi hesabını pasifleştiremez veya USER rolüne düşüremez

## Mail test

- kayıtlı kullanıcı için password reset maili
- kayıtlı olmayan kullanıcı için generic başarı ve mail attempt olmaması
- invite maili gönderimi

## UI / mobile QA

- `/login`
- `/register`
- `/verify-2fa`
- `/onboarding`
- `/forgot-password`
- `/reset-password`
- `/settings`
- `/dashboard`

## Rollback plan

- son stabil commit hash’ini hazır tut
- Vercel previous deployment rollback seçeneğini doğrula
- Redis/mail env değişikliklerini rollback notlarıyla birlikte sakla
