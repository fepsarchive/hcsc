# HCSC — Hybrid Cloud Security Console

HCSC; çalışma alanı bazında kimlik, veri varlıkları, erişim kararları, güvenlik olayları, deception sinyalleri ve raporları bir araya getiren güvenlik operasyon uygulamasıdır.

**Durum: üretime hazırlık ve entegrasyon doğrulaması.** Kodda bir ekranın veya adaptörün bulunması, dış sağlayıcıda korumanın devrede olduğunu göstermez. Bu README çalışma ağacındaki güncel kodu anlatır; canlı sitenin aynı sürümü çalıştırdığını garanti etmez. Son dokümantasyon güncellemesi: **12 Ekim 2026**.

## Neler var, neler henüz tamamlanmadı?

| Alan | Kodun sunduğu işlev | Sınır / doğrulama ihtiyacı |
| --- | --- | --- |
| Kimlik ve yetki | DB-backed oturum, organizasyon üyeliği, rol kontrolleri, TOTP ve tek kullanımlık recovery code | Gerçek e-posta, aktivasyon ve MFA akışları hedef ortamda ayrıca test edilmeli. |
| Kapalı üyelik | Yetkili platform yönetimi `/admin/users` üzerinden boş müşteri çalışma alanı ve hesap açar | Herkese açık kayıt kapalı. İlk platform yöneticisi operatör tarafından güvenli biçimde hazırlanmalı. |
| Domain bağlantısı | `/domains`: DNS TXT sahiplik doğrulaması ve Cloudflare yapılandırma kontrolü | Domain eklemek trafiği HCSC'den geçirmez; WAF/origin koruması ayrıca uygulanıp doğrulanmalı. |
| Deception | Tuzak varlık kaydı ve HTTP erişiminden olay/audit/bildirim üretimi | Gerçek bucket/storage servisi veya şüpheli trafiği izole ortama yönlendiren katman henüz yok. |
| Müdahale | Uygulama içi playbook ve olay/kimlik iş akışları | Yerel kayıt değişikliği dış IAM token iptali veya WAF engeli değildir. Sağlayıcı doğrulaması ve geri alma işi sürüyor. |
| Adversary Validation / Strix | Yetkili hedef, kapsam, tarama kaydı, managed/self-hosted adaptör ve sonuç/callback altyapısı | Gerçek Strix çalıştırması uçtan uca doğrulanmış değil. Demo sağlayıcı yalnızca sentetik bulgu üretir. |
| Webhook | HMAC imzalama, tenant sınırı, HTTPS/443, DNS/IP doğrulaması, IP sabitleme, redirect reddi ve boyut/süre sınırları | Gerçek alıcıyla TLS/teslim testi gerekir. HTTP 2xx, alıcıda işin tamamlandığı anlamına gelmez. |
| Health | Canlılık, DB/şema, yapılandırma ve bağımlılık kontrolleri | Sağlıklı provider API yanıtı gerçek mail teslimi veya gerçek tarama kanıtı değildir. |

Cloud Map sayfası ve menü bağlantıları kaldırıldı. Dashboard öğreticisi tamamlanınca gizlenir; **Guided Run** ile yeniden açılır. İlerleme kullanıcı/çalışma alanı bazında tarayıcıda tutulur; öğretici gerçek tarama veya müdahale başlatmaz.

## Teknoloji ve proje yapısı

- Next.js 16.4, React 19, TypeScript ve Tailwind CSS.
- Prisma 7 + PostgreSQL/Neon; sunucu bağlantısında `@prisma/adapter-pg`.
- Üretimde Upstash Redis ile dağıtık rate limit; Resend ile işlemsel e-posta.
- Radix tabanlı UI; Strix için ayrı çalıştırıcı servisi.

Komutları **bu README'nin bulunduğu depo kökünde** çalıştırın; uygulama `src/` altındadır.

```text
src/app/                 Sayfalar ve API route'ları
src/components/          Arayüz bileşenleri
src/server/              Auth, tenant servisleri, entegrasyonlar ve health
src/lib/                 Ortak politikalar ve DB izolasyon kontrolü
prisma/                  Şema ve sürümlü migrasyonlar
scripts/                 Kurulum, bakım ve yayın kontrolleri
tests/                   Birim ve sunucu regresyon testleri
services/strix-runner/   Ayrı Strix çalıştırıcısının başlangıç uygulaması
docs/                    Planlar, işletim rehberleri ve doğrulama raporları
```

Next.js kodu değiştirmeden önce [AGENTS.md](AGENTS.md) ve kurulu sürümün `node_modules/next/dist/docs/` rehberlerini okuyun.

## Yerel kurulum

### 1. Bağımlılıklar ve yerel ayarlar

