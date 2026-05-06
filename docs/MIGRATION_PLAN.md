# HCSC v2 Migration Plan

## Amaç

Bu belge, v1 mock/session tabanlı HCSC’yi v2 Prisma + PostgreSQL + backend service mimarisine güvenli biçimde taşımak için aşamalı planı tanımlar.

## Migration İlkeleri

1. UI kırılmayacak
2. her adımda `npm run build` çalışır kalacak
3. mock fallback kontrollü süre devam edebilir
4. tenant isolation en baştan ele alınacak
5. engine mantığı çift kaynaklı kalmamalı

## Başlangıç Durumu

V1’de:

- tek frontend uygulaması var
- merkezi store mock veriden türetiyor
- auth/session tarayıcı sessionStorage tabanlı
- engines browser içinde çalışıyor

## Hedef Durum

V2’de:

- PostgreSQL kalıcı kaynak olacak
- Prisma veri erişim katmanı olacak
- auth/session backend kontrollü olacak
- engines backend services olacak
- frontend store API consumer olacak

## Aşamalı Geçiş Planı

## Aşama 1 — Platform Hazırlığı

İşler:

- `docs/` planları tamamlanır
- `.env` yapısı tanımlanır
- Prisma eklenir
- PostgreSQL bağlantısı kurulur
- ilk schema çıkarılır
- seed script hazırlanır

Çıktı:

- DB çalışır
- migration pipeline çalışır
- demo data veritabanına basılabilir

Risk:

- mock data ile DB seed aynı isimlendirmeyi taşımıyorsa mapping zorlaşır

## Aşama 2 — Auth ve Organization Persist Etme

İşler:

- users, organizations, memberships, sessions modelleri devreye alınır
- login/2FA/logout API route’ları yazılır
- mevcut auth store adapter ile API’ye bağlanır

Geçiş tekniği:

- önce mock login ekranı UI olarak korunur
- altındaki state server route’larına yönlendirilir

Çıktı:

- session kalıcı hale gelir
- protected route mantığı backend destekli olur

## Aşama 3 — Audit Logs ve Notifications Persist Etme

İşler:

- audit log DB modeli aktive edilir
- notification DB modeli aktive edilir
- mevcut mutation akışları audit/notification servislerine bağlanır

Neden erken?

- sistem davranışlarının izlenebilirliği migration boyunca da korunmalıdır

## Aşama 4 — Core Domain Persistence

İşler:

- assets
- identities
- access requests
- events
- deception assets
- compliance snapshots
- reports
- settings

DB-backed hale getirilir.

Geçiş tekniği:

- önce repository layer
- sonra service layer
- sonra API
- sonra client adapter

## Aşama 5 — Engine Migration

İşler:

- risk engine backend service’e taşınır
- zero trust engine backend service’e taşınır
- deception engine backend service’e taşınır
- event/playbook/compliance/report motorları server-side olur

Kritik not:

- frontend kopyaları aynı anda karar üretmemeli

Öneri:

- bir feature flag ile:
  - `ENGINE_MODE=mock`
  - `ENGINE_MODE=server`

yaklaşımı kullanılabilir.

## Aşama 6 — Reports ve Print Pipeline

İşler:

- reports persistence
- report snapshot JSON
- print payload generation
- print action audit logging

Çıktı:

- aynı rapor daha sonra tekrar açıldığında değişmez

## Aşama 7 — Deception Trap Endpoint

İşler:

- trap asset modelini aktive et
- trap endpoint’i route handler olarak ekle
- trigger logging
- critical event üretimi
- suspicious identity marking

Kritik güvenlik notu:

- trap endpoint gerçek veri dönmemeli
- gerçek backend resource’a proxy olmamalı
- standart güvenli response dönmeli

## Aşama 8 — Frontend Adapter Temizliği

İşler:

- mock data bağımlılıklarını azalt
- store içindeki mock derivation akışını kaldır
- API-first selector ve mutation akışına geç

## Aşama 9 — Hardening

İşler:

- error boundaries
- retry policy
- pagination
- query caching
- observability
- retention jobs

## Veri Geçiş Stratejisi

V1 → V2 için gerçek kullanıcı verisi yoksa:

- seed reset yapılabilir

Eğer ileride demo sırasında oluşturulmuş datayı korumak istenirse:

- `mock-data.ts` -> seed mapping script
- report snapshots -> DB insert
- audit logs -> import script

## UI Bozulmadan Nasıl İlerlenir?

1. mevcut route’lar aynı kalır
2. component prop contract’ları korunur
3. store aynı shape’i döndürmeye devam eder
4. veri kaynağı sadece mock yerine API olur

## Feature Flag Önerisi

Önerilen flag’ler:

- `USE_DB_PERSISTENCE`
- `USE_SERVER_ENGINES`
- `USE_REAL_AUTH`
- `USE_TRAP_ENDPOINT`

Bu sayede migration sırasında:

- belirli katmanlar kademeli açılabilir

## Riskler

### 1. Çift kaynak problemi

Mock ve DB birlikte aktif kalırsa:

- ekranlar tutarsız veri gösterebilir

### 2. Tenant leakage

Organization filter unutulursa:

- farklı tenant verileri sızabilir

### 3. Report drift

Canlı veri ile geçmiş rapor render edilirse:

- savunma ve denetim bütünlüğü bozulur

### 4. Trap misuse

Trap endpoint yanlış tasarlanırsa:

- deception sınırı ihlal edilebilir

## Done Kriterleri

Migration başarılı sayılması için:

- UI aynı kalmalı
- build temiz olmalı
- auth/session DB-backed olmalı
- assets/events/reports/audit logs DB-backed olmalı
- engine kararları server-side olmalı
- report print route kalıcı report payload kullanmalı

## Sonuç

Bu migration planı; HCSC’yi kırmadan, adım adım, test edilebilir ve rollback-friendly şekilde v2 platformuna taşımayı hedefler.
