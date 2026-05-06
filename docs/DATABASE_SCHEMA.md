# HCSC v2 Database Schema

## Amaç

Bu belge, HCSC v2 için önerilen Prisma + PostgreSQL veri modelini açıklar.

Hedefler:

- multi-tenant organization desteği
- kalıcı auth/session altyapısı
- kalıcı domain kayıtları
- auditability
- report snapshot yaklaşımı

## Modelleme İlkeleri

1. Ana domain kayıtları `organizationId` ile scope’lanır.
2. Audit kayıtları mümkün olduğunca append-only mantıkta tutulur.
3. Reports, oluşturulduğu andaki snapshot’ı saklar.
4. Notifications kullanıcı bazlıdır.
5. Settings organization ve user seviyesinde ayrılır.

## Temel Varlıklar

### Identity / Access

- User
- Organization
- Membership
- Session
- TwoFactorSecret
- RecoveryCode

### Security Domain

- Asset
- IdentityProfile
- AccessRequest
- ZeroTrustDecisionRecord
- SecurityEvent
- EventTimelineEntry
- DeceptionAsset
- DeceptionTrigger
- PlaybookExecution
- ComplianceSnapshot
- ComplianceFunctionScore
- Report
- ReportAssetLink
- ReportEventLink

### Governance / Product

- AuditLog
- Notification
- OrganizationSettings
- RiskPolicy
- ReportBranding
- SimulationRun
- FinalChecklistSnapshot

## Prisma Model Önerisi

