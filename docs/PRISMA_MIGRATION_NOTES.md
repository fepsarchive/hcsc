# Prisma Migration Notes

## Paket 1 Kapsamı

Bu notlar, HCSC v2 foundation için eklenen Prisma + PostgreSQL altyapısının ilk kullanım adımlarını özetler.

Bu aşamada:

- mevcut v1 UI korunur
- mock store silinmez
- database katmanı fallback mantığıyla eklenir
- `HCSC_DATABASE_MODE=mock` iken uygulama mevcut davranışını koruyabilir
- `HCSC_DATABASE_MODE=hybrid` veya `database` ile Prisma katmanı devreye alınabilir

## Eklenen Dosyalar

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/seed.ts`
- `src/lib/db.ts`
- `.env.example`

## Çevresel Değişkenler

`.env.example` içeriğini `.env` olarak kopyala:

```bash
cp .env.example .env
```

Minimum gereken alanlar:

- `DATABASE_URL`
- `HCSC_DATABASE_MODE`
- `SESSION_SECRET`
- `TOTP_ISSUER`

Prisma 7 notu:

- datasource URL artık `schema.prisma` içinde değil
- `prisma.config.ts` içinde yönetilir
- PostgreSQL bağlantısı Prisma client tarafında `@prisma/adapter-pg` üzerinden açılır

Önerilen ilk mod:

```txt
HCSC_DATABASE_MODE="hybrid"
```

Bu yaklaşım, UI/store migration’ı tamamlanana kadar Prisma katmanını kontrollü açmak için uygundur.

## İlk Kurulum Komutları

Prisma client üret:

```bash
npm run db:generate
```

İlk migration oluştur:

```bash
npm run db:migrate:dev -- --name init_v2_foundation
```

Seed verisini yükle:

```bash
npm run db:seed
```

Gerekirse şemayı migration dosyası üretmeden doğrudan yansıt:

```bash
npm run db:push
```

Prisma Studio aç:

```bash
npm run db:studio
```

## Seed İçeriği

Seed script şu temel kayıtları üretir:

- 1 organization
- 5 demo user
- membership kayıtları
- 2FA secret placeholder kayıtları
- organization settings
- risk policy
- report branding
- temel assets
- temel identity profiles
- access requests
- security events
- deception asset + trigger
- compliance snapshot
- persisted report
- audit logs
- notifications
- simulation run

## Auth / Session Taslağı

Bu pakette auth route’ları henüz yazılmadı.

Ama schema şu foundation’ı hazırlar:

- `User`
- `Membership`
- `Session`
- `TwoFactorSecret`
- `RecoveryCode`

Önemli not:

- seed içindeki parola alanı geçici `sha256$...` biçiminde doldurulur
- bu, gerçek auth implementasyonu değildir
- v2 auth paketinde güçlü bir hash algoritmasına geçilmelidir

## Mock Store ile Birlikte Çalışma

Bu aşamada mock store kaldırılmaz.

Önerilen geçiş:

1. UI mevcut mock state ile çalışmaya devam eder
2. yeni server-side servisler `src/lib/db.ts` üzerinden DB erişimi alır
3. route bazında önce read operasyonları API’ye taşınır
4. sonra mutation akışları server-side engine’lere taşınır

## Riskler

### 1. DATABASE_URL olmadan Prisma kullanım isteği

`requireDb()` bu durumda bilinçli şekilde hata fırlatır.

### 2. Mock ve DB verisinin çakışması

Bu yüzden başlangıçta `hybrid` mod önerilir ve ekranlar tek tek migrate edilir.

### 3. Seed verisi ile v1 mock veri birebir aynı değildir

Bu bilinçli tercihtir. Ama kavramsal domain dili aynıdır:

- assets
- access requests
- events
- deception
- reports
- audit

## Sonraki Paketler

Paket 2 için önerilen sıra:

1. auth route handlers
2. session persistence
3. current user / current organization API
4. audit log read API
5. notification read API

Paket 3 için:

1. assets/events/access requests repositories
2. backend risk/zero trust/event services
3. report persistence API
