export type CloudLocation =
  | "private_cloud"
  | "public_cloud"
  | "saas"
  | "backup"
  | "deception";

export type DataClassification =
  | "public"
  | "internal"
  | "confidential"
  | "sensitive"
  | "critical";

export type DataTemperature = "hot" | "warm" | "cold";
export type StorageType =
  | "database"
  | "object_storage"
  | "file_share"
  | "saas_export"
  | "backup_archive"
  | "deception_storage";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DeviceTrust = "trusted" | "managed" | "unknown" | "compromised";
export type AccessAction = "read" | "write" | "export" | "delete" | "admin";
export type LocationRisk = "low" | "medium" | "high";
export type TimeRisk = "normal" | "elevated" | "off_hours";
export type IdentityType = "user" | "service" | "third_party";
export type IdentityStatus = "active" | "watchlist" | "suspicious" | "isolated";

export type ZeroTrustDecision =
  | "allow"
  | "limited_allow"
  | "require_step_up_auth"
  | "deny"
  | "isolate";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "step_up"
  | "isolated";

export type EventSeverity = "info" | "low" | "medium" | "high" | "critical";
export type EventStatus = "open" | "investigating" | "contained" | "resolved" | "false_positive";
export type EventCategory =
  | "auth_failure"
  | "mfa_failure"
  | "login_success"
  | "admin_access_denied"
  | "admin_access_granted"
  | "settings_changed"
  | "role_changed"
  | "status_changed"
  | "trap_triggered"
  | "data_asset_risk"
  | "access_request_created"
  | "zero_trust_decision"
  | "compliance_gap"
  | "system_health_degraded"
  | "report_generated"
  | "unauthorized_access_attempt"
  | "suspicious_export"
  | "public_bucket_detected"
  | "missing_encryption"
  | "impossible_travel"
  | "api_abuse"
  | "deception_triggered"
  | "ransomware_indicator"
  | "privilege_escalation"
  | "policy_violation"
  | "third_party_anomaly"
  | "visibility_gap";

export type SoarAction =
  | "account_lock"
  | "revoke_token"
  | "require_mfa"
  | "isolate_identity"
  | "isolate_resource"
  | "create_ticket"
  | "notify_security_team"
  | "mark_contained"
  | "mark_resolved";

export type ComplianceIndicatorStatus = "healthy" | "warning" | "critical";
export type ControlCoverage = "implemented" | "partial" | "missing" | "not_applicable";
export type DeceptionAssetType = "bucket" | "database" | "api" | "token_store" | "log_archive";
export type ReportType =
  | "general"
  | "critical-data"
  | "zero-trust"
  | "deception"
  | "nist"
  | "privacy"
  | "demo";

export type UserRole =
  | "Security Admin"
  | "Cloud Security Analyst"
  | "Compliance Officer"
  | "Auditor"
  | "Executive";

export type TeamRoleKey =
  | "security_admin"
  | "cloud_security_analyst"
  | "compliance_officer"
  | "auditor"
  | "executive";

export type UserStatus = "active" | "invited" | "suspended";
export type TeamInviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type PlatformRole = "USER" | "ADMIN";
export type Permission =
  | "view_dashboard"
  | "view_assets"
  | "manage_assets"
  | "evaluate_access"
  | "run_playbook"
  | "trigger_deception"
  | "create_deception_asset"
  | "view_compliance"
  | "generate_report"
  | "print_report"
  | "manage_settings"
  | "view_audit_logs"
  | "run_simulation"
  | "access_presentation_mode";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  platformRole: PlatformRole;
  isSystemOwner: boolean;
  avatarInitials: string;
  department: string;
  mfaEnabled: boolean;
  status: UserStatus;
  lastLoginAt: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  plan: string;
  region: string;
  complianceFrameworks: string[];
  cloudMode: "Private Cloud" | "Public Cloud" | "Hybrid Cloud";
  demoMode: boolean;
}

export interface AuthState {
  hydrated: boolean;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  is2FAVerified: boolean;
  currentUserId: string | null;
  sessionStartedAt: string | null;
  lastLoginAt: string | null;
}

export interface OnboardingPayload {
  organizationName: string;
  city?: string;
  usageType?: "saas" | "fintech" | "retail" | "platform" | "managed-security";
  defaultCurrency?: "TRY" | "USD" | "EUR" | "GBP";
  cloudMode: OrganizationProfile["cloudMode"];
  complianceFrameworks: string[];
  seedDemoData: boolean;
  runInitialScan: boolean;
}