```prisma
model Organization {
  id                   String              @id @default(cuid())
  name                 String
  slug                 String              @unique
  plan                 String
  region               String
  cloudMode            String
  demoMode             Boolean             @default(false)
  onboardingCompleted  Boolean             @default(false)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  memberships          Membership[]
  assets               Asset[]
  identityProfiles     IdentityProfile[]
  accessRequests       AccessRequest[]
  events               SecurityEvent[]
  deceptionAssets      DeceptionAsset[]
  auditLogs            AuditLog[]
  notifications        Notification[]
  reports              Report[]
  sessions             Session[]
  settings             OrganizationSettings?
  riskPolicy           RiskPolicy?
  reportBranding       ReportBranding?
  complianceSnapshots  ComplianceSnapshot[]
  simulationRuns       SimulationRun[]
}

model User {
  id               String              @id @default(cuid())
  name             String
  email            String              @unique
  passwordHash     String
  role             String
  department       String?
  avatarInitials   String?
  status           String              @default("active")
  mfaEnabled       Boolean             @default(false)
  lastLoginAt      DateTime?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  memberships      Membership[]
  sessions         Session[]
  twoFactorSecret  TwoFactorSecret?
  recoveryCodes    RecoveryCode[]
  notifications    Notification[]
  auditLogs        AuditLog[]
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           String
  createdAt      DateTime     @default(now())

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
}

model Session {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  tokenHash      String       @unique
  ipAddress      String?
  userAgent      String?
  is2FAVerified  Boolean      @default(false)
  expiresAt      DateTime
  lastSeenAt     DateTime     @default(now())
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model TwoFactorSecret {
  id          String   @id @default(cuid())
  userId      String   @unique
  secret      String
  issuer      String
  label       String
  enabledAt   DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RecoveryCode {
  id         String   @id @default(cuid())
  userId     String
  codeHash   String
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Asset {
  id                  String       @id @default(cuid())
  organizationId      String
  name                String
  path                String
  dataType            String
  location            String
  storageType         String
  classification      String
  temperature         String
  owner               String
  encryptionEnabled   Boolean
  kmsEnabled          Boolean
  backupEnabled       Boolean
  kvkkScope           Boolean
  gdprScope           Boolean
  privacyTags         Json
  retentionPolicy     String
  anonymizationStatus String
  accessCount24h      Int          @default(0)
  accessIntensity     Int          @default(0)
  riskScore           Int          @default(0)
  riskLevel           String       @default("low")
  riskReasons         Json
  recommendedControls Json
  isDeception         Boolean      @default(false)
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model IdentityProfile {
  id               String       @id @default(cuid())
  organizationId   String
  name             String
  type             String
  role             String
  department       String?
  region           String?
  homeLocation     String
  mfaEnabled       Boolean      @default(false)
  deviceTrust      String
  anomalyScore     Int          @default(0)
  riskScore        Int          @default(0)
  status           String       @default("active")
  notes            Json
  accessVolume24h  Int          @default(0)
  tags             Json
  lastSeenAt       DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model AccessRequest {
  id                    String       @id @default(cuid())
  organizationId        String
  identityProfileId     String
  assetId               String
  requestedAction       String
  justification         String?
  status                String
  decision              String?
  decisionReasons       Json
  requiredActions       Json
  policyMatches         Json
  riskScore             Int?
  requestedAt           DateTime     @default(now())
  decidedAt             DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model SecurityEvent {
  id                 String       @id @default(cuid())
  organizationId     String
  title              String
  severity           String
  category           String
  source             String
  target             String
  description        String
  relatedControl     String?
  recommendation     String?
  status             String
  evidence           Json
  playbookActions    Json
  relatedAssetId     String?
  relatedIdentityId  String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  timelineEntries    EventTimelineEntry[]
  playbookExecutions PlaybookExecution[]
}

model EventTimelineEntry {
  id          String        @id @default(cuid())
  eventId     String
  actor       String
  message     String
  createdAt   DateTime      @default(now())

  event       SecurityEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

model DeceptionAsset {
  id                  String       @id @default(cuid())
  organizationId      String
  name                String
  location            String
  description         String
  containsRealData    Boolean      @default(false)
  fakeType            String
  lureScore           Int
  triggerCount        Int          @default(0)
  lastTriggeredAt     DateTime?
  mappedThreat        String
  severity            String
  recommendedResponse String
  status              String
  autoActions         Json
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  triggers            DeceptionTrigger[]
}

model DeceptionTrigger {
  id                String         @id @default(cuid())
  organizationId    String
  deceptionAssetId  String
  identityProfileId String?
  eventId           String?
  sourceIp          String?
  userAgent         String?
  requestHeaders    Json?
  requestPath       String?
  createdAt         DateTime       @default(now())

  organization      Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  deceptionAsset    DeceptionAsset @relation(fields: [deceptionAssetId], references: [id], onDelete: Cascade)
}

model PlaybookExecution {
  id               String        @id @default(cuid())
  organizationId   String
  eventId          String
  action           String
  status           String
  summary          String
  executedBy       String?
  createdAt        DateTime      @default(now())

  organization     Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  event            SecurityEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

model ComplianceSnapshot {
  id               String       @id @default(cuid())
  organizationId   String
  overallScore     Int
  iso27001Score    Int
  kvkkScore        Int
  gdprScore        Int
  indicators       Json
  matrix           Json
  createdAt        DateTime     @default(now())

  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  functions        ComplianceFunctionScore[]
}

model ComplianceFunctionScore {
  id                   String             @id @default(cuid())
  complianceSnapshotId String
  name                 String
  score                Int
  status               String
  controls             Json
  gaps                 Json
  improvements         Json

  snapshot             ComplianceSnapshot @relation(fields: [complianceSnapshotId], references: [id], onDelete: Cascade)
}

model Report {
  id                 String       @id @default(cuid())
  organizationId     String
  title              String
  type               String
  status             String       @default("generated")
  summary            String
  findings           Json
  risks              Json
  recommendedActions Json
  relatedControls    Json
  markdownContent    String?
  snapshotJson       Json
  generatedBy        String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  eventLinks         ReportEventLink[]
  assetLinks         ReportAssetLink[]
}

model ReportEventLink {
  id        String @id @default(cuid())
  reportId  String
  eventId   String
}

model ReportAssetLink {
  id        String @id @default(cuid())
  reportId  String
  assetId   String
}

model AuditLog {
  id             String       @id @default(cuid())
  organizationId String
  userId         String?
  actorName      String
  actorRole      String
  action         String
  module         String
  target         String
  severity       String
  result         String
  ipAddress      String?
  device         String?
  details        String
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model Notification {
  id             String       @id @default(cuid())
  organizationId String
  userId         String?
  title          String
  description    String
  type           String
  severity       String
  module         String
  actionHref     String?
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model OrganizationSettings {
  id                   String       @id @default(cuid())
  organizationId       String       @unique
  region               String
  cloudMode            String
  complianceFrameworks Json
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model RiskPolicy {
  id                              String       @id @default(cuid())
  organizationId                  String       @unique
  criticalClassificationWeight    Int
  missingEncryptionWeight         Int
  publicCloudSensitiveWeight      Int
  missingBackupWeight             Int
  noKmsWeight                     Int
  openCriticalEventWeight         Int
  deceptionTriggerWeight          Int
  createdAt                       DateTime     @default(now())
  updatedAt                       DateTime     @updatedAt

  organization                    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model ReportBranding {
  id                   String       @id @default(cuid())
  organizationId       String       @unique
  companyName          String
  reportFooter         String
  preparedByLabel      String
  confidentialityLabel String
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}

model SimulationRun {
  id                String       @id @default(cuid())
  organizationId    String
  scenarioId        String
  summary           String
  generatedEventIds Json
  generatedReportIds Json
  affectedModules   Json
  createdAt         DateTime     @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

## İndeksleme Önerileri

Önerilen index alanları:

- `Asset(organizationId, classification)`
- `Asset(organizationId, riskLevel)`
- `AccessRequest(organizationId, status, requestedAt)`
- `SecurityEvent(organizationId, severity, status, createdAt)`
- `AuditLog(organizationId, createdAt)`
- `Notification(organizationId, userId, readAt, createdAt)`
- `Report(organizationId, type, createdAt)`
- `DeceptionTrigger(organizationId, createdAt)`

## Snapshot vs Live Data

Önemli karar:

- `Report.snapshotJson` saklanmalıdır.

Neden:

- bir rapor üretildikten sonra sistem state’i değişse bile geçmiş raporun içeriği stabil kalmalıdır.

## Audit Log Yaklaşımı

Audit kayıtları:

- immutable düşünülmeli
- update yerine append mantığında çalışmalı
- silme yerine retention policy uygulanmalı

## Notification Yaklaşımı

Notification kayıtları:

- user scoped olabilir
- organization wide de olabilir
- `readAt` ile okunma durumu tutulmalı

## Deception Modeling Notu

`DeceptionAsset` ve `DeceptionTrigger` ayrı tutulur.

Bu ayrım sayesinde:

- lure tanımı sabit kalır
- her tetikleme ayrı log olur
- raporlama ve korelasyon kolaylaşır

## Sonuç

Bu şema, HCSC’nin v1 mock veri modelini v2 için kalıcı, denetlenebilir ve tenant-aware hale getirmek için yeterli omurgayı sağlar.
