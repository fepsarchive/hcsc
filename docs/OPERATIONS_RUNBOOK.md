# HCSC çalıştırma ve gerçek domain bağlantısı

Bu rehber mevcut uygulamayı tarif eder. Eski tasarım belgelerindeki öneriler uygulanmış API garantisi değildir.

## 1. Uygulamayı çalıştır

1. Node.js ve PostgreSQL/Neon bağlantısını hazırla. `.env.example` anahtarlarını güvenli ortam değişkenleriyle doldur; mevcut şifreleme anahtarlarını gelişigüzel değiştirme, kayıtlı 2FA ve entegrasyon sırları okunamaz hale gelebilir.
2. `npm ci` ve `npm run db:migrate:deploy` çalıştır. Yeni müşteri veritabanına `db:seed` çalıştırma. `db:push` üretim migrasyon geçmişinin yerine geçmez.
3. `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:server`, `npm run build` çalıştır.
4. Development: `npm run dev -- --port 3001`. Production: `npm run release:check`, ardından `npm run start` veya doğrulanmış deployment.
5. `/api/health/live` ve `/api/health/ready` sonuçlarını kontrol et. Ready production’da şema, güvenli yapılandırma ve çalışan Redis gerektirir. E-posta ve Strix bağımlılıkları ayrıca gerçek bağlantıyla doğrulanmalıdır.

## 2. Üretime geçiş için operatör adımları

- `APP_URL` gerçek HTTPS uygulama adresi olmalı. Yerel HTTP adresi yalnızca geliştirme içindir.
- Ayrı güçlü `INTEGRATION_ENCRYPTION_KEY`, oturum/2FA/recovery anahtarları ve `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID` tanımla. Mevcut anahtarları yedek ve migrasyon planı olmadan döndürme.
- Resend anahtarını ve doğrulanmış gönderici domainini hazırla. `/domains` listeleme yetkisi olmayan send-only token ile sağlık kontrolü gönderimi kanıtlayamaz. Gerçek alıcıya izinli test gönderimi ve teslimat kaydı gerekir.
- Upstash URL/token çiftini düzelt. Production’da servis yokken bellek fallback kullanılmaz.
- `HCSC_TEST_AUTH_BYPASS_ENABLED=false` ve `NEXT_PUBLIC_HCSC_DEMO_ENABLED=false` bırak. UI test bypass üretimde her durumda engellenir.
- Owner hesabının parolası ve 2FA kurulumunu tamamla; `npm run owner:check` eksikleri varsa başarısız çıkış verir. Bu denetimde mevcut owner parolası değiştirilmedi.

## 3. Müşterinin ilk kurulumu

1. Kayıt → gerçek TOTP kurulumu → işletme profili.
2. Örnek veri seçenekleri varsayılan kapalıdır. “Mevcut verilerden uyumluluk hesabı” dış site taraması değildir.
3. Gerçek çalışma alanı `/domains` ekranına yönlendirilir. Domainini URL veya yol olmadan ekle.
4. Ekranda verilen `_hcsc-verification` TXT kaydını mevcut DNS sağlayıcısına ekle; yayıldıktan sonra sahipliği doğrula. TXT değeri her çalışma alanı için farklıdır; başka hesabın kaydını kopyalama.

## 4. mertcanyildirim.com / Natro

İnceleme sırasında NS kayıtları `ns1.natrohost.com` ve `ns2.natrohost.com` idi. Bu anlık gözlemdir; DNS değişebilir.

Domaini Natro’dan taşıman gerekmez. Web trafiği koruması için:

1. Cloudflare hesabında domaini ekle. A/AAAA/CNAME, MX, SPF/DKIM/DMARC ve diğer DNS kayıtlarını eksiksiz kontrol et. E-posta kayıtlarını proxy arkasına alma.
2. Origin sunucusunun HTTPS sertifikasını kontrol et. DNSSEC açıksa geçiş rehberine göre eski DS kaydını ve yeniden etkinleştirmeyi yönet.
3. Natro’da yalnızca Cloudflare’ın bu zone için verdiği nameserver çiftini kullan. Rastgele nameserver yazma. Eski DNS kayıtlarının yedeğini ve geri dönüş planını tut.
4. Web hostname’i için proxy aç, Full (strict) TLS ve planın desteklediği managed WAF’ı yapılandır. Gereksiz WAF istisnalarını ve doğrudan origin erişimini ayrıca incele.
5. Zone kapsamıyla sınırlı `Zone Read`, `DNS Read`, `Zone Settings Read`, `Zone WAF Read` token ve Zone ID’yi HCSC domain formuna gir. Token yalnızca sunucuda şifreli saklanır; tekrar dönülmez. HCSC şu anda sağlayıcı kurallarını otomatik değiştirmez.
6. “Kontrolleri çalıştır” → “Doğrula ve bağlantıyı etkinleştir”. TXT sahipliği, aktif/pauselenmemiş zone, seçili hostname’in proxy durumu, strict TLS ve managed WAF dağıtımı olumlu olmalıdır. Eksik koşul etkinleştirmeyi engeller.

