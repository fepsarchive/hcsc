import {
  EventCategory,
  EventSeverity,
  EventStatus,
  SecurityEvent,
  SoarAction,
} from "@/types";
import { makeId, playbookActionLabel } from "@/lib/utils";

const defaultPlaybooks: Record<EventCategory, SoarAction[]> = {
  unauthorized_access_attempt: ["require_mfa", "create_ticket", "notify_security_team"],
  suspicious_export: ["require_mfa", "revoke_token", "create_ticket", "notify_security_team"],
  public_bucket_detected: ["isolate_resource", "create_ticket", "notify_security_team"],
  missing_encryption: ["create_ticket", "notify_security_team"],
  impossible_travel: ["require_mfa", "create_ticket", "notify_security_team"],
  api_abuse: ["revoke_token", "isolate_identity", "create_ticket"],
  deception_triggered: ["isolate_identity", "revoke_token", "notify_security_team"],
  ransomware_indicator: ["isolate_resource", "create_ticket", "notify_security_team"],
  privilege_escalation: ["account_lock", "create_ticket", "notify_security_team"],
  policy_violation: ["require_mfa", "create_ticket", "notify_security_team"],
  third_party_anomaly: ["revoke_token", "create_ticket", "notify_security_team"],
  visibility_gap: ["create_ticket", "notify_security_team"],
};

const severityScoreMap: Record<EventSeverity, number> = {
  low: 18,
  medium: 42,
  high: 68,
  critical: 92,
};

export function getEventSeverity(score: number): EventSeverity {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function getRecommendedPlaybooks(event: Pick<SecurityEvent, "category" | "playbookActions">): SoarAction[] {
  return event.playbookActions?.length ? event.playbookActions : defaultPlaybooks[event.category];
}

export function createTimelineEntry(
  message: string,
  actor = "System",
  timestamp = new Date().toISOString(),
) {
  return {
    id: makeId("tm"),
    timestamp,
    actor,
    message,
  };
}

export function createSecurityEvent(input: {
  title: string;
  severity?: EventSeverity;
  severityScore?: number;
  category: EventCategory;
  source: string;
  target: string;
  timestamp?: string;
  description: string;
  relatedControl: string;
  recommendation: string;
  status?: EventStatus;
  playbookActions?: SoarAction[];
  evidence?: string[];
  relatedAssetId?: string;
  relatedIdentityId?: string;
}): SecurityEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const severity = input.severity ?? getEventSeverity(input.severityScore ?? 50);
  const actions = input.playbookActions ?? defaultPlaybooks[input.category];

  return {
    id: makeId("evt"),
    title: input.title,
    severity,
    category: input.category,
    source: input.source,
    target: input.target,
    timestamp,
    description: input.description,
    relatedControl: input.relatedControl,
    recommendation: input.recommendation,
    status: input.status ?? "open",
    playbookActions: actions,
    evidence: input.evidence ?? [],
    relatedAssetId: input.relatedAssetId,
    relatedIdentityId: input.relatedIdentityId,
    timeline: [
      createTimelineEntry(`${input.title} olayı oluşturuldu.`, "Detection Engine", timestamp),
    ],
  };
}

export function updateEventStatus(
  event: SecurityEvent,
  status: EventStatus,
  actor = "SOAR Engine",
) {
  return {
    ...event,
    status,
    timeline: [
      createTimelineEntry(`Olay durumu ${status} olarak güncellendi.`, actor),
      ...event.timeline,
    ],
  };
}

export function appendEventTimeline(
  event: SecurityEvent,
  message: string,
  actor = "SOAR Engine",
  timestamp = new Date().toISOString(),
) {
  return {
    ...event,
    timeline: [createTimelineEntry(message, actor, timestamp), ...event.timeline],
  };
}

export function runSoarPlaybook(event: SecurityEvent, action: SoarAction) {
  let status = event.status;

  if (action === "mark_contained") status = "contained";
  else if (action === "mark_resolved") status = "resolved";
  else if (["isolate_identity", "isolate_resource", "account_lock"].includes(action)) status = "contained";
  else if (status === "open") status = "investigating";

  return appendEventTimeline(
    {
      ...event,
      status,
      recommendation: `${playbookActionLabel(action)} aksiyonu uygulandı.`,
    },
    `${playbookActionLabel(action)} playbook aksiyonu başarıyla çalıştırıldı.`,
  );
}

export function runPlaybookAction(event: SecurityEvent, action: SoarAction) {
  return runSoarPlaybook(event, action);
}

export function executePlaybook(event: SecurityEvent) {
  return getRecommendedPlaybooks(event).reduce((current, action) => runSoarPlaybook(current, action), event);
}

export function filterEvents(
  events: SecurityEvent[],
  options: {
    severity?: EventSeverity | "all";
    status?: EventStatus | "all";
    category?: EventCategory | "all";
    query?: string;
  },
) {
  return events.filter((event) => {
    const severityMatch = options.severity && options.severity !== "all" ? event.severity === options.severity : true;
    const statusMatch = options.status && options.status !== "all" ? event.status === options.status : true;
    const categoryMatch = options.category && options.category !== "all" ? event.category === options.category : true;
    const queryMatch = options.query
      ? `${event.title} ${event.source} ${event.target} ${event.description}`
          .toLowerCase()
          .includes(options.query.toLowerCase())
      : true;

    return severityMatch && statusMatch && categoryMatch && queryMatch;
  });
}

export function getSeverityScore(severity: EventSeverity) {
  return severityScoreMap[severity];
}
