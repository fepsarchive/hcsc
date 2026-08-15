# HCSC Strix Runner

Bu servis, HCSC web uygulaması ile Strix CLI arasında küçük ve ayrık bir köprüdür. Strix kodunu kopyalamaz; host üzerinde kurulu `strix` binary'sini `shell: false` ile çalıştırır ve üretilen `findings.sarif` dosyasını HCSC callback sözleşmesine dönüştürür.

## Gereksinimler

- Node.js 20+
- Çalışır durumda Docker
- Kurulu ve sürümü sabitlenmiş Strix CLI
- Strix için `STRIX_LLM` ve `LLM_API_KEY`
- Yalnızca açıkça yetkilendirilmiş hedeflerden oluşan allowlist

## Ortam değişkenleri

```bash
PORT=8787
STRIX_RUNNER_TOKEN=outbound-hcsc-to-runner-token
STRIX_RUNNER_CALLBACK_TOKEN=runner-to-hcsc-callback-token
HCSC_CALLBACK_URL=https://hcsc.example/api/adversary-validation/provider/callback
STRIX_ALLOWED_TARGETS=https://github.com/fepsarchive/hcsc
STRIX_BINARY=/home/runner/.strix/bin/strix
STRIX_RUNNER_ARTIFACTS_DIR=/var/lib/hcsc-strix-runs
STRIX_LLM=openai/your-approved-model
LLM_API_KEY=your-provider-key
```

`STRIX_ALLOWED_TARGETS` tam URL eşleşmesi kullanır. HTTP hedefleri kabul edilmez. Runner tek seferde bir koşu işleyerek artifact klasörü seçiminin deterministik kalmasını sağlar.

## Başlatma

```bash
cd services/strix-runner
npm run check
npm start
```

Önce `GET /healthz` yanıtının `200` olduğunu ve `strixReady` ile `dockerReady` alanlarının `true` döndüğünü doğrulayın. Gerçek tarama ancak HCSC hedef kaydında aktif yazılı izin bulunduğunda başlatılmalıdır.

Üretimde runner'ı özel ağda, ayrı servis hesabıyla, salt-okunur host yüzeyi ve sınırlı egress ile çalıştırın. Docker socket erişimi yüksek yetkidir; mümkünse ayrık VM veya disposable runner kullanın.