export type AuditSeverity = "info" | "warning" | "high" | "critical";
export type AuditResult = "success" | "failure" | "blocked";
export type AuditAction =
  | "registration_completed"
  | "login_attempt"
  | "login_success"
  | "login_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "system_owner_login_success"
  | "two_factor_verified"
  | "two_factor_failed"
  | "recovery_code_used"
  | "recovery_codes_regenerated"
  | "logout"
  | "onboarding_completed"
  | "access_request_evaluated"
  | "zero_trust_decision_generated"
  | "deception_triggered"
  | "deception_asset_created"
  | "playbook_executed"
  | "report_generated"
  | "report_printed"
  | "compliance_recalculated"
  | "asset_risk_recalculated"
  | "simulation_started"
  | "simulation_completed"
  | "unauthorized_action_attempt"
  | "settings_updated"
  | "team_invite_created"
  | "team_invite_revoked"
  | "team_invite_accepted"
  | "team_member_role_updated"
  | "team_member_removed"
  | "system_owner_page_forbidden"
  | "system_owner_api_forbidden"
  | "admin_user_role_updated"
  | "admin_user_status_updated"
  | "admin_settings_updated";

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  module: string;
  target: string;
  severity: AuditSeverity;
  result: AuditResult;
  timestamp: string;
  ipAddress: string;
  device: string;
  details: string;
}

export type NotificationType =
  | "critical_event"
  | "deception_alarm"
  | "report_ready"
  | "compliance_changed"
  | "playbook_completed"
  | "access_request_pending"
  | "simulation_completed";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  severity: EventSeverity | "info";
  module: string;
  read: boolean;
  createdAt: string;
  actionHref?: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: string[];
  recommendedControls: string[];
  recommendedActions: string[];
}

export interface DataAsset {
  id: string;
  name: string;
  path: string;
  dataType: string;
  location: CloudLocation;
  storageType: StorageType;
  classification: DataClassification;
  temperature: DataTemperature;
  owner: string;
  encryptionEnabled: boolean;
  kmsEnabled: boolean;
  backupEnabled: boolean;
  kvkkScope: boolean;
  gdprScope: boolean;
  privacyTags: string[];
  retentionPolicy: string;
  anonymizationStatus: "applied" | "partial" | "not_applicable" | "missing";
  lastAccessedAt: string;
  accessCount24h: number;
  accessIntensity: number;
  risk: RiskAssessment;
  findings: string[];
  recommendedControls: string[];
  isDeception?: boolean;
}

export interface IdentityProfile {
  id: string;
  name: string;
  type: IdentityType;
  role: string;
  department: string;
  homeLocation: CloudLocation;
  region: string;
  mfaEnabled: boolean;
  deviceTrust: DeviceTrust;
  anomalyScore: number;
  riskScore: number;
  status: IdentityStatus;
  lastSeenAt: string;
  notes: string[];
  accessVolume24h?: number;
  tags?: string[];
}

export interface ZeroTrustInput {
  identityVerified: boolean;
  deviceTrust: DeviceTrust;
  identityType?: IdentityType;
  mfa: boolean;
  role: string;
  requestedAction: AccessAction;
  dataSensitivity: DataClassification;
  locationRisk: LocationRisk;
  timeRisk: TimeRisk;
  isServiceAccount: boolean;
  isThirdParty?: boolean;
  anomalyScore: number;
  targetLocation?: CloudLocation;
  isDeceptionTarget?: boolean;
  recentEvents?: EventCategory[];
}

export interface ZeroTrustEvaluation {
  decision: ZeroTrustDecision;
  riskScore: number;
  reasons: string[];
  requiredActions: string[];
  policyMatches: string[];
}

export interface AccessRequest {
  id: string;
  identityId: string;
  identityName: string;
  identityType: IdentityType;
  role: string;
  targetAssetId: string;
  targetAssetName: string;
  sourceLocation: CloudLocation;
  sourceRegion: string;
  deviceTrust: DeviceTrust;
  requestTime: string;
  requestedAction: AccessAction;
  mfa: boolean;
  anomalyScore: number;
  locationRisk: LocationRisk;
  timeRisk: TimeRisk;
  dataSensitivity: DataClassification;
  evaluation: ZeroTrustEvaluation;
  status: RequestStatus;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  owner: string;
  defaultDecision: ZeroTrustDecision;
  severity: EventSeverity;
  conditions: string[];
  actions: string[];
}

export interface EventTimelineEntry {
  id: string;
  timestamp: string;
  message: string;
  actor: string;
}

export interface SecurityEvent {
  id: string;
  title: string;
  severity: EventSeverity;
  category: EventCategory;
  source: string;
  target: string;
  timestamp: string;
  description: string;
  relatedControl: string;
  recommendation: string;
  status: EventStatus;
  riskScore?: number;
  eventType?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  playbookActions: SoarAction[];
  evidence: string[];
  timeline: EventTimelineEntry[];
  relatedAssetId?: string;
  relatedIdentityId?: string;
}

