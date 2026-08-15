# HCSC Strix Runner Contract

HCSC web uygulaması aktif pentest çalıştırmaz. Strix, Docker ve LLM anahtarlarının bulunduğu ayrık bir runner servisinde çalışır. Runner yalnızca yazılı yetkisi HCSC içinde doğrulanmış işleri kabul etmelidir.

## Ağ ve kimlik sınırı

- HCSC → runner: `POST {STRIX_RUNNER_URL}/v1/scans`
- Kimlik: `Authorization: Bearer {STRIX_RUNNER_TOKEN}`
- Runner → HCSC: `POST {APP_URL}/api/adversary-validation/provider/callback`
- Kimlik: `Authorization: Bearer {STRIX_RUNNER_CALLBACK_TOKEN}`
- Production ortamında iki yön de HTTPS kullanmalıdır.
- İki token farklı, yüksek entropili ve düzenli döndürülen secret değerleri olmalıdır.
- Runner internetten doğrudan erişilebilir olmak zorunda değildir; özel ağ veya doğrulanmış ingress tercih edilir.

## Runner tarafında zorunlu korumalar

1. `STRIX_ALLOWED_TARGETS` allowlist'i olmadan iş kabul edilmemeli.
2. Gelen `target`, normalize edildikten sonra allowlist ile tam eşleşmeli; suffix veya substring eşleşmesi kullanılmamalı.
3. Redirect sonrası hedef tekrar allowlist kontrolünden geçmeli.
4. Link-local, metadata, loopback ve özel ağ adresleri açıkça allowlist edilmedikçe engellenmeli.
5. Her iş ayrı container/sandbox içinde, CPU, bellek, süre ve ağ sınırlarıyla çalışmalı.
6. Koşu logları secret ve test credential değerlerinden arındırılmalı.
7. Aynı `hcscRunId` tekrar gelirse idempotent davranılmalı.
8. Runner, HCSC'nin gönderdiği `scope`, `exclusions`, `maxBudgetUsd` ve `maxTurns` sınırlarını daraltabilir ancak genişletemez.

## İş oluşturma isteği

```json
{
  "hcscRunId": "run-id",
  "target": "https://github.com/fepsarchive/hcsc",
  "targetType": "repository",
  "environment": "sandbox",
  "scope": ["Repository source"],
  "exclusions": ["Production infrastructure"],
  "scanMode": "standard",
  "instructions": "Rules of engagement",
  "maxBudgetUsd": 10,
  "maxTurns": 100
}
```

Runner `202 Accepted` ile şu cevabı verir:

```json
{
  "runId": "strix-run-id",
  "status": "queued"
}
```

## Sonuç callback'i

Callback aynı `externalId` değerine sahip bulgular için idempotenttir. `status` değeri `queued`, `running`, `completed`, `failed` veya `cancelled` olabilir.

```json
{
  "hcscRunId": "run-id",
  "externalRunId": "strix-run-id",
  "status": "completed",
  "summary": "Authorized assessment completed.",
  "costUsd": 4.2,
  "findings": [
    {
      "externalId": "STRIX-001",
      "title": "Validated access control finding",
      "severity": "high",
      "category": "broken_access_control",
      "description": "Validated description",
      "evidence": ["Redacted evidence reference"],
      "remediation": "Enforce object-level authorization.",
      "affectedResource": "/api/resource",
      "cvssScore": 7.5,
      "pocAvailable": true
    }
  ]
}
```

HCSC, yüksek ve kritik yeni bulguları Security Event akışına bağlar; tekrar gönderilen callback aynı bulgu veya olayın ikinci kez oluşmasına neden olmaz.
