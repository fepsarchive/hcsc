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
13. Release Hardening Quality Gate
14. Production Runtime Readiness Policy
15. Integration Endpoint Migration

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
- GitHub Actions kalite kapısı eklendi
- production readiness health/config politikası eklendi
- production system-owner seed fallback kapatıldı
- IntegrationEndpoint migration eklendi
- tenant ve release sınırı regresyon testleri eklendi

## Production env checklist

- `DATABASE_URL`
- `DIRECT_URL`
- `APP_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `TWO_FACTOR_ENCRYPTION_KEY`
- `RECOVERY_CODE_HASH_KEY`
- `INTEGRATION_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID`
- managed Strix için `STRIX_API_TOKEN`
- self-hosted Strix için runner URL/token/callback token

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

- GitHub branch protection içinde `HCSC Quality Gate` required check olarak seçilmeli
- Vercel projesi repo ve `main` branch’e bağlanmalı
- production env değerleri Vercel’e girilmeli
- `npm run db:migrate:deploy` production veritabanında çalıştırılmalı
- Upstash/Resend/Strix gerçek anahtarlarıyla canlı smoke test
- multi-organization switcher UX
- invite acceptance sonrası daha gelişmiş organization selection akışı
- gerçek cihazda mobil görsel QA
