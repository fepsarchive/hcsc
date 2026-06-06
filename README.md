# HCSC v2 Production-Ready MVP

Hybrid Cloud Security Console (HCSC), hibrit bulut güvenliği için tasarlanmış çok kiracılı, API-first ve aktif savunma odaklı bir güvenlik operasyon platformudur.

## Tamamlanan production checkpoint

- DB-backed register, session ve organization membership
- gerçek TOTP 2FA enrollment
- recovery codes
- Resend ile password reset mail akışı
- distributed rate limit (Upstash Redis + safe in-memory fallback)
- organization-scoped API ve backend security engines
- trap endpoint, print payload ve release-safe report flow
- settings içinde security ve team management yüzeyleri

## Local kurulum

1. `.env.example` dosyasını `.env` olarak kopyala.
2. PostgreSQL veya Neon bağlantısını `DATABASE_URL` ve `DIRECT_URL` alanlarına gir.
3. Bağımlılıkları yükle:

```bash
npm install
```

4. Prisma client üret:

```bash
npm run prisma:generate
```

5. Şema değişikliklerini uygula:

```bash
npm run db:push
```

6. Başlangıç verisini yükle:

```bash
npm run db:seed
```

7. Geliştirme sunucusunu başlat:

```bash
npm run dev
```

## Production env checklist

Aşağıdaki değişkenler production’da tanımlanmalıdır:

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

Notlar:

- `APP_URL` production’da `https://hcsc.space` olacak şekilde tanımlanmalıdır.
- Admin console erişimi tekil system owner modelindedir; production’da `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID` tanımlanmalıdır.
- `RECOVERY_CODE_HASH_KEY` ayrı tanımlanmalı; `SESSION_SECRET` fallback olarak bırakılmamalıdır.
- `UPSTASH_*` env yoksa local development için in-memory rate limit fallback çalışır. Production’da merkezi Redis tavsiye edilir.

## Auth ve güvenlik yüzeyleri

- kayıt olma akışı DB-backed çalışır
- kullanıcı, organization, membership transaction içinde oluşturulur
- login sonrası TOTP doğrulama zorunludur
- recovery code ile tek kullanımlık kurtarma girişi desteklenir
- password reset token’ı hashli tutulur ve Resend ile e-posta gönderilir
- rate limit auth yüzeylerinde endpoint bazlı uygulanır

## Team management

Settings içinde:

- çalışma alanı üyeleri listelenir
- yeni davet gönderilebilir
- bekleyen davetler görülebilir ve iptal edilebilir
- roller güncellenebilir
- son aktif `Security Admin` korunur
- üyelik kaldırma organization scope içinde çalışır

## Trap endpoint etik sınırı

`/api/trap/[trapSlug]` endpoint’i:

- gerçek veri döndürmez
- gerçek backend kaynağına proxy olmaz
- exploit çalıştırmaz
- hack-back yapmaz
- yalnızca güvenli deception logging, audit ve notification üretir

## Report print flow

- `/reports/[id]/print` sayfası DB snapshot üzerinden yüklenir
- `/api/reports/[id]/print-payload` normalize edilmiş print payload döner
- `/api/reports/[id]/print` yazdırma aksiyonunu audit log’a işler

## Build ve kalite kontrolleri

```bash
npm run lint
npm run build
```

## Deploy sonrası manuel smoke test

- register → 2FA setup → recovery codes → onboarding → dashboard
- logout → login → TOTP verify → dashboard
- logout → login → recovery code verify → dashboard
- forgot password → mail → reset password → new password login
- settings → recovery codes regenerate
- settings → team invite
- settings → role update
- auth endpoint rate limit 429
- `/dashboard`, `/settings`, `/reports/[id]/print`
- mobil auth ekranları ve settings team paneli

## Deployment notu

- Vercel deploy zincirinde `prisma generate` çalıştığından emin olun.
- Upstash timeout/fallback kod tarafında hazırdır; gerçek Redis-backed smoke test production env ile yapılmalıdır.
- Resend mail teslimatı için `RESEND_API_KEY` ve `MAIL_FROM` zorunludur.

## Güvenlik ve etik not

Bu uygulama:

- gerçek saldırı yapmaz
- exploit çalıştırmaz
- malware veya ransomware içermez
- saldırgana saldırmaz
- aktif karşı saldırı yürütmez

Deception katmanı yalnızca güvenli gözlem, alarm, izolasyon önerisi ve raporlama amacıyla tasarlanmıştır.
