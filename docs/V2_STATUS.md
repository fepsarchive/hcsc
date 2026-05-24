# HCSC v2 Status

## Tamamlanan paketler

1. Prisma + PostgreSQL + Seed
2. Auth / Session / 2FA
3. Core API + Persistence
4. Backend Engines
5. Frontend API Adapter
6. Trap Endpoint + Report Print
7. Auth Hardening
8. TOTP Enrollment
9. Recovery Codes
10. Resend Password Reset
11. Distributed Rate Limit
12. Production Readiness Final Pack

## Production readiness özeti

- DB persistence completed
- Auth / session completed
- TOTP 2FA completed
- Recovery codes completed
- Password reset mail completed
- Distributed rate limit completed
- Team management foundation completed
- Security headers completed
- Error / not-found UX completed

## Production env checklist

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

## Deploy sonrası smoke test

- register
- 2FA setup
- recovery codes
- onboarding
- login
- forgot password
- reset password
- rate limit 429
- settings security panel
- settings team invite / revoke / role update
- dashboard / settings / print route

## Rollback plan

- son stabil commit’e dön
- Vercel previous deployment rollback kullan
- yeni env değişikliklerini önce staging benzeri ortamda geri al
- mail ve Redis env’lerini tek tek doğrula

## Security / ethics note

HCSC deception yüzeyleri:

- gerçek veri döndürmez
- exploit çalıştırmaz
- malware içermez
- hack-back yapmaz
- saldırgana saldırmaz

## Kalan TODO’lar

- Upstash production env ile canlı smoke test
- multi-organization switcher UX
- invite acceptance sonrası daha gelişmiş organization selection akışı
- gerçek cihazda mobil görsel QA