Depoyu klonlayıp kökte `npm ci` çalıştırın. Node sürümünü kurulu Next.js paketinin `engines` şartına göre seçin.

Yeni kurulumda `.env.example` içeriğini **Git dışında kalan** `.env.development.local` dosyasına alın. Dosya zaten varsa üzerine yazmayın; gereken anahtarları birleştirin. Örnek sırlar gerçek kullanıma uygun değildir.

Temel ayarlar:

- `DATABASE_URL`: ayrı geliştirme DB'sinin pooled bağlantısı.
- `DIRECT_URL`: aynı DB'nin direct bağlantısı; migrasyonlarda kullanılır.
- `APP_URL`: yerel adres, örneğin `http://localhost:3001`.
- Auth şifreleme/imzalama anahtarları: `.env.example` içindeki yer tutucular yerine bağımsız, güçlü değerler.
- `HCSC_DEPLOYMENT_ENV=development`.

Mevcut auth sağlayıcısı HCSC'nin kendi oturum/TOTP uygulamasıdır; **Neon Better Auth etkinleştirmek gerekmez**. Anahtarları sohbete, issue'lara veya Git'e koymayın. Yerel DB bağlantısı değişince geliştirme sunucusunu yeniden başlatın.

### 2. DB hedef ayrımını doğrulayın

**Yerel/test/preview ortamları üretim DB'sini kullanamaz.** Uzak hedefler için iki parmak izi zorunludur:

| Değişken | Development / Preview | Production |
| --- | --- | --- |
| `HCSC_DATABASE_TARGET_FINGERPRINT` | İzole ortamın hedef parmak izi | Doğrulanmış üretim hedefi |
| `HCSC_PRODUCTION_DATABASE_FINGERPRINT` | Doğrulanmış üretim hedefi; test hedefinden farklı | Aynı üretim hedefi |

```bash
npm run db:target:inspect
npm run db:isolation:check
```

İlk komut yalnızca hedef hash'lerini gösterir; DB'ye bağlanmaz ve hedefi onaylamaz. Üretim parmak izini güvenilir üretim yapılandırmasından belirleyin; testi geçirmek için rastgele hash yazmayın. Pooled/direct Neon URL'leri aynı hedefe normalize edilir. `VERCEL_ENV` varsa ortam belirlemede önceliklidir.

İzolasyon kontrolü geçmeden migrasyon, seed veya test kullanıcısı komutu çalıştırmayın. Parmak izi kontrolü ağ izolasyonunun, ayrı DB rollerinin veya DNS/tünel güvenliğinin yerine geçmez.

### 3. Şema ve migrasyon

**Gerçekten boş bir geliştirme DB'sinde:**

```bash
npm run prisma:generate
npm run db:validate
npm run db:migrate:deploy
```

**Neon schema-only branch'inde:** tablolar bulunabilir ama `_prisma_migrations` satırları boş olabilir. Bu durumda ilk migrasyonu tekrar uygulamayın. Önce salt okunur şema karşılaştırması yapın, doğrulanan migrasyon geçmişini yalnızca test DB'de baseline edin, sonra eksik migrasyonları uygulayın. Körlemesine `migrate reset`, `db push` veya `resolve --applied` kullanmayın.

`npm run db:seed` sentetik/demo veri içindir; müşteri veya production ortamında çalıştırılmaz. Geçici Neon branch'lerinin son kullanma tarihini takip edin; bunları canlıya bağlamayın.

12 Ekim doğrulamasında eski migrasyon geçmişinde eksik auth/aktivasyon tabloları bulundu ve altıncı, eklemeli migrasyonla tamamlandı. Sıfırdan kurulum ve schema-only baseline ayrı test edildi. Ayrıntılar: [yerel izolasyon ve migrasyon raporu](docs/LOCAL_ISOLATION_2026-10-12.md). Mevcut canlı DB'de uygulamadan önce şema farkını ayrıca inceleyin.

### 4. Uygulamayı başlatın

```bash
npm run dev -- --port 3001
```

`APP_URL` ile portu eşleştirin. `NODE_ENV=test`, development env dosyasını yüklemez; DB'ye erişen özel testlerin açıkça ayrı test yapılandırması olmalıdır. Mevcut birim/sunucu regresyon testleri gerçek DB ve mail yerine test çiftleri kullanır.

## Kullanıcı oluşturma ve giriş

