# HCSC v2 Foundation

Hybrid Cloud Security Console (HCSC), **“Hibrit Bulut Ortamında Veri Depolama ve Yönetimi İçin Aktif Savunma Tabanlı Güvenlik Mimarisi Tasarımı”** başlıklı bitirme tezinin ürünleşebilir SaaS foundation sürümüdür.

HCSC v2 foundation:

- Prisma + Neon/PostgreSQL kalıcı veri katmanı
- DB-backed auth / session / 2FA
- organization-scoped API katmanı
- backend risk / Zero Trust / deception / compliance / report engine’leri
- API-first frontend store hydration
- güvenli deception trap endpoint
- DB snapshot tabanlı report print flow

## Local kurulum

1. `.env.example` dosyasını `.env` olarak kopyala.
2. PostgreSQL veya Neon bağlantısını `DATABASE_URL` ve `DIRECT_URL` alanlarına gir.
3. Bağımlılıkları yükle:

```bash
npm install
```

4. Prisma Client üret:

```bash
npm run prisma:generate
```

5. Migration uygula:

```bash
npx prisma migrate dev --name init
```

6. Demo veriyi yükle:

```bash
npm run db:seed
```

7. Geliştirme sunucusunu başlat:

```bash
npm run dev
```

## Demo kullanıcılar

- `security.admin@hcsc.local`
- `analyst@hcsc.local`
- `compliance@hcsc.local`
- `auditor@hcsc.local`
- `executive@hcsc.local`

Parola:

```txt
demo123
```

2FA demo kodu:

```txt
123456
```

## API-first mimari

Frontend store korunur, ancak primary source backend API’dir.

- API başarılıysa state DB’den hydrate olur
- API başarısızsa kontrollü mock fallback korunur
- organization scope client değil backend session context ile çözülür

## Backend engine’ler

- Risk Engine: asset risk skorunu policy + event + deception sinyaline göre hesaplar
- Zero Trust Engine: access request kararını server-side üretir
- Deception Engine: güvenli deception simülasyonu ve trap olaylarını üretir
- Event / SOAR Engine: playbook, timeline, containment ve audit akışını yönetir
- Compliance Engine: NIST CSF 2.0 / KVKK / GDPR / ISO 27001 görünümünü hesaplar
- Report Engine: kalıcı snapshot tabanlı rapor üretir

## Executive demo

`/dashboard` veya `/simulations` üzerinden **Demo Senaryosu Başlat** aksiyonu çalıştırıldığında:

1. access request oluşturulur
2. Zero Trust kararı üretilir
3. deception alarmı üretilir
4. compliance yeniden hesaplanır
5. report oluşturulur
6. audit log ve notification kayıtları güncellenir

## Trap endpoint etik sınırı

`/api/trap/[trapSlug]` endpoint’i:

- gerçek veri döndürmez
- gerçek backend kaynağına proxy olmaz
- exploit çalıştırmaz
- hack-back yapmaz
- saldırgana saldırmaz

Yalnızca güvenli deception logging, erken uyarı, audit ve notification üretir.

## Report print flow

- `/reports/[id]/print` sayfası DB snapshot üzerinden yüklenir
- `/api/reports/[id]/print-payload` normalize edilmiş print payload döner
- `/api/reports/[id]/print` yazdırma aksiyonunu audit log’a işler

## Build ve kalite kontrolleri

```bash
npm run lint
npm run build
```

## Deployment notu

Vercel deploy için Prisma Client generate zinciri önemlidir.

- `postinstall` veya build öncesi `prisma generate` çalışmalıdır
- final production cleanup ve deploy doğrulaması foundation sonrası ayrıca yapılacaktır

## Güvenlik ve etik not

Bu uygulama:

- gerçek saldırı yapmaz
- exploit çalıştırmaz
- malware veya ransomware içermez
- saldırgana saldırmaz
- aktif karşı saldırı yürütmez

Deception katmanı yalnızca güvenli gözlem, alarm, izolasyon önerisi ve raporlama amacıyla tasarlanmıştır.
