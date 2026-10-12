# HCSC: kapalı üyelikten doğrulanmış korumaya geçiş

## Kapsam ve güvenlik sınırları

- Kullanıcı talebi: herkese açık kayıt kapansın; hesapları yetkili platform yöneticisi oluştursun. Parola belirleme ve MFA kurulumu hesap sahibinde kalsın.
- Kurtarma kodları, parolalar ve servis anahtarları bu plana, kaynak koduna veya test çıktılarına alınmaz. Sohbette paylaşılmış kurtarma kodları kullanıcı tarafından yenilenmelidir.
- Mevcut hesaplar, roller, MFA ve geçmiş korunur. Paylaşılan yerel/canlı DB üzerinde fixture, seed veya yıkıcı test çalıştırılmaz.
- Paneldeki durum etiketi gerçek sağlayıcı işlemi yerine geçmez. Demo/simülasyon, yapılandırılmış, doğrulanmış ve arızalı durumları ayrılır.
- Bu plan yeni ücretli servis satın alma, DNS değiştirme veya üçüncü taraflara tarama izni değildir. Canlı değişiklikler hedefi doğrulanarak ve geri dönüş planıyla yapılır.

## Aşama 1 — Kapalı üyelik / yönetici tarafından hesap oluşturma

1. Login, parola kurtarma ve davet ekranlarından kayıt bağlantılarını kaldır. `/register` girişe yönlensin; doğrudan kayıt API'si koşulsuz kapalı olsun.
2. Eski `registrationEnabled` ayarı kayıt açamasın. UI ve API aynı sabit politikayı göstersin.
3. Platform yönetiminde ad, e-posta ve yeni çalışma alanı adıyla müşteri hesabı açma ekle. Varsayılan platform rolü USER; çalışma alanı rolü security_admin. Platform ADMIN ataması ayrı mevcut yetkili işlemdir.
4. Transaction içinde boş organizasyon, üyelik, varsayılan ayarlar, kullanılamaz başlangıç parolası, hashlenmiş süreli parola-belirleme tokenı ve yönetici audit kaydı oluştur. Oturum veya örnek güvenlik verisi üretme.
5. Tek kullanımlık bağlantıyı yalnızca alıcının e-postasına gönder. Yöneticiye parola/token dönme. Teslim hatasını açıkça göster; hesap zaten açılmışsa yeniden oluşturma yerine parola kurtarma akışını kullan.
6. Bağlantının eşzamanlı yeniden kullanımını atomik tüketimle engelle. Parola belirleme MFA'yı doğrulanmış saymasın; ilk giriş gerçek MFA kurulumuna gitsin.
7. Mevcut takım davetleri mevcut hesapları çalışma alanına eklemek içindir; hesabı olmayan alıcı yöneticiden hesap oluşturmasını ister. Sonraki iterasyon: yönetici kontrollü mevcut organizasyona yeni hesap ekleme ve teslim yeniden deneme ekranı.

Kabul: kayıt API'si veri yazmadan reddedilir; kayıt linki yoktur; yetkisiz/eksik MFA yönetici isteği reddedilir; duplicate hesap değişmez; transaction rollback; e-posta başarısızlığı dürüstçe bildirilir; token tekrar kullanılamaz; platform ADMIN veya doğrulanmış oturum otomatik verilmez.

## Aşama 2 — İzolasyon, dış bağlantılar ve yayın kapısı

- Ayrı yerel/test veritabanı hedefi oluştur/bağla. Canlıya yalnızca gözlem ve onaylı bakım; yedek/geri yükleme provası izole ortamda.
- `INTEGRATION_ENCRYPTION_KEY`: güvenli oluşturma, yalnızca sunucu secret deposunda tutma; ileride key version/rotation ve eski şifreli verinin taşınması.
- SSRF: tüm özel/rezerve IPv4/IPv6 ve mapped adresler, URL kimlik bilgileri, port politikası, redirect reddi/yeniden doğrulama, DNS çözümlemesini gerçek bağlantıya sabitleme, timeout/yanıt boyutu ve çıkış ağı kısıtları.
- Bağımlılık/secret kontrolü, tenant erişim testleri, Redis gerçek sayaç/TTL/engelleme testleri ve mail teslimi. Testler üretim verisi üzerinde çalışmaz.
- Son adayın sağlık kontrolü, gerçek MFA giriş/çıkış ve parola kurtarma doğrulaması; sonra kontrollü yayın ve geri dönüş noktası. READY build tek başına kabul değildir.