1. Mevcut yetkili platform yöneticisi, gerçek MFA ile `/admin/users` alanına girer.
2. Ad, e-posta ve şirket adıyla hesap oluşturur. Backend transaction içinde boş organizasyon/üyelik, varsayılan ayarlar, hashlenmiş bir saatlik aktivasyon tokenı ve audit kaydı oluşturur.
3. Hesap platform `USER`, kendi çalışma alanında `security_admin` olur; otomatik platform `ADMIN` verilmez. Başlangıç parolası kullanıcıya/yöneticiye gösterilmez.
4. Alıcı e-postadaki tek kullanımlık bağlantıyla parolasını belirler. Sonraki girişte gerçek TOTP kurulumu/doğrulaması gerekir; parola belirleme oturum veya MFA onayı vermez.
5. E-posta başarısızsa hesap yeniden oluşturulmaz; mail yapılandırması düzeltilip **Şifremi unuttum** akışı kullanılır. Sağlayıcının e-postayı kabulü ile alıcıya teslimi ayrı durumlardır.

`/register` giriş sayfasına yönlenir; `POST /api/auth/register` koşulsuz `403 REGISTRATION_DISABLED` döner. Eski `registrationEnabled` ayarı kayıt açamaz. Takım daveti, mevcut hesabı organizasyona ekler; hesabı olmayan kişi için yönetici hesabı oluşturmalıdır.

Kurtarma kodlarını yalnızca hesap sahibi güvenli saklamalıdır. Paylaşılan kodlar yenilenmelidir. Parola-only admin istisnası varsayılan olarak **kapalıdır**; canlı hesaplara sabit doğrulama kodu atanmaz. İstisna ayrı operatör onayı ve kimlik/rol kontrolleri gerektirir; normal hesapların 2FA'sını kaldırmaz.

**İlk yönetici / bakım:** `owner:check` raporlama içindir. `owner:fix`, `owner:reset-password`, MFA sıfırlama ve provisioning scriptleri veri/yetki/parola değiştirebilir; otomatik kurulum adımı değildir. Hedefi ve mevcut varsayılan parola davranışını incelemeden canlıda çalıştırmayın. Boş müşteri DB'sini demo seed ile başlatmayın.

## Yapılandırma ve yayın kapısı

**Geçici yayın bekletme — 13 Ekim 2026:** `vercel.json`, yalnızca `main` için otomatik Git deployment'ını kapatır. GitHub'a kod göndermek mevcut canlı siteyi değiştirmemelidir; GitHub Actions kalite kontrolleri devam eder. Bu ayar manuel deployment'ı engellemez. Production env/DB ve kabul testleri tamamlanmadan kaldırmayın. [Yedek ve geri dönüş planı](docs/MAIN_HANDOFF_2026-10-13.md).

Tam anahtar listesi [.env.example](.env.example) içindedir. Üretim grupları:

