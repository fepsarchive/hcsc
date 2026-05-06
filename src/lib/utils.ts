import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type {
  CloudLocation,
  DashboardSummary,
  DataClassification,
  DemoEnvironment,
  EventSeverity,
  RequestStatus,
  RiskLevel,
  SoarAction,
} from "@/types"
import type { BadgeTone } from "@/components/ui/badge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function average(values: number[]) {
  if (!values.length) {
    return 0
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

export function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function classificationLabel(classification: DataClassification) {
  const map: Record<DataClassification, string> = {
    public: "Public",
    internal: "Internal",
    confidential: "Confidential",
    sensitive: "Sensitive",
    critical: "Critical",
  }

  return map[classification]
}

export function locationLabel(location: CloudLocation) {
  const map: Record<CloudLocation, string> = {
    private_cloud: "Private Cloud",
    public_cloud: "Public Cloud",
    saas: "SaaS",
    backup: "Backup",
    deception: "Deception",
  }

  return map[location]
}

export function riskTone(level: RiskLevel): BadgeTone {
  const map: Record<RiskLevel, BadgeTone> = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
  }

  return map[level]
}

export function severityTone(severity: EventSeverity): BadgeTone {
  const map: Record<EventSeverity, BadgeTone> = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
  }

  return map[severity]
}

export function requestStatusTone(status: RequestStatus): BadgeTone {
  const map: Record<RequestStatus, BadgeTone> = {
    pending: "info",
    approved: "low",
    rejected: "critical",
    step_up: "medium",
    isolated: "deception",
  }

  return map[status]
}

export function playbookActionLabel(action: SoarAction) {
  const map: Record<SoarAction, string> = {
    account_lock: "Account Lock",
    revoke_token: "Revoke Token",
    require_mfa: "Require MFA",
    isolate_identity: "Isolate Identity",
    isolate_resource: "Isolate Resource",
    create_ticket: "Create Ticket",
    notify_security_team: "Notify Security Team",
    mark_contained: "Mark Contained",
    mark_resolved: "Mark Resolved",
  }

  return map[action]
}

export function buildDashboardSummary(environment: DemoEnvironment): DashboardSummary {
  const realAssets = environment.assets.filter((asset) => !asset.isDeception)
  const criticalAssetCount = realAssets.filter((asset) => asset.risk.level === "critical").length
  const activeIncidentCount = environment.events.filter((event) => event.status !== "resolved").length
  const suspiciousRequestCount = environment.accessRequests.filter((request) =>
    request.status === "pending" ||
    request.status === "step_up" ||
    request.status === "rejected" ||
    request.status === "isolated"
  ).length
  const deceptionAlarmCount = environment.deceptions.filter((deception) => deception.status === "triggered").length
  const complianceScore = environment.compliance.overallScore

  const assetRiskAverage = average(realAssets.map((asset) => asset.risk.score))
  const identityRiskAverage = average(environment.identities.map((identity) => identity.riskScore))
  const incidentPenalty = clamp(activeIncidentCount * 2.4, 0, 24)
  const deceptionPenalty = clamp(deceptionAlarmCount * 1.5, 0, 10)
  const securityScore = Math.round(
    clamp(
      average([
        complianceScore,
        100 - assetRiskAverage,
        100 - identityRiskAverage,
        100 - incidentPenalty * 3,
        94 - deceptionPenalty * 4,
      ]),
      0,
      100
    )
  )

  const topAssets = [...realAssets].sort((left, right) => right.risk.score - left.risk.score).slice(0, 8)
  const topIdentities = [...environment.identities].sort((left, right) => right.riskScore - left.riskScore).slice(0, 8)
  const locations: CloudLocation[] = ["private_cloud", "public_cloud", "saas", "backup", "deception"]
  const cloudDistribution = locations.map((location) => ({
    label: locationLabel(location),
    value: environment.assets.filter((asset) => asset.location === location).length,
    location,
  }))

  return {
    securityScore,
    criticalAssetCount,
    activeIncidentCount,
    suspiciousRequestCount,
    deceptionAlarmCount,
    complianceScore,
    topAssets,
    topIdentities,
    cloudDistribution,
  }
}