Kabul: yerel ve canlı DB farklı, tüm zorunlu health kontrolleri başarılı, SSRF test matrisi başarılı, hassas değerler response/loglarda yok.

## Aşama 3 — Tek domain üzerinde gerçek trafik koruması

- Önce hosting/origin ve DNS sağlayıcısını belirle; Natro domain kaydı hosting kanıtı değildir.
- TXT sahiplik, hostname bazında proxy, TLS, origin'e doğrudan erişimin engellenmesi ve mevcut MX/TXT kayıtlarının korunması.
- Cloudflare adaptörü: en az yetkili token, plan/yetenek keşfi, önce salt gözlem, sonra sınırlı kurallar. Sağlayıcı read-back ve trafik testi olmadan protected durumuna geçme.
- Sağlayıcı olaylarını HCSC'ye bağla. Zamanlı engelleme/itiraz/geri alma/audit ekle; yüksek etkili aksiyonlar insan onaylı.

Kabul: normal ziyaret çalışır; belirlenmiş zararsız test isteği kural tarafından engellenir; event/rule/request kimliği HCSC'de ilişkilendirilir; kural geri alınabilir.

## Aşama 4 — İzole deception / sahte storage

- Tenant başına tahmin edilemez benzersiz tuzak kimliği; ad/slug ile organizasyonlar arası belirsiz eşleştirmeyi kaldır.
- İlk sürüm: ayrı servis veya bucket'ta yalnızca sentetik nesneler; gerçek storage erişimi, gerçek sırlar veya origin ağına geçiş yok.
- Sadece açıkça seçilmiş tuzak yollarını yönlendir; şüpheli kullanıcıların tamamını körlemesine yönlendirme.
- Dağıtık rate-limit, kayıt hacmi sınırı, retention, güvenilir proxy/IP modeli ve kişisel veri maskeleme.
- Playbook durumları: simulated / requested / provider_confirmed / failed / rolled_back. Yerel kimlik profili değişikliği gerçek IAM token iptali değildir.

Kabul: tuzak isteği ilgili müşteride event üretir; diğer müşteriye sızmaz; normal site etkilenmez; gerçek veriye erişilemez; uygulanmayan aksiyon completed görünmez.

## Aşama 5 — Gerçek Strix çalıştırıcısı

- Mevcut self-hosted adaptörü temel al; ayrı Docker çalıştırabilen izole sunucu, sabitlenmiş CLI sürümü ve LLM sağlayıcı erişimi.
- CLI parametre/çıkış kodu/SARIF sözleşmesini gerçek sürümle doğrula. Kimlik doğrulamalı callback ve tekrar teslim idempotency'si.
- Kalıcı kuyruk, sınırlı eşzamanlılık, iş lease/heartbeat, yeniden başlatma kurtarma, zorunlu süre sınırı, iptal ve maliyet üst sınırı.
- Ağ seviyesinde allowlist, DNS/redirect denetimi, kapsam dışı hedefe çıkışın engellenmesi; yalnızca prompt'a güvenme. İş başına izolasyon, log/artefakt maskeleme ve retention.
- İlk tarama izole bilinen açık içeren test uygulamasında; ardından sahipliği ve yetkisi doğrulanmış staging hedefi. Canlı için ayrıca kapsam/zaman/stop koşulu.
- Akış: yetkilendirme → tarama → kanıt → triage → düzeltme → yeniden test. Bulgular otomatik olarak üretim kodunu değiştirmez.

