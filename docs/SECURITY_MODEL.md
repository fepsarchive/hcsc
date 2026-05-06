# HCSC v2 Security Model

## Amaç

Bu belge, HCSC v2 için güvenlik modelini tanımlar:

- auth
- session
- authorization
- multi-tenant isolation
- deception güvenlik sınırları
- auditability

## Tehdit Modeli Özeti

V2’de korunması gereken ana yüzeyler:

1. tenant verileri
2. auth/session akışı
3. rapor ve audit kayıtları
4. deception trap endpoint
5. settings ve risk policy değişiklikleri

## Auth Modeli

V2 auth akışı:

1. email/password
2. password hash doğrulama
3. 2FA challenge
4. session creation
5. organization context load

### Password Security

- düz metin parola tutulmaz
- `passwordHash` saklanır
- güçlü hash algoritması kullanılır

### 2FA Modeli

Hedef:

- mock koddan TOTP-ready mimariye geçiş

Gerekenler:

- secret storage
- enrolment flow
- verification step
- recovery codes

## Session Modeli

Session kuralları:

- session token düz halde DB’ye yazılmaz
- hash’i tutulur
- expiration zorunlu
- 2FA verified flag tutulur
- logout invalidation yapılır

Opsiyonel ileri seviye:

- device binding
- IP anomaly kontrolü
- last seen timestamp

## Authorization Modeli

Her istek şu zincirden geçer:

1. authenticated mı?
2. session valid mi?
3. organization member mı?
4. permission var mı?

### Permission Katmanları

Örnek permission’lar:

- `view_dashboard`
- `view_assets`
- `evaluate_access`
- `run_playbook`
- `trigger_deception`
- `create_deception_asset`
- `view_audit_logs`
- `generate_report`
- `print_report`

## Multi-Tenant Isolation

En kritik güvenlik ilkesi:

**Her domain sorgusu organization scope’u ile yapılmalıdır.**

Kurallar:

- route param’ı ile tenant çözülse bile session organization doğrulanır
- DB sorguları `organizationId` olmadan çağrılmaz
- audit ve notification kayıtları da tenant scope’lu tutulur

## Audit Modeli

Audit log şu işlemlerde zorunludur:

- login
- failed login
- 2FA success/failure
- logout
- onboarding complete
- zero trust decision
- deception trigger
- playbook execution
- report generated
- report printed
- settings updated
- unauthorized action attempt

## Notification Modeli

Notification sistemi güvenlik açısından:

- kritik olayların görünürlüğünü artırır
- ama auth/permission kurallarını bypass etmez

Yani:

- notification içeriği route’a götürse bile hedef ekran authorization’a tabi kalır

## Risk Policy Güvenliği

Risk policy alanı hassastır çünkü:

- risk skorlarını doğrudan etkiler
- rapor ve dashboard kararlarını değiştirir

Kurallar:

- sadece yetkili roller değiştirebilir
- tüm değişiklikler audit log’a düşer
- eski/yeni değerler audit detail içinde tutulabilir

## Report Güvenliği

Raporlar için:

- snapshot tutulmalı
- print action loglanmalı
- organization dışına görünür olmamalı

Ek not:

- hassas rapor export aksiyonları ileride signed URL veya kısa ömürlü token ile korunabilir

## Deception Security Model

Deception katmanı için sert sınırlar:

1. gerçek saldırı yapılmaz
2. saldırgana saldırı yapılmaz
3. trap endpoint gerçek backend’e proxy olmaz
4. gerçek veri sunulmaz
5. tüm yanıtlar kontrollü ve güvenli olur

### Trap Endpoint Davranışı

Trap endpoint:

- request metadata alır
- deception trigger oluşturur
- critical event üretir
- notification ve audit log oluşturur
- güvenli generic response döndürür

### Yasak Olanlar

- reverse shell
- payload delivery
- exploit staging
- malware simulation that executes
- active retaliation

## Input Validation

API girişleri:

- şema validasyonu
- tenant scope doğrulama
- referential integrity kontrolü

özellikle şu alanlarda zorunludur:

- access request creation
- settings update
- playbook execution
- deception asset creation
- report generation

## Data Retention

Öneriler:

- audit logs: uzun süreli tutulur
- notifications: yaşlandırılabilir
- sessions: TTL ile temizlenir
- trap request details: retention policy’ye bağlanır

## Secrets Yönetimi

Prod-ready model için:

- DB connection string
- session secret
- 2FA issuer/secret config
- report export credentials

env/secrets katmanında tutulmalıdır.

## Observability

Güvenlik modeli sadece erişim değil görünürlük de ister.

Öneri:

- structured server logs
- request id
- traceable audit actions
- engine decision correlation ids

## Güvenlik Riskleri

### 1. Session fixation / replay

Önlem:

- hashed tokens
- rotation policy
- expiry

### 2. Tenant data leakage

Önlem:

- mandatory organization filters
- repository katmanında scoped sorgular

### 3. Unauthorized settings changes

Önlem:

- strict permission gates
- audit log

### 4. Deception misuse

Önlem:

- trap endpoint only
- no real data
- no lateral integration

## Sonuç

HCSC v2 security modeli, ürünün özündeki savunma yaklaşımını korur:

- güvenli gözlem
- erken uyarı
- tenant izolasyonu
- denetlenebilirlik
- etik deception

Bu modelin merkezinde şu ilke vardır:

**Tüm güvenlik kararları izlenebilir, tenant-aware ve savunma amaçlı olmalıdır.**
