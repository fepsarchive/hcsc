# HCSC v2 Production Checkpoint

## Tamamlanan ana paketler

- Prisma + PostgreSQL foundation
- auth / session / 2FA persistence
- core API + persistence
- backend engines
- frontend API adapter
- trap endpoint + print flow
- auth hardening
- gerçek TOTP 2FA enrollment
- recovery codes
- Resend password reset
- distributed rate limit
- team management foundation
- security headers + error UI

## Auth hardening tamamlandı

- DB-backed register
- transaction-safe user / organization / membership oluşturma
- session cookie güvenliği
- TOTP 2FA enrollment
- recovery code kurtarma akışı
- Resend password reset maili
- auth endpoint rate limiting

## Required env vars

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

## Manual smoke test checklist

- register → 2FA setup → recovery codes → onboarding → dashboard
- logout → login → TOTP verify → dashboard
- logout → login → recovery code verify → dashboard
- forgot password → reset password → new password login
- settings → recovery codes regenerate
- settings → team invite / role update / revoke
- auth rate limit 429
- mobile auth and settings layouts

## Bilinen sınırlar

- gerçek Upstash production env ile canlı smoke test bu local oturumda yapılamadı
- invite acceptance akışı ilk MVP sürümünde tek aktif organization session modeline göre çalışır
- recovery codes için opsiyonel expiry politikası henüz yok
- tam mobil görsel QA için gerçek cihaz tarayıcı turu önerilir
