# Veritabanı kurulumu

Uygulama PostgreSQL/Neon'a Prisma 7 ve pg adaptörüyle bağlıdır. Kimlik, oturum, tenant üyelikleri, operasyon verileri ve domain bağlantıları veritabanında tutulur.

1. DATABASE_URL ve DIRECT_URL bağlantılarını .env.example üzerinden yapılandır. Gerçek sırları Git'e ekleme.
2. npm ci çalıştır; Prisma client postinstall sırasında üretilir.
3. npm run db:migrate:deploy çalıştır. Yeni üretim ortamında db:push veya demo seed kullanma.
4. npx prisma migrate status ve npm run db:validate ile doğrula.
5. npm run dev -- --port 3001 çalıştır; /api/health/ready şema ve bağlantı kontrolü yapar.

Mevcut bir tabloyu oluşturulmuş diye migrasyon geçmişine körlemesine işaretleme. Önce npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script ile birebir eşleşmeyi doğrula; beklenmeyen fark varsa yedek/inceleme yap.

Yeni ConnectedDomain migrasyonu yalnızca tablo ve indeks ekler; eski müşteri verilerini silmez. Yeni müşteri hesaplarında örnek veri varsayılan kapalıdır. Demo verileri yalnızca ayrı test ortamında seçilmelidir.

Üretim sırları, domain bağlantısı, sağlık kontrolü ve test sınırları için [Çalıştırma rehberi](OPERATIONS_RUNBOOK.md) kullan.
