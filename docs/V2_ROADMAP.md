# HCSC v2 Roadmap

## Amaç

HCSC v1.0; tez savunmasına uygun, güçlü bir ürün prototipi sağlar.  
HCSC v2 hedefi ise bu prototipi:

- kalıcı veri katmanına sahip,
- deployment-ready,
- multi-tenant,
- gerçek session/auth altyapısına bağlanabilir,
- backend merkezli güvenlik motorları kullanan

ürünleşebilir bir SaaS platform omurgasına taşımaktır.

Bu aşamada yeni feature parlatmaktan çok, platformlaşma hedeflenir.

## V1 Durum Özeti

Mevcut v1 uygulaması:

- Next.js App Router tabanlıdır.
- UI katmanı `shadcn/ui dashboard-01` çizgisindedir.
- Merkezi state, `src/store/security-console-store.ts` içinde local/mock mantıkla tutulur.
- Risk, Zero Trust, Deception, Event, Compliance ve Report motorları frontend içinde çalışır.
- Login, 2FA, onboarding, audit logs, notifications ve reports dahil olmak üzere uçtan uca demo akışı vardır.
- Ancak veri kalıcı değildir; süreçler tarayıcı session/local state mantığında yaşar.

## V2 Ürünleşme İlkeleri

V2 boyunca şu ilkeler korunmalıdır:

1. **UI/UX bozulmayacak**
   - Mevcut dashboard-01 görünümü korunur.
   - Sidebar, header, cards, drawers ve data-table dili değişmez.

2. **Güvenlik motorları frontend’den backend’e taşınacak**
   - Frontend sonuç tüketicisi olacak.
   - Karar motorları API tarafında çalışacak.

3. **Gerçek saldırı yok**
   - Deception sadece güvenli trap/honeypot mantığında kalacak.
   - Saldırgana saldırma, exploit, malware, hack-back yok.

4. **Multi-tenant düşünülerek tasarlanacak**
   - Her kayıt organization scope’u ile tutulacak.
   - Yetkilendirme tenant izolasyonunu bozmamalı.

5. **Aşamalı migration yapılacak**
   - v1 demo akışı çalışır durumda kalmalı.
   - Backend devreye alınırken ekranlar kırılmamalı.

## V2 Kapsamı

### 1. Persistence Layer

- Prisma ORM
- PostgreSQL
- migration yönetimi
- seed verileri
- organization scoped veri modeli

### 2. Auth & Session Layer

- gerçek user/session modeli
- password hashing
- 2FA/TOTP temelli genişletilebilir mimari
- session persistence
- protected API access

### 3. Multi-Tenant SaaS Foundation

- organizations
- memberships
- roles
- scoped permissions
- org-level settings

### 4. Backend Engine Layer

- risk engine
- zero trust engine
- deception engine
- event/soar engine
- compliance engine
- report engine

### 5. API Layer

- route handlers
- schema validation
- tenant-aware service methods
- audit log ve notification üretimi

### 6. Reporting & Export

- kalıcı rapor kayıtları
- renderable print payload
- export pipeline hazırlığı

### 7. Connector/Integration Foundation

- gelecekte SIEM, IAM, CSPM, DLP, ticketing ve mail/slack entegrasyonları için connector tasarımı

## Fazlara Ayrılmış Plan

## Faz 1 — Platform Omurgası

Hedef:

- Prisma kurulumu
- PostgreSQL bağlantısı
- temel schema
- migration workflow
- seed mekanizması

Çıktılar:

- `prisma/schema.prisma`
- `DATABASE_URL` bazlı yapı
- local dev veritabanı
- demo seed script

Risk:

- multi-tenant ilişkiler başlangıçta yanlış modellenirse ileride migration maliyeti yükselir.

## Faz 2 — Auth, Session, Organization

Hedef:

- users
- organizations
- memberships
- sessions
- 2FA secrets / recovery model

Çıktılar:

- session persistence
- organization seçimi
- route ve API auth guard’ları

Risk:

- session modeli tenant isolation ile birlikte tasarlanmazsa authorization katmanı dağılır.

## Faz 3 — Domain Data Persistence

Hedef:

- assets
- identities
- access requests
- events
- deception assets
- reports
- notifications
- audit logs
- settings

Çıktılar:

- tüm ana modüllerin DB-backed hale gelmesi

Risk:

- v1 store ile DB verisi aynı anda yönetilirse state drift oluşabilir.

## Faz 4 — Engine Backend Migration

Hedef:

- frontend engine’leri backend service katmanına taşımak
- API üstünden karar üretmek
- event/notification/audit side effect’lerini server-side yapmak

Çıktılar:

- service layer
- deterministic command handlers
- audit ve notification side effects

Risk:

- frontend ile backend aynı iş kuralını paralel üretirse çifte event oluşabilir.

## Faz 5 — Reporting, Trap Endpoint, Connector Foundation

Hedef:

- kalıcı reports
- print payload standardı
- deception trap endpoint
- connector registration modeli

Çıktılar:

- report snapshots
- trap hit logging
- connector abstraction

Risk:

- trap endpoint dikkatli tasarlanmazsa “deception” ile “gerçek erişim noktası” karışabilir.

## Faz 6 — Release Hardening

Hedef:

- observability
- error handling
- background tasks
- deployment readiness
- data retention kuralları

## v2 Başarı Kriterleri

V2 tamamlandığında:

- veri session’dan bağımsız kalıcı olacak
- organization bazlı izolasyon olacak
- auth/session akışı backend destekli olacak
- risk/zero-trust/deception/event/report kararları server-side üretilecek
- audit logs ve notifications kalıcı olacak
- reports DB-backed ve export-ready olacak
- UI aynı ürün hissini koruyacak

## V1 UI Nasıl Korunur?

V2 boyunca frontend yaklaşımı:

1. mevcut component ağacı korunur
2. store doğrudan mock data üretmek yerine API consumer olur
3. önce adapter katmanı eklenir
4. sonra mock üretim adım adım kaldırılır
5. kullanıcı aynı ekranları görmeye devam eder

## Önerilen Teknik Öncelik Sırası

1. Prisma + PostgreSQL
2. Organization + Membership modeli
3. Session/Auth altyapısı
4. AuditLogs + Notifications persistence
5. Assets / Events / Requests persistence
6. Backend engines
7. Reports persistence + print payload
8. Deception trap endpoint
9. Connector foundation
10. Deployment hardening

## Kapsam Dışı Olanlar

Bu roadmap içinde doğrudan hedeflenmeyenler:

- gerçek saldırı otomasyonu
- exploit code
- malware/ransomware işlevleri
- saldırgana geri saldırı
- gerçek üretim IAM/SIEM entegrasyonlarının tamamı

## Sonuç

V2; HCSC’yi “tez demosu” seviyesinden “ürünleşebilir güvenlik SaaS altyapısı” seviyesine taşır.  
En kritik mimari karar: **iş kurallarının tarayıcıdan alınarak tenant-aware backend service katmanına taşınmasıdır.**