Kabul: gerçek rapor HCSC'ye gelir; demo bulguyla karışmaz; iptal/timeout/yeniden başlatma testleri başarılıdır; bilinen test açığı bulunur ve düzeltme sonrası tekrar doğrulanır.

## Kullanıcı gerektiren bağımlılıklar

1. Paylaşılan kurtarma kodlarını yenileyip parola yöneticisinde tutmak.
2. `mertcanyildirim.com` hosting/origin sağlayıcısını bildirmek ve gerektiğinde DNS değişikliğini onaylamak.
3. İzole test DB ve Strix çalıştırma ortamını/LLM sağlayıcısını seçmek; maliyet onayı.
4. Anahtarları sohbet yerine uygun sağlayıcı secret alanlarına girmek; yetkili mail domainini doğrulamak.
5. Kendi parola/MFA girişini yapmak ve canlı geçiş kabulünü onaylamak.

## Teslim durumu

Plan hazır. Aşama 1'in kodu ve izole testleri tamamlandı; gerçek mail teslimi, izole Postgres entegrasyon testi, kullanıcı tarafından parola/MFA kurulumu ve canlı yayın kabulü bekliyor.

- Cloud Map ek talebi uygulandı: sayfa, görünüm, iki sidebar, başlık/breadcrumb/hızlı erişim kayıtları, topoloji tipleri ve mock/API ortam alanları kaldırıldı. Yerel HTTP isteği 404 döndü. Diğer güvenlik modülleri korunuyor; silinen kaynak dosyaları Git geçmişinden geri alınabilir.
- Herkese açık kayıt bağlantıları ve kullanılmayan kayıt servis/store/API-client kodu kaldırıldı. Eski `/register` sayfası girişe yönlendiriyor; `/api/auth/register` veri katmanına erişmeden 403 dönüyor.
- `/admin/users` formu ve aynı API'nin POST metodu: platform yönetim yetkisi, gerçek MFA, same-origin ve kullanıcı bazlı rate-limit ile korunuyor.
- Yeni hesap/organizasyon/üyelik/token/audit aynı transaction içinde oluşturuluyor. Hesap platform USER, kendi çalışma alanında security_admin oluyor. Oturum veya doğrulanmış MFA üretilmiyor.
- Hesap aktivasyonu mevcut parola belirleme endpoint'ini kullanıyor; token hashlenmiş, bir saatlik ve atomik tek kullanımlık. E-posta gönderim sağlayıcısının kabulü, son alıcıya teslimden ayrı gösteriliyor.
- 36 birim + 15 sunucu testi başarılı. Yeni testler gerçek DB/mail yerine izole test çiftleri kullanır; gerçek Postgres transaction/rollback ve gerçek teslim kanıtı değildir.
- ESLint, TypeScript/Next route typegen ve `git diff --check` başarılı.
- Yerel HTTP: `/cloud-map` 404, POST `/api/auth/register` 403, anonim POST `/api/admin/users` 401. `/register` ilk streaming yanıtı 200; Next redirect mekanizması kullanılıyor. Yerel tarayıcıda kayıt bağlantısı bulunmadı ve sidebar Cloud Map içermiyordu; mevcut test oturumu nedeniyle anonim yönlendirme uçtan uca ayrı doğrulanmalı.
- Üretim build, push, deploy, production DB değişikliği, gerçek mail gönderimi veya saldırı taraması bu aşamada yapılmadı. Yeni env adı eklenmedi; aktivasyon mevcut `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM` ayarlarını kullanır.

2026-10-10 devamı: webhook SSRF sağlamlaştırması ve DB hedef kontrolü uygulandı; fiziksel test/canlı DB ayrımı ve canlı entegrasyon doğrulaması henüz tamamlanmadı. Dashboard öğreticisi ve menü düzenlemeleri de eklendi. Uygulama ve yeni env geçiş koşulları: [Aşama 2 raporu](./PHASE_2_2026-10-10.md). Uzak DB hedef parmak izleri tamamlanmadan bu sürüm production'a yayımlanmamalıdır. Aşama 3–5 henüz canlıda doğrulanmış sayılmaz.
