# HCSC v1.0 Release Notes

## v1.0 ile gelenler

- Login + 2FA doğrulama
- Protected route guard
- Rol tabanlı izin görünürlüğü
- Dashboard, Data Assets, Access Requests, Events, Compliance, Reports, Simulations, Presentation Mode
- Deception / sahte veritabanı tuzak senaryosu
- SIEM/SOAR olay akışı ve playbook çalıştırma
- Audit Logs
- Notification Center
- Professional report print template
- Onboarding ve Settings temel katmanı
- Final Checklist dynamic state görünümü

## v0.1 → v1.0 dönüşümü

- Sayfalar arası kopuk demo state merkezi store’a bağlandı
- Zero Trust, risk, deception, event ve compliance motorları ortak program akışına taşındı
- Demo senaryoları dashboard ve presentation mode’a yansıtıldı
- Reports artık print route ile kurumsal çıktı verebiliyor
- Audit ve notification görünürlüğü eklendi
- Login ekranı, header ve shell release seviyesinde stabilize edildi

## Bilinen sınırlar

- Auth, 2FA ve session akışı mock/session mantığında çalışır
- Risk policy ve report branding tam yönetim paneli olarak değil, v1 temel görünüm seviyesindedir
- Bildirimler ve audit kayıtları local state tabanlıdır
- Gerçek saldırı veya gerçek sistem entegrasyonu içermez

## Gelecek geliştirmeler

- Backend + persistent database entegrasyonu
- Kurumsal SSO / gerçek MFA sağlayıcısı
- Gelişmiş settings sekmeleri
- Genişletilmiş multi-tenant organization yönetimi
- Gelişmiş report branding ve scheduled exports
- Daha detaylı mobile analytics görünümü
