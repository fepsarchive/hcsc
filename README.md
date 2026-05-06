# Hybrid Cloud Security Console

Hybrid Cloud Security Console (HCSC), bitirme tezimiz olan **“Hibrit Bulut Ortamında Veri Depolama ve Yönetimi İçin Aktif Savunma Tabanlı Güvenlik Mimarisi Tasarımı”** için geliştirilen web tabanlı güvenlik konsolu prototipidir.

Bu proje, akademik çözümü ürünleştirilebilir bir prototipe dönüştürmeyi hedefler. Uygulama; veri varlıklarını sınıflandırır, risk skorları üretir, Zero Trust erişim kararlarını simüle eder, deception tabanlı aktif savunma akışları sunar, SIEM/SOAR olay yönetimi görünürlüğü sağlar ve NIST CSF 2.0 ile KVKK/GDPR uyumluluk katmanını bir araya getirir.

## Amaç

- Hibrit bulut veri depolama mimarisini görünür kılmak
- Veri varlıkları için risk analizi üretmek
- Zero Trust Architecture mantığını çalışan demo ile göstermek
- MITRE Engage yaklaşımını deception storage üzerinden simüle etmek
- SIEM/SOAR benzeri olay yönetimi ve playbook akışı göstermek
- NIST CSF 2.0, ISO 27001, KVKK ve GDPR görünürlüğü sunmak
- Tez savunmasında adım adım gösterilebilecek etkileyici bir demo akışı sağlamak

## Teknoloji Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Local mock data
- Merkezi React Context store

## Sayfalar

- `Dashboard`
- `Cloud Map`
- `Data Assets`
- `Access Requests`
- `Policy Engine`
- `Deception`
- `Event Center`
- `Compliance`
- `Threat Matrix`
- `Reports`
- `Simulations`
- `Presentation Mode`
- `Final Checklist`

## Simülasyonlar

- MFA olmadan kritik veriye erişim
- Mesai dışı export
- Public cloud'da şifrelenmemiş hassas veri
- Deception bucket erişimi
- Üçüncü taraf API anahtarı anomalisi
- Ransomware davranış göstergesi
- İç kullanıcı yetki aşımı
- API unrestricted resource consumption
- Loglama kapalı kaynak tespiti

## Demo Akışı

Uygulama içinde `Demo Senaryosu Başlat` özelliği vardır. Bu akış aşağıdaki zinciri görünür kılar:

1. Hibrit bulut veri varlıkları görünür olur.
2. Kritik müşteri verisine mesai dışı ve MFA olmadan export erişimi denenir.
3. Zero Trust Policy Engine bağlamsal sinyalleri analiz eder.
4. Sonuç Event Center'a SIEM olayı olarak düşer.
5. SOAR aksiyonları önerilir.
6. Aynı şüpheli servis hesabı deception storage alanına erişmeye çalışır.
7. `deception_triggered` kritik olayı oluşur.
8. Dashboard güvenlik skoru etkilenir.
9. Compliance katmanında Detect ve Respond skorları yeniden hesaplanır.
10. Reports sayfasında Demo Senaryo Raporu görünür.

## Akademik Dayanaklar

- NIST Cybersecurity Framework 2.0
  - Govern
  - Identify
  - Protect
  - Detect
  - Respond
  - Recover
- NIST Zero Trust Architecture
  - Policy Engine
  - Policy Administrator
  - Policy Enforcement Point
  - sürekli doğrulama
  - en az ayrıcalık
  - risk tabanlı erişim kararı
- MITRE Engage
  - deception
  - adversary engagement
  - erken tespit
- OWASP API Security Top 10 2023
  - broken object level authorization
  - broken authentication
  - unrestricted resource consumption
  - unsafe API consumption
- KVKK / GDPR
  - kişisel veri sınıflandırması
  - saklama süresi
  - veri imha / anonimleştirme
  - yurt dışı aktarım riski
  - erişim logları

## Güvenlik ve Etik Sınırlar

- Gerçek saldırı kodu yoktur.
- Exploit, malware, ransomware veya yetkisiz erişim aracı içermez.
- Hack-back uygulanmaz.
- Deception alanları gerçek veri içermez.
- Tüm saldırı akışları güvenli mock ve simülasyon olarak tasarlanmıştır.

## Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini aç.

## Build ve Lint

```bash
npm run lint
npm run build
```

## Notlar

- Kod tabanı backend'e hazır olacak şekilde modüler tutulmuştur.
- Mock data ve motorlar ayrı katmanlarda tutulur.
- İleride Prisma/PostgreSQL veya API tabanı eklenebilir.