export interface DeceptionAsset {
  id: string;
  name: string;
  location: CloudLocation;
  description: string;
  realData: false;
  containsRealData?: false;
  fakeType?: DeceptionAssetType;
  lureScore: number;
  triggerCount: number;
  lastTriggeredAt?: string;
  mappedThreat: string;
  severity?: EventSeverity;
  recommendedResponse: string;
  status: "armed" | "triggered";
  autoActions: SoarAction[];
}

export interface ComplianceFunctionScore {
  id: string;
  name: string;
  score: number;
  status: ComplianceIndicatorStatus;
  controls: string[];
  gaps: string[];
  improvements: string[];
}

export interface ComplianceIndicator {
  label: string;
  value: string;
  status: ComplianceIndicatorStatus;
}

export interface ComplianceMatrixRow {
  id: string;
  label: string;
  kvkk: ControlCoverage;
  gdpr: ControlCoverage;
  iso27001: ControlCoverage;
  nist: ControlCoverage;
}

export interface ComplianceSnapshot {
  overallScore: number;
  iso27001Score: number;
  kvkkScore: number;
  gdprScore: number;
  nist: ComplianceFunctionScore[];
  indicators: ComplianceIndicator[];
  matrix: ComplianceMatrixRow[];
}

export interface ThreatItem {
  id: string;
  name: string;
}

export interface ControlItem {
  id: string;
  name: string;
}

export interface ThreatMatrixEntry {
  threatId: string;
  controlId: string;
  status: ControlCoverage;
}

export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  targetModule: string;
  expectedOutcome: string;
  relatedControls: string[];
  riskLevel?: RiskLevel;
  affectedModules?: string[];
}

export interface SimulationRunResult {
  id: string;
  scenarioId: string;
  summary: string;
  createdAt: string;
  generatedEventIds: string[];
  generatedReportIds?: string[];
  affectedModules?: string[];
}

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

export interface DemoScenarioState {
  active: boolean;
  currentStep: number;
  steps: DemoStep[];
}

export interface ArchitectureLayer {
  id: string;
  name: string;
  health: number;
  detail: string;
}

export interface CloudMapNode {
  id: string;
  label: string;
  kind:
    | "user"
    | "device"
    | "security"
    | "cloud"
    | "data"
    | "compliance"
    | "deception";
  riskLevel: RiskLevel;
  description: string;
  relatedAssetIds: string[];
  relatedEventIds: string[];
  recommendedControls: string[];
}

export interface CloudMapLink {
  id: string;
  from: string;
  to: string;
  tone: "safe" | "warning" | "critical" | "deception";
  label: string;
}

export interface ReportItem {
  id: string;
  title: string;
  type: ReportType;
  createdAt: string;
  summary: string;
  findings: string[];
  risks: string[];
  recommendedActions: string[];
  relatedEventIds: string[];
  relatedAssetIds?: string[];
  relatedControls: string[];
  markdownContent?: string;
  status?: "draft" | "generated" | "updated";
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  tone: "info" | "success" | "warning" | "critical" | "deception" | "policy" | "compliance";
  actionLabel?: string;
}

export interface TeamMemberRecord {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: TeamRoleKey;
  roleLabel: UserRole;
  status: UserStatus;
  department: string;
  avatarInitials: string;
  joinedAt: string;
  lastLoginAt: string | null;
  isProtectedAdmin: boolean;
}

export interface TeamInviteRecord {
  id: string;
  email: string;
  role: TeamRoleKey;
  roleLabel: UserRole;
  status: TeamInviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

export interface DemoEnvironment {
  assets: DataAsset[];
  identities: IdentityProfile[];
  accessRequests: AccessRequest[];
  policyRules: PolicyRule[];
  events: SecurityEvent[];
  deceptions: DeceptionAsset[];
  compliance: ComplianceSnapshot;
  threats: ThreatItem[];
  controls: ControlItem[];
  threatMatrix: ThreatMatrixEntry[];
  simulations: SimulationScenario[];
  layers: ArchitectureLayer[];
  runs: SimulationRunResult[];
  reports: ReportItem[];
  demoScenario: DemoScenarioState;
  cloudNodes: CloudMapNode[];
  cloudLinks: CloudMapLink[];
}

export interface DashboardSummary {
  securityScore: number;
  criticalAssetCount: number;
  activeIncidentCount: number;
  suspiciousRequestCount: number;
  deceptionAlarmCount: number;
  complianceScore: number;
  topAssets: DataAsset[];
  topIdentities: IdentityProfile[];
  cloudDistribution: Array<{ label: string; value: number; location: CloudLocation }>;
}
