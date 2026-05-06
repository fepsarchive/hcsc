# HCSC v2 API Design

## Amaç

Bu belge, HCSC v2 için önerilen API yüzeyini tanımlar.

Hedefler:

- frontend store’un API consumer olması
- auth ve tenant scope’un standartlaştırılması
- engine side effect’lerinin server-side yürütülmesi

## Tasarım Prensipleri

1. Tüm API istekleri session-aware olmalı.
2. Tüm tenant-bound route’lar organization scope doğrulamalı.
3. Request validation zorunlu olmalı.
4. Domain logic route içinde değil service katmanında olmalı.
5. Kritik mutation’lar audit log üretmeli.

## Route Kategorileri

- Auth
- Organizations
- Assets
- Identity Profiles
- Access Requests
- Events / SOAR
- Deception
- Compliance
- Reports
- Audit Logs
- Notifications
- Settings
- Simulations
- Trap Endpoints

## Auth Routes

### `POST /api/auth/login`

Amaç:

- email + password doğrulama
- 2FA gerekiyorsa pending session oluşturma

Request:

```json
{
  "email": "security.admin@hcsc.local",
  "password": "demo123"
}
```

Response:

```json
{
  "requires2FA": true,
  "sessionId": "sess_xxx"
}
```

### `POST /api/auth/verify-2fa`

Amaç:

- TOTP ya da mock fallback kod doğrulama

### `POST /api/auth/logout`

Amaç:

- session invalidate

### `GET /api/auth/me`

Amaç:

- current user + organization + permissions

## Organization Routes

### `GET /api/organizations/current`

### `PATCH /api/organizations/current`

### `POST /api/organizations/onboarding`

Amaç:

- onboarding verilerini kaydetmek
- demo seed sürecini tetiklemek

## Asset Routes

### `GET /api/assets`

Query:

- `search`
- `classification`
- `location`
- `riskLevel`
- `encrypted`
- `isDeception`

### `GET /api/assets/:id`

### `POST /api/assets/:id/recalculate-risk`

Amaç:

- backend risk engine tetiklemek

### `POST /api/assets/recalculate-all`

## Identity Routes

### `GET /api/identities`

### `GET /api/identities/:id`

### `PATCH /api/identities/:id/status`

Amaç:

- suspicious / isolated gibi statü güncellemeleri

## Access Request Routes

### `GET /api/access-requests`

### `POST /api/access-requests`

Amaç:

- yeni erişim talebi oluşturmak

### `POST /api/access-requests/:id/evaluate`

Amaç:

- Zero Trust engine çalıştırmak
- karar üretmek
- gerekiyorsa event üretmek
- audit ve notification side effect’leri doğurmak

### `PATCH /api/access-requests/:id/decision`

Amaç:

- manuel override / approval akışı

## Event / SOAR Routes

### `GET /api/events`

Query:

- `severity`
- `status`
- `category`
- `search`

### `GET /api/events/:id`

### `PATCH /api/events/:id/status`

### `POST /api/events/:id/playbook`

Request:

```json
{
  "action": "isolate_identity"
}
```

Sonuç:

- event timeline entry
- playbook execution record
- audit log
- notification

## Deception Routes

### `GET /api/deception-assets`

### `POST /api/deception-assets`

Amaç:

- yeni fake asset oluşturmak

### `POST /api/deception-assets/:id/simulate-access`

Amaç:

- güvenli simülasyon çalıştırmak
- event üretmek
- identity suspicious işaretlemek
- report ilişkilendirmek

### `GET /api/deception-assets/:id/triggers`

## Compliance Routes

### `GET /api/compliance/current`

### `POST /api/compliance/recalculate`

Amaç:

- NIST CSF, KVKK, GDPR snapshot oluşturmak

## Report Routes

### `GET /api/reports`

### `GET /api/reports/:id`

### `POST /api/reports/generate`

Request:

```json
{
  "type": "demo"
}
```

### `GET /api/reports/:id/print-payload`

Amaç:

- print sayfası için normalized render payload döndürmek

### `GET /api/reports/:id/markdown`

### `POST /api/reports/:id/print`

Amaç:

- print action audit kaydı üretmek

## Audit Log Routes

### `GET /api/audit-logs`

Query:

- `search`
- `module`
- `severity`
- `actorId`
- `cursor`

### `GET /api/audit-logs/:id`

## Notification Routes

### `GET /api/notifications`

### `POST /api/notifications/:id/read`

### `POST /api/notifications/read-all`

## Settings Routes

### `GET /api/settings`

### `PATCH /api/settings/profile`

### `PATCH /api/settings/security`

### `PATCH /api/settings/organization`

### `PATCH /api/settings/risk-policy`

### `PATCH /api/settings/report-branding`

### `PATCH /api/settings/notifications`

### `POST /api/settings/demo/reset`

### `POST /api/settings/demo/seed`

### `POST /api/settings/demo/executive`

## Simulation Routes

### `GET /api/simulations`

### `POST /api/simulations/:scenarioId/run`

### `POST /api/simulations/executive-demo`

Amaç:

- executive demo akışını tek endpoint ile tetiklemek

## Trap Endpoint Tasarımı

### `ALL /api/trap/:trapSlug`

Amaç:

- deception lure endpoint
- gerçek veri sağlamayan güvenli cevap
- request fingerprint loglama

Beklenen davranış:

1. organization scope çözülür
2. trap asset doğrulanır
3. request metadata yakalanır
4. deception trigger kaydı oluşur
5. critical event üretilir
6. audit log eklenir
7. notification oluşturulur
8. güvenli generic response döndürülür

## Response Standardı

Öneri:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  },
  "error": null
}
```

Hata:

```json
{
  "data": null,
  "meta": {
    "requestId": "req_xxx"
  },
  "error": {
    "code": "FORBIDDEN",
    "message": "Bu işlem için yetkiniz yok."
  }
}
```

## Validation

Öneri:

- Zod bazlı request validation
- route seviyesinde parse
- service seviyesinde domain validation

## Authorization

Her mutation için:

- session zorunlu
- organization membership zorunlu
- permission check zorunlu

## Idempotency ve Side Effects

Kritik endpoint’lerde dikkat:

- report generation tekrarlarında duplicate kayıt oluşmamalı
- playbook execution çift çalıştırılmamalı
- deception simulate işlemleri açıkça yeni trigger üretir

## Sonuç

Bu API tasarımı, HCSC v1 UI katmanını korurken, v2’de backend merkezli güvenlik platformuna geçiş için yeterli kontratı tanımlar.
