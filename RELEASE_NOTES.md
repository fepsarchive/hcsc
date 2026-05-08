# HCSC v2 Foundation Release Notes

## Genel özet

HCSC, v1 tez prototipinden v2 foundation aşamasına taşındı. Bu sürümde ürünleşme için gerekli kalıcı veri, backend API, auth/session, engine ve print/trap omurgası tamamlandı.

## Paket 1 — Prisma + PostgreSQL + Schema + Seed

- Prisma + PostgreSQL foundation kuruldu
- organization-scoped schema oluşturuldu
- idempotent seed ve demo veriler eklendi
- setup ve migration dokümantasyonu hazırlandı

## Paket 2 — Auth / Session / 2FA Persistence

- backend auth helper’ları eklendi
- login / verify-2fa / logout / me endpointleri eklendi
- session cookie DB-backed hale geldi
- demo password ve demo 2FA doğrulama akışı korundu

## Paket 3 — Core API + Persistence

- assets, identities, access requests, events, deception, compliance, reports, audit, notifications, settings ve simulations endpointleri eklendi
- ortak response envelope standardı uygulandı
- organization scope ve 2FA koruması route seviyesinde standardize edildi

## Paket 4 — Backend Engines

- Risk Engine server-side çalışır hale geldi
- Zero Trust kararları backend’e taşındı
- Deception, Event/SOAR, Compliance ve Report engine’leri backend service katmanına alındı
- executive demo orchestration server-side tamamlandı

## Paket 5 — Frontend API Adapter + UI Bağlantıları

- store API-first hydrate olacak şekilde güncellendi
- dashboard, assets, events, deception, reports, audit logs, notifications ve settings API’den okunur hale geldi
- mock fallback korundu
- v1 UI/UX dili bozulmadı

## Paket 6 — Trap Endpoint + Report Print + Release Hardening

- güvenli deception trap endpoint eklendi
- report print payload API eklendi
- print route DB snapshot tabanlı hale getirildi
- print aksiyonu audit log’a bağlandı
- README, release notes ve v2 status dokümanları güncellendi

## v1’den v2’ye gelen temel değişiklikler

- local/mock merkezli prototip yapıdan kalıcı DB-backed foundation’a geçildi
- auth/session backend’e taşındı
- domain verileri API üzerinden yönetilir hale geldi
- iş kuralları frontend’den backend engine katmanına alındı
- print ve trap gibi release-kritik yüzeyler server-side kontrollü hale geldi

## Bilinen sınırlar

- production deploy için Prisma/Vercel zinciri final cleanup ile tekrar doğrulanmalı
- bazı ekranlarda mock fallback halen korundu
- gerçek SSO, gerçek TOTP sağlayıcısı ve dış sistem connector’ları foundation sonrası genişletilecek
- trap endpoint etik olarak yalnızca güvenli deception logging yüzeyidir
