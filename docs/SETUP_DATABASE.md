# HCSC v2 Database Setup

Bu belge, HCSC v2 foundation için PostgreSQL + Prisma kurulum adımlarını açıklar.

Bu pakette:

- veritabanı altyapısı kurulur
- seed verisi hazırlanır
- Prisma client üretilir
- mevcut v1 UI/mock store bozulmaz
- uygulama henüz database'e bağlanmaz

## 1. PostgreSQL kurulumu

Makinede PostgreSQL çalışıyor olmalı.

Örnek yerel veritabanı:

- database: `hcsc`
- host: `localhost`
- port: `5432`

Örnek kullanıcı:

- user: `USER`
- password: `PASSWORD`

Örnek veritabanı oluşturma:

```sql
CREATE DATABASE hcsc;
```

## 2. `.env` ayarı

Repo kökünde `.env.example` dosyasını `.env` olarak kopyala:

```bash
cp .env.example .env
```

Sonra `DATABASE_URL` ve `DIRECT_URL` alanlarını kendi PostgreSQL bilgilerine göre güncelle.

Örnek:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/hcsc?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/hcsc?schema=public"
APP_URL="http://localhost:3000"
SESSION_SECRET="change-me-in-production"
```

## 3. Bağımlılıkları kur

```bash
npm install
```

## 4. Prisma client üret

```bash
npx prisma generate
```

Alternatif script:

```bash
npm run prisma:generate
```

## 5. İlk migration oluştur

```bash
npx prisma migrate dev --name init
```

Alternatif script:

```bash
npm run prisma:migrate -- --name init
```

## 6. Seed verisini yükle

```bash
npm run db:seed
```

Seed şu demo foundation verilerini üretir:

- `AstraSec Financial Cloud Lab` organization
- demo kullanıcılar
- memberships
- settings
- risk policy
- report branding
- asset örnekleri
- identity profile örnekleri
- access requests
- security events
- deception assets
- compliance snapshot
- report örneği
- audit logs
- notifications

Seed idempotent tasarlanmıştır; tekrar çalıştırıldığında duplicate üretmemelidir.

## 7. Prisma Studio

```bash
npx prisma studio
```

Alternatif script:

```bash
npm run prisma:studio
```

## 8. Troubleshooting

### `DATABASE_URL is required`

`.env` dosyasının oluşturulduğundan ve `DATABASE_URL` alanının dolu olduğundan emin ol.

### Prisma client generate hatası

Önce:

```bash
npm install
```

Sonra tekrar:

```bash
npx prisma generate
```

### Migration sırasında bağlantı hatası

Kontrol et:

- PostgreSQL çalışıyor mu?
- port doğru mu?
- kullanıcı/parola doğru mu?
- veritabanı oluşturuldu mu?

### Seed foreign key hatası

Önce migration'ın başarıyla tamamlandığını doğrula:

```bash
npx prisma migrate dev --name init
```

Sonra seed çalıştır:

```bash
npm run db:seed
```

### Next.js build bozulur mu?

Bu pakette hayır.

Çünkü:

- mevcut mock store korunur
- mevcut UI database'e bağlanmaz
- auth/session akışına dokunulmaz
- API route yazılmaz

## 9. Prisma 7 notu

Bu projede Prisma 7 kullanıldığı için bağlantı ayarı `prisma.config.ts` içinde tutulur.

Ek olarak PostgreSQL için Prisma client `@prisma/adapter-pg` ile başlatılır.

Bu yüzden:

- `prisma/schema.prisma` içinde provider tanımı vardır
- bağlantı URL'si ise `prisma.config.ts` tarafından okunur

## 10. Sonraki adım

Bu paketten sonra önerilen v2 foundation sırası:

1. auth/session route taslağı
2. current user / current organization read layer
3. audit log persistence read API
4. notifications persistence read API
5. assets/events/access requests repository katmanı
