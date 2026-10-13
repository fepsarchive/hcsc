# Main aktarımı ve geri dönüş — 13 Ekim 2026

## Yedek noktası

- Aktarım öncesi uzak main: `184b0f240a18bdf4ff30a18923e432ae87a5ad5c`.
- Git yedek etiketi: `backup-main-20261013` (yukarıdaki commit'i işaretlemek üzere).
- Vercel'de son doğrulanan canlı deployment: `dpl_85RKXo2mNKYwvQLXtzMvur5XnYHK`, kaynak `184b0f2`.
- Uygulama değişiklikleri: `18ae932` ve önceki üç geliştirme commit'i. Ek yayın bekletme/CI ayarı ayrı commit'tedir.

Bu bir **kod yedeğidir**; DB snapshot'ı, ortam anahtarı yedeği veya Vercel deployment saklama garantisi değildir. Bu aktarım kapsamında production verisi veya şeması değiştirilmeyecek.

## Yayın ve test ayrımı

`vercel.json` içindeki `git.deploymentEnabled.main=false` main push'larının otomatik Vercel deployment'ı oluşturmasını engeller. Diğer dalların davranışı değişmez. Manuel deploy ayrıca yetkilendirilip incelenmelidir; ayar onu engellemez. Referans: https://vercel.com/docs/project-configuration/git-configuration

GitHub Actions tüm kalite adımlarını çalıştırır. CI DB URL'leri ve pinleri yalnızca yerel/sentetik hedefi temsil eder. Build ve mock testler gerçek mail, Redis, Strix veya canlı DB kabul testi değildir.

## Canlıya geçişten önce

1. Doğrulanmış production DB adresinden iki production parmak izi hesaplanıp Vercel Production'a girilmeli; Preview ayrı DB/pin kullanmalı.
2. `INTEGRATION_ENCRYPTION_KEY` güvenli oluşturulmalı veya mevcut şifreli kayıtlarda kullanılan anahtar güvenli depodan geri alınmalı. Kontrolsüz rotasyon yapılmamalı.
3. Gerçek Strix sağlayıcısı/runner seçilmeli, gerçek bağlantı ve callback kimlik bilgileri yapılandırılmalı. Yer tutucuyla health yeşile çevrilmemeli.
4. Production şema karşılaştırması, gerekirse yedekli migrasyon planı, domain atanmamış aday deployment ve gerçek auth/mail/health kabul testleri yapılmalı.
5. Doğrulanmış aday promote edilmeli; otomatik main yayınını tekrar açma ayrı, gözden geçirilmiş değişiklik olmalı.

## Geri dönüş

- Önce canlı deployment'ın hâlâ eski commit'te olup olmadığı kontrol edilir. Değişmediyse canlı rollback gereksizdir.
- Kod karşılaştırması: `git diff backup-main-20261013..main --stat`.
- Yedekten ayrı kurtarma dalı: `git switch -c codex/restore-main-20261013 backup-main-20261013` (temiz çalışma ağacında). Bu tek başına main veya canlıyı değiştirmez.
- Main geri alınacaksa geçmişi silen force-push/reset yerine gözden geçirilmiş revert commit'leri tercih edilir. Yayın bekletme ayarı korunmalı; geniş bir revert onu yanlışlıkla kaldırmamalı.
- Canlı yeni sürüme geçmişse Vercel'de eski deployment'ın erişilebilirliği ve DB uyumluluğu kontrol edilerek Instant Rollback değerlendirilir. Kod rollback'i DB migrasyonunu veya yazılmış verileri geri almaz.

Etiket/push ve GitHub Actions sonuçları işlem sonunda uzak referanslardan doğrulanmalıdır; dosyanın varlığı tek başına push veya başarılı yayın kanıtı değildir.
