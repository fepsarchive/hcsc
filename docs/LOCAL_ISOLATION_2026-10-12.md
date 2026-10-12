# Yerel Neon izolasyonu ve migrasyon doğrulaması — 12 Ekim 2026

## Tamamlananlar

- Kullanıcının açık onayıyla `.env.development.local` içindeki `DATABASE_URL`, `DIRECT_URL`, ortam ve DB hedef parmak izleri izole test branch'ine geçirildi. Diğer yerel ayarlar korundu. Dosya Git dışında ve yalnızca dosya sahibinin okuyup yazabileceği izinlerle tutuluyor; bağlantı sırları rapora/loglara alınmadı.
- Hedef: `hcsc-test-isolated-20261011` / `br-lively-water-aqv56qix`, `neondb`. Production/default branch ve Vercel Production/Preview ayarları değiştirilmedi.
- `npm run db:isolation:check` başarılı. Pooled ve direct bağlantılar aynı izole hedefi gösteriyor; production parmak izi farklı.
- Baseline öncesi 35 public tablonun **tamamının** satır sayısı 0 olarak doğrulandı. Üretim kullanıcıları, oturumları ve MFA/kurtarma kodları taşınmadı.

## Bulunan gerçek migrasyon eksikliği

Şema kopyasının Prisma modeline uyması, Git'teki migrasyonların yeni DB kurabildiğini kanıtlamıyordu. Aynı izole branch'te oluşturulan boş `hcsc_migration_verify_20261012` veritabanına mevcut beş migrasyon uygulandı. Şema karşılaştırması şunları eksik buldu:

- `PasswordResetToken`, `OrganizationInvite`, `AppSetting` tabloları ve ilişkileri.
- Platform rolü ve davet durumu enum'ları; `User.platformRole` alanı.
- MFA kayıt/doğrulama alanları ve organizasyon kurulum alanları.
- Prisma'nın beklediği iki indeks adı. Ayrıca geçmiş migrasyonlardaki iki sorgu indeksi modelde tanımlı değildi.

`20261012090000_reconcile_auth_schema` eklendi. Yeni migrasyon eksik yapıları ekler, mevcut yapıları korur ve gereken indeks adlarını koşullu düzeltir. Kullanıcı parolası, mevcut rol veya MFA değeri değiştirmez. Eski sorgu indeksleri silinmedi; Prisma modeline eklendi.

Doğrulama sırası:

1. Boş doğrulama DB'sinde beş eski migrasyon, ardından yeni altıncı migrasyon çalıştı.
2. `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: **0 / No difference detected**.
3. Schema-only `neondb` hedefinde tablo boşluğu tekrar kontrol edildi; eklemeli düzeltme çalıştı ve şema farkı olmadığı doğrulandı.
4. Ancak bu doğrulamadan sonra altı migrasyon test `neondb` üzerinde baseline edildi. `migrate status`: **Database schema is up to date**.

Bu bir production baseline veya production migrasyonu değildir. Yeni migrasyon canlıya uygulanmadan önce canlı şema farkı, yedek/geri dönüş ve kilit etkileri ayrıca incelenmelidir. `IF NOT EXISTS`, aynı adlı ama farklı tanımlı bir nesnenin doğru olduğunu kanıtlamaz.

## Sağlık ve kalite kanıtı

- DB health probe'u artık auth/aktivasyon/davet/ayar alanlarının varlığını `LIMIT 0` sorgusuyla da doğruluyor; kullanıcı veya kimlik bilgisi satırlarını okumuyor.
- Gerçek uygulama Prisma istemcisiyle izole Neon hedefindeki probe: **healthy**, yaklaşık 1.5 saniye. Bu, DB/şema kontrolüdür; tarayıcıdan tam kullanıcı akışı veya dış servis E2E testi değildir.
- **41 birim + 26 sunucu regresyon testi başarılı**. Bu suite'ler DB/mail için test çiftleri kullanır; yukarıdaki migrasyon/probe denemeleri ise gerçek izole PostgreSQL üzerinde yapıldı.
- ESLint, Next typegen/TypeScript, Prisma validate ve `git diff --check` başarılı.
- README güncel kurulum, kapalı üyelik, ortam ayrımı, sağlık kontrolleri, entegrasyon sınırları ve yayın kapılarıyla yeniden yazıldı.

## Git ve yayın durumu

Uzak referanslar doğrudan kontrol edildi:

- `origin/main`: `184b0f240a18bdf4ff30a18923e432ae87a5ad5c`.
- `origin/codex/release-hardening` ve yerel HEAD: `6bee165da5c6f0bd5865736559859ea01193a15a`.

Yeni geliştirmeler çalışma ağacında; bu turda commit, push veya deploy yapılmadı. README çalışma ağacını anlatır, mevcut canlı deployment'ın bu sürümü içerdiğini iddia etmez. Kullanıcıya ait `hcsc-logo/` içeriğine dokunulmadı.

## Sonraki kapılar

1. İzole DB üzerinde sentetik hesapla gerçek provisioning → aktivasyon → MFA → oturum/tenant sınırı testleri. Gerçek e-posta teslimi için ayrıca kontrollü alıcı doğrulaması.
2. Vercel ortamlarını ayrı kontrol etmek; üretim DB parmak izleri, entegrasyon şifreleme anahtarı ve gerçek Strix sağlayıcı/runner eksiklerini tamamlamak. Yerel değişiklik bunları otomatik güncellemez.
3. Redis sayaç/TTL, webhook TLS/teslimi ve aday deployment kabul testleri; ardından incelenmiş commit/push ve kontrollü yayın.
4. Tek domain üzerinde gerçek trafik koruması; izole deception servisi; yalnızca yetkili hedefte gerçek Strix taraması ve yeniden test.

**Geçici kaynak uyarısı:** test branch'i konsoldaki ayara göre **18 Ekim 2026 11:15 Europe/Istanbul** tarihinde otomatik silinecek. Hem `neondb` hem de migrasyon doğrulama DB'si bu branch'te bulunuyor; kalıcı müşteri verisi barındırmamalı. Testler uzarsa süre uzatma veya yeniden oluşturma kararı gerekir. Boş test DB'sinde mevcut canlı hesapların bulunmaması beklenen davranıştır; demo seed çalıştırılmadı.