`configuration_verified` yalnızca son kontrol anındaki sağlayıcı yapılandırmasını ifade eder. Canlı exploit engelleme testi, tüm WAF kurallarının kapsamı, origin bypass testi ve sürekli izleme garantisi değildir. Sonraki kontrolde önkoşul bozulursa aktif durumu kaldırılır. Apex ve `www` ayrı hostname olarak kontrol edilir.

Kaynak: [Cloudflare full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

## 5. Strix açık testi

- Cloudflare trafiği filtreler; Strix izinli hedefte açık bulur. Birbirinin yerine geçmezler.
- Managed: `HCSC_SECURITY_TEST_PROVIDER=managed` + `STRIX_API_TOKEN`. Hedefi Strix hesabında da ayrıca kaydet ve doğrula. HCSC TXT doğrulaması Strix doğrulamasının yerine geçmez.
- Managed modda Quick/Lite, Standard/Standard, Deep/Ultra eşlenir. Fiyat ve kredi hesabını Strix’te kontrol et; USD/azami adım sınırı uygulanmaz. Aynı koşu kimliğiyle yeniden gönderim için idempotency anahtarı kullanılır.
- Alternatif self-hosted: ayrı Docker/LLM runner, hedef allowlist’i ve callback sırları gerekir. Runner işletimi, kalıcı kuyruk ve kesinti kurtarma ayrıca doğrulanmalıdır.
- HCSC Adversary Validation’da hedef, kapsam, hariç tutulan alanlar, izin referansı ve süreyi belirt. Üretim taraması ayrıca production izin bayrağı ve koşu bazlı açık onay ister.
- Sonuçlar sağlayıcıdan alınmadan “açık yok” denmez. Mevcut managed uzlaştırma görünüm açılışında çalışır; sürekli arka plan uzlaştırma henüz kurulu değildir.
- Kaynak/lisans atfı: [Strix](https://github.com/usestrix/strix).

## 6. Test komutları ve sınırlar

`npm test`: saf politika/şablon ve mevcut regresyonlar. `npm run test:server`: sahte veritabanı bağımlılığıyla gerçek oturum/ayar fonksiyonları; dış servis çağrısı yapmaz.

`HCSC_E2E_ALLOW_DATABASE_WRITES=true node scripts/test-live-domain-flow.mjs`: yalnızca localhost kabul eder, uygulamanın bağlı veritabanında ayrı test hesabı oluşturur; gerçek TOTP ve domain API akışını çalıştırır. Geçici browser-state/fixture dosyaları sır içerir, paylaşma ve commit etme. Test kayıtlarını yalnızca oluşturulan kesin kullanıcı/çalışma alanı kimlikleriyle temizle veya hesabı askıya al.

E2E testi DNS kaydı eklemez, e-posta göndermez, Cloudflare kurallarını değiştirmez ve ücretli Strix taraması başlatmaz. Başarılı yerel test, üretimde bu sağlayıcıların aktif olduğu anlamına gelmez.

Testten sonra `HCSC_E2E_ALLOW_DATABASE_WRITES=true node scripts/close-domain-test-fixture.mjs <testin-yazdırdığı-tam-geçici-dizin>` komutuyla yalnızca o test hesabını askıya al ve oturumlarını iptal et. Komut girişin reddedildiğini de doğrular; denetim kayıtlarını silmez.

Son yerel doğrulama: 32 politika/regresyon testi, 6 sunucu testi ve 9 uçtan uca akış kontrolü başarılı; lint, typecheck ve production build başarılı. Bağımlılık denetiminde 0 bilinen açık raporlandı. Kullanılan iki geçici E2E hesabı askıya alındı ve oturumları iptal edildi. Bunlar canlı koruma veya tüm sistemin güvenlik garantisi değildir; üretim ayarları ve gerçek sağlayıcı testleri hâlâ gereklidir.

## 7. Arayüz

Genel CSS ölçeği %90’dır; tarayıcı yakınlaştırması değiştirilmez. Uygulama ve admin içerikleri normal dikey kaydırma kullanır. Sabit ekran/bölüm sayfalaması kaldırılmıştır. Giriş/kayıt/2FA kartları küçük ekranda içeriklerini kesmeden kaydırılabilir.
