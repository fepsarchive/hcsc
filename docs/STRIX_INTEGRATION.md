# HCSC + Strix entegrasyonu

Strix, HCSC'nin koruma ve görünürlük katmanını yetkili güvenlik doğrulamasıyla tamamlar. HCSC hedefin yazılı iznini, kapsamını, hariç tutulan alanlarını ve son kullanma tarihini yönetir; Strix ise yalnızca Strix tarafında kayıtlı ve doğrulanmış varlık için taramayı yürütür. Dönen bulgular HCSC olay, bildirim ve rapor akışına alınır.

## Sağladığı fayda

- Savunulan alan adı, API veya kaynak kod deposundaki doğrulanabilir zafiyetleri bulur.
- Kanıt, önem derecesi, CVSS, yeniden üretim bilgisi ve düzeltme önerisini HCSC bulgusuna dönüştürür.
- Yüksek ve kritik bulguları HCSC güvenlik olaylarıyla ilişkilendirir.
- Koruma ile doğrulamayı aynı çalışma alanında birleştirir: varlık → izin → tarama → bulgu → olay → düzeltme.

## Yönetilen Strix bağlantısı

Gerekli ortam değişkenleri:

```text
HCSC_SECURITY_TEST_PROVIDER=managed
STRIX_API_BASE_URL=https://app.strix.ai/api/v1
STRIX_API_TOKEN=<organization-token>
HCSC_SECURITY_TEST_ALLOW_PRODUCTION=false
```

Strix organization token'ında en az `scans:read`, `scans:write` ve `assets:read` kapsamları bulunmalıdır. Alan adı Strix'te eklenip doğrulanmalı veya kaynak kod deposu bağlanmalıdır. HCSC hedefindeki URL/repository adresi, Strix'teki varlıkla eşleşmelidir.

Üretim hedefleri varsayılan olarak kapalıdır. Yazılı yetki doğrulandıktan ve önce staging üzerinde deneme tamamlandıktan sonra gerektiğinde `HCSC_SECURITY_TEST_ALLOW_PRODUCTION=true` kullanılabilir.

## HCSC çalışma akışı

1. Adversary Validation alanında hedef oluşturulur.
2. Yetki referansı, kapsam, hariç tutulan yollar ve izin bitiş tarihi kaydedilir.
3. HCSC yetkiyi ve provider durumunu sunucuda yeniden doğrular.
4. Strix taraması başlatılır ve HCSC koşu kimliğiyle ilişkilendirilir.
5. Aktif koşular Strix API üzerinden uzlaştırılır.
6. Tamamlanan bulgular HCSC bulgusu, güvenlik olayı, bildirim ve imzalı webhook olayına dönüştürülür.

## Ayrık/self-hosted runner

Kendi Strix runner servisini kullanmak için:

```text
HCSC_SECURITY_TEST_PROVIDER=self_hosted
STRIX_RUNNER_URL=https://runner.example.com
STRIX_RUNNER_TOKEN=<runner-token>
STRIX_RUNNER_CALLBACK_TOKEN=<callback-token>
```

İstek ve callback sözleşmesi [strix-runner-contract.md](./strix-runner-contract.md) içinde tanımlıdır.

## Güvenlik sınırı

Bu entegrasyon bir yetkilendirme yöntemi değildir. Yalnızca sahibinin açıkça izin verdiği hedeflerde kullanılmalıdır. HCSC özel/yerel ağlara rastgele çıkış sağlamaz; üretim taraması ayrıca kapalı gelir ve kapsam her koşuda yeniden denetlenir.
