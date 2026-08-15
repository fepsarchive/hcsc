import type { Permission, UserRole } from "@/types";

export const rolePermissions: Record<UserRole, Permission[]> = {
  "Security Admin": [
    "view_dashboard",
    "view_assets",
    "manage_assets",
    "evaluate_access",
    "run_playbook",
    "trigger_deception",
    "create_deception_asset",
    "view_compliance",
    "generate_report",
    "print_report",
    "manage_settings",
    "view_audit_logs",
    "run_simulation",
    "view_security_tests",
    "manage_security_test_targets",
    "run_security_test",
    "access_presentation_mode",
  ],
  "Cloud Security Analyst": [
    "view_dashboard",
    "view_assets",
    "evaluate_access",
    "run_playbook",
    "trigger_deception",
    "view_compliance",
    "generate_report",
    "run_simulation",
    "view_security_tests",
    "run_security_test",
    "access_presentation_mode",
  ],
  "Compliance Officer": [
    "view_dashboard",
    "view_assets",
    "view_compliance",
    "generate_report",
    "print_report",
    "view_audit_logs",
    "view_security_tests",
    "access_presentation_mode",
  ],
  Auditor: [
    "view_dashboard",
    "view_assets",
    "view_compliance",
    "view_audit_logs",
    "view_security_tests",
    "print_report",
    "access_presentation_mode",
  ],
  Executive: [
    "view_dashboard",
    "generate_report",
    "print_report",
    "view_security_tests",
    "access_presentation_mode",
  ],
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return rolePermissions[role].includes(permission);
}