| Grup | Anahtarlar |
| --- | --- |
| DB | `DATABASE_URL`, aynı hedefe ait `DIRECT_URL`, iki DB fingerprint'i |
| Auth | `SESSION_SECRET`, `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, `RECOVERY_CODE_HASH_KEY` |
| Yönetici | `SYSTEM_OWNER_EMAIL` veya `SYSTEM_OWNER_USER_ID` |
| E-posta | `APP_URL` (gerçek HTTPS origin), `RESEND_API_KEY`, `MAIL_FROM` |
| Rate limit | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Entegrasyon | `INTEGRATION_ENCRYPTION_KEY`; production webhook için `HCSC_OUTBOUND_ALLOWED_HOSTS` |
| Strix | `HCSC_SECURITY_TEST_PROVIDER=managed` veya `self_hosted` ve ilgili sağlayıcı bilgileri |

- Anahtar değişikliği mevcut şifreli TOTP/entegrasyon kayıtlarını okunamaz yapabilir; rotasyon/migrasyon planı olmadan değiştirmeyin.
- `HCSC_OUTBOUND_ALLOWED_HOSTS` virgülle ayrılmış **tam hostname** listesidir; ana domain izni alt domainleri açmaz. Webhook'lar HTTPS/443 ile sınırlı, DNS sonucu kontrol edilen IP'ye sabitlenir; redirect izlenmez.
- Upstash yoksa development'ta bellek fallback kullanılabilir. Production'da Redis eksik/arızalı olduğunda hassas işlemler reddedilir. Redis DB'si ana PostgreSQL kullanıcı veritabanının yerine geçmez.
- `managed`: `STRIX_API_TOKEN`, gerekirse doğrulanmış `STRIX_API_BASE_URL`.
- `self_hosted`: `STRIX_RUNNER_URL`, `STRIX_RUNNER_TOKEN`, ayrı `STRIX_RUNNER_CALLBACK_TOKEN`; runner Vercel web uygulamasından ayrı çalışır.
- `demo` üretim release kontrolünden geçmez. `HCSC_SECURITY_TEST_ALLOW_PRODUCTION` ve test auth bypass varsayılan kapalı kalmalıdır.
- `.env.development.local` değişikliği Vercel'i güncellemez. Production ve Preview ayarları ayrı yönetilir; env değişikliğinin mevcut deployment'a kendiliğinden uygulanmış olduğunu varsaymayın.

### Health endpoint'leri

| Endpoint | Beklenen davranış |
| --- | --- |
| `GET /api/health/live` | Süreç canlıysa `200`; DB erişimi veya koruma garantisi değildir. |
| `GET /api/health/ready` | DB sorgusu/ilgili şema ve yapılandırma kontrolleri; production'da cache probe. Hazırsa `200`, değilse `503`; sırlar dönmez. |

DB ayarı yoksa readiness `not_configured`, hedef politikası veya sorgu başarısızsa `unavailable` raporlar. Liveness çalışmaya devam eder. Yönetici health alanındaki mail/Strix probe'ları gerçek iş akışı testinin yerine geçmez.

## Kalite kontrolleri

DB'ye yazmadan çalıştırılabilen kontroller:

```bash
npm run lint
npm run typecheck
npm test
npm run test:server
npm run db:validate
git diff --check
```

Yayın hazırlığı, doğru ortam ayarları tamamlandıktan sonra:

```bash
npm run db:isolation:check
npm run release:check
npm run api:inventory
npm run build
```

`release:check` eksik/güvensiz production ayarlarında başarısız olur; kontrolü atlayarak yayınlamayın. `build`, Prisma üretimi ve deployment-check scriptini de çalıştırır. Bir test sayısı veya başarılı build dış servislerin çalıştığını kanıtlamaz; tarihli kanıtlar [Aşama 2 raporunda](docs/PHASE_2_2026-10-10.md).

## Gerçek ortam kabul testleri

- Anonim kayıt API'si 403; yetkisiz veya MFA'sız yönetici provisioning isteği reddediliyor.
- Yönetici hesap açıyor → e-posta gerçekten ulaşıyor → parola belirleniyor → MFA kuruluyor → dashboard açılıyor.
- Tek kullanımlık aktivasyon/recovery tokenı tekrar kullanılamıyor; logout ve oturum iptali çalışıyor.
- Tenant A, tenant B'nin varlık/olay/rapor/entegrasyonuna erişemiyor.
- Redis sayaç/TTL ve limit aşımında 429; sağlayıcı hatasında production işlemi reddediliyor.
- Domain TXT doğrulaması tek başına “korunuyor” sayılmıyor; trafik sağlayıcısında kural ve gerçek zararsız test isteği doğrulanıyor.
- Tuzak erişimi doğru tenant'ta olay üretiyor; gerçek veriye veya origin ağına erişmiyor.
- Yetkili izole Strix hedefinde gerçek runner sonucu geliyor; iptal, timeout ve tekrar teslim test ediliyor.
- Aday deployment'da health/MFA/mail akışları geçiyor; geri dönüş noktası belirlenmeden ana domaine geçilmiyor.

## Yol haritası ve güvenlik sınırı

Sıra: **kapalı üyelik → izole altyapı/yayın kapısı → tek domain üzerinde gerçek koruma → izole deception storage → gerçek Strix doğrulaması**.

Strix zafiyet araştırır; sürekli trafik korumasının yerine geçmez. Tarama yalnızca sahipliği/yazılı yetkisi doğrulanmış hedeflerde, süreli kapsam ve durdurma koşullarıyla çalıştırılmalıdır. Ağ seviyesinde hedef kısıtı ve worker izolasyonu gerekir; yalnızca AI talimatı yeterli değildir. Tuzaklar sentetik veri içermeli; hack-back veya gerçek müşteri sırlarının tuzağa konması bu tasarımın parçası değildir.

## Belgeler

- [Aşamalı geliştirme planı](docs/IMPLEMENTATION_PLAN_2026-10-09.md)
- [Güncel Aşama 2 kanıtları ve env geçişi](docs/PHASE_2_2026-10-10.md)
- [12 Ekim yerel Neon bağlantısı ve gerçek migrasyon doğrulaması](docs/LOCAL_ISOLATION_2026-10-12.md)
- [Operasyon rehberi](docs/OPERATIONS_RUNBOOK.md)
- [Strix entegrasyon tasarımı](docs/STRIX_INTEGRATION.md) · [Runner sözleşmesi](docs/strix-runner-contract.md) · [Runner servisi](services/strix-runner/README.md)
- [Webhook entegrasyon tasarımı](docs/WEBHOOK_INTEGRATIONS.md)

Eski raporlar o tarihteki gözlemdir; canlı durumun güncel kanıtı sayılmaz. Çelişki halinde güncel kod, doğrulanmış ortam ayarları ve tarihli en son test sonuçları esas alınır.
