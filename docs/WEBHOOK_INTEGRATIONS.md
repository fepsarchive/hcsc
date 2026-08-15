# İmzalı webhook entegrasyonları

HCSC, güvenlik olaylarını ve tamamlanan rapor/tarama bildirimlerini HTTPS endpoint'lerine gönderebilir. Endpoint yönetimi Settings → İşletme → API ve entegrasyonlar alanındadır.

## Güvenlik modeli

- Yalnızca HTTPS ve standart 443 portu kabul edilir.
- Localhost, özel ağlar, link-local, metadata ve rezerve IP aralıkları engellenir.
- DNS sonucu gönderimden önce doğrulanır.
- Yönlendirmeler otomatik takip edilmez.
- İstek beş saniyede zaman aşımına uğrar.
- Her endpoint için ayrı ve yalnızca oluşturulurken gösterilen bir imza sırrı üretilir.

İsteğin gövdesi JSON'dur. Doğrulama başlıkları:

```text
X-HCSC-Event: security_event | report_ready | security_test_completed | integration.test
X-HCSC-Delivery: <teslimat-kimliği>
X-HCSC-Timestamp: <unix-saniyesi>
X-HCSC-Signature: sha256=<hex-hmac>
```

İmza, `timestamp + "." + rawRequestBody` metninin endpoint sırrıyla HMAC-SHA256 özetidir. Alıcı taraf zaman damgası toleransını kontrol etmeli, imzayı sabit süreli karşılaştırmayla doğrulamalı ve aynı teslimat kimliğini ikinci kez işlememelidir.

## Ortam değişkenleri

```text
INTEGRATION_ENCRYPTION_KEY=<uzun-ve-rastgele-anahtar>
HCSC_OUTBOUND_ALLOWED_HOSTS=hooks.example.com,siem.example.net
```

Allowlist boş bırakılırsa güvenli, genel HTTPS adresleri kabul edilir. Üretimde erişimi kendi alıcı alan adlarınızla sınırlamak önerilir.
