# Production Release Checklist

## Otomatik kalite kapısı

Her pull request ve `main`/`codex/**` push işleminde GitHub Actions şu kontrolleri çalıştırır:

1. lint
2. TypeScript typecheck
3. birim ve güvenlik regresyon testleri
4. Prisma şema doğrulaması
5. production runtime readiness kontrolü
6. API envanteri
7. production build

Yerelde aynı zincir: `npm run ci:verify`

## Zorunlu production env

- `DATABASE_URL`
- `DIRECT_URL` (migration işlemleri için önerilir)
- `APP_URL` (localhost olmayan HTTPS adresi)
- `SESSION_SECRET` (en az 32 karakter, benzersiz)
- `JWT_SECRET` (en az 32 karakter, benzersiz)
- `TWO_FACTOR_ENCRYPTION_KEY` (en az 32 karakter, benzersiz)
- `RECOVERY_CODE_HASH_KEY` (en az 32 karakter, benzersiz)
- `INTEGRATION_ENCRYPTION_KEY` (en az 32 karakter, benzersiz)
- `RESEND_API_KEY`
- `MAIL_FROM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID`
- `HCSC_TEST_AUTH_BYPASS_ENABLED=false`

## Strix production seçimi

Demo provider production readiness kontrolünden geçmez.

Managed Strix:

- `HCSC_SECURITY_TEST_PROVIDER=managed`
- `STRIX_API_BASE_URL=https://app.strix.ai/api/v1`
- `STRIX_API_TOKEN`

Self-hosted Strix:

- `HCSC_SECURITY_TEST_PROVIDER=self_hosted`
- `STRIX_RUNNER_URL` (HTTPS)
- `STRIX_RUNNER_TOKEN`
- `STRIX_RUNNER_CALLBACK_TOKEN`
- `STRIX_RUNNER_HEALTH_PATH=/healthz`

## Veri hazırlığı ve yayın

1. `npm ci`
2. `npm run db:migrate:deploy`
3. `npm run owner:check`
4. `npm run ci:verify`
5. staging deployment üzerinde smoke test
6. production promotion

Production’da `db:push` kullanılmaz; sürümlenmiş migration’lar `db:migrate:deploy` ile uygulanır.

## Health doğrulaması

- `GET /api/health/live` → süreç ayakta ise 200
- `GET /api/health/ready` → DB ve production configuration hazır ise 200, aksi halde 503
- system owner ile `GET /api/admin/system-health` → DB, Redis, Resend, Strix ve env ayrıntıları

## Auth smoke test

- register → 2FA setup → recovery codes → onboarding → dashboard
- logout → login → TOTP verify → dashboard
- logout → login → recovery code verify → dashboard
- forgot password → mail → reset password → new password login
- system owner login → 2FA verify → `/admin`
- normal user login → `/dashboard`, `/admin` erişimi reddedilir
- production’da seed fallback system owner ve test 2FA bypass çalışmaz

## Tenant ve integration smoke test

- iki farklı organization ile asset/event/report kayıtları birbirinden görünmez
- webhook endpoint sadece kendi organization’ı tarafından listelenir/silinir/test edilir
- webhook imzası alıcı tarafta doğrulanır
- Strix target için açık izin, kapsam ve bitiş tarihi olmadan scan başlatılamaz
- production scan ayrıca `HCSC_SECURITY_TEST_ALLOW_PRODUCTION=true` olmadan çalışmaz

## Mail testi

- kayıtlı kullanıcı için password reset maili
- kayıtlı olmayan kullanıcı için generic başarı ve mail attempt olmaması
- invite maili
- tüm mail tiplerinde ortak HCSC HTML/text şablonu

## UI / gerçek cihaz QA

- `/login`
- `/register`
- `/verify-2fa`
- `/onboarding`
- `/forgot-password`
- `/reset-password`
- `/settings`
- `/dashboard`
- tarayıcı %100 iken ürünün global %90 ölçeği ve sayfa bazlı taşma kontrolü

## Rollback planı

- son stabil commit hash’ini kaydet
- Vercel previous deployment rollback seçeneğini doğrula
- migration geri alma yerine ileri-düzeltme migration’ı hazırla
- Redis/mail/Strix env değişikliklerini ayrı rollback notlarıyla sakla
