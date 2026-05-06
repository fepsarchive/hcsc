# HCSC v1.0

Hybrid Cloud Security Console (HCSC), **“Hibrit Bulut Ortamında Veri Depolama ve Yönetimi İçin Aktif Savunma Tabanlı Güvenlik Mimarisi Tasarımı”** başlıklı bitirme tezinin uygulama/prototip çözümüdür.

Uygulama; veri varlıklarını sınıflandıran, Zero Trust erişim kararları üreten, deception tabanlı aktif savunma senaryolarını güvenli simülasyon olarak çalıştıran, SIEM/SOAR olay görünürlüğü sağlayan ve NIST CSF 2.0 ile KVKK/GDPR uyumluluk etkilerini raporlayan bir güvenlik konsolu olarak tasarlanmıştır.

## V1.0 modülleri

- Login ve 2FA doğrulama
- Protected routes ve rol tabanlı görünürlük
- Dashboard
- Data Assets
- Access Requests
- Policy Engine
- Deception / Sahte veritabanı senaryosu
- Events / SIEM-SOAR
- Compliance
- Threat Matrix
- Reports
- Professional print report template
- Simulations
- Presentation Mode
- Audit Logs
- Notification Center
- Settings
- Onboarding
- Final Checklist

## Demo kullanıcılar

- `security.admin@hcsc.local`
- `analyst@hcsc.local`

Parola:

```txt
demo123
```

2FA demo kodu:

```txt
123456
```

## Executive demo nasıl çalıştırılır?

1. `/login` ekranında bir demo kullanıcı seç.
2. Parola olarak `demo123` gir.
3. `/verify-2fa` ekranında `123456` kodunu doğrula.
4. Gerekirse onboarding’i tamamla.
5. Dashboard veya Simulations ekranında `Demo Senaryosu Başlat` aksiyonunu çalıştır.
6. Akış şu modüllere yansır:
   - Access Requests
   - Events / SIEM-SOAR
   - Deception
   - Compliance
   - Reports
   - Presentation Mode
   - Audit Logs
   - Notification Center

## Fake database deception nasıl test edilir?

`/deception` sayfasındaki **Sahte Veritabanı Tuzak Senaryosu** kartını kullan.

Senaryo:

- Sahte veritabanı: `legacy-customer-db-shadow`
- Şüpheli kimlik: `legacy-api-token`
- Olay: `deception_triggered`
- Severity: `critical`
- Önerilen aksiyonlar:
  - `isolate_identity`
  - `revoke_token`
  - `create_ticket`
  - `notify_security_team`

Bu akış gerçek veri içermez ve yalnızca güvenli simülasyon olarak çalışır.

## Print report nasıl alınır?

1. `/reports` sayfasına git.
2. Bir rapor kartından `Print Report` seç.
3. `/reports/[id]/print` sayfası açılır.
4. Yazdır butonuyla `window.print()` çağrılır ve print audit log’u oluşur.

## Nasıl çalıştırılır?

```bash
npm install
npm run dev
```

Varsayılan adres:

[http://localhost:3000](http://localhost:3000)

Port doluysa Next.js uygun başka bir port seçebilir.

## Build komutları

```bash
npm run lint
npm run build
```

## Güvenlik ve etik sınırlar

Bu uygulama:

- gerçek saldırı yapmaz
- exploit çalıştırmaz
- malware veya ransomware içermez
- saldırgana saldırmaz
- hack-back yapmaz
- gerçek veri kullanmaz

Deception kaynakları:

- sahte database
- sahte bucket/storage
- sahte API endpoint
- sahte token store
- sahte log archive

ve yalnızca **erken tespit, loglama, alarm, izolasyon önerisi ve raporlama** amacıyla güvenli simülasyon olarak çalışır.

## Akademik dayanaklar

- NIST Cybersecurity Framework 2.0
- NIST Zero Trust Architecture
- MITRE Engage
- OWASP API Security
- KVKK / GDPR

## Notlar

- Arayüz shadcn/ui `dashboard-01` tasarım dili üzerine kuruludur.
- Veri katmanı local mock state ve merkezi store ile çalışır.
- Mimari ileride API ve veritabanı katmanına bağlanabilecek şekilde modüler tutulmuştur.
