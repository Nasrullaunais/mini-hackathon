import type {
  ActionTaken,
  ReportStatus,
  RiskLevel,
  SiteType,
  TeamType,
  UserRole,
} from "@/db/schema";

/**
 * FROZEN after 0:30 (DESIGN.md §5). Every stored value renders through these
 * maps, so "stagnant_water" reads as "Stagnant water" everywhere and nobody
 * writes a switch statement twice. Record<T, string> means adding a value to an
 * `as const` list in schema.ts is a type error here until it gets a label.
 */

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  stagnant_water: "Stagnant water",
  garbage_pile: "Rubbish pile",
  construction_site: "Construction site",
  blocked_drain: "Blocked drain",
  other: "Other",
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  reported: "Reported",
  under_review: "Under review",
  dispatched: "Dispatched",
  cleared: "Cleared",
  rejected: "Rejected",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TEAM_TYPE_LABEL: Record<TeamType, string> = {
  fogging: "Fogging",
  cleaning: "Cleaning",
  inspection: "Inspection",
};

export const ACTION_LABEL: Record<ActionTaken, string> = {
  drained: "Water drained",
  debris_removed: "Debris removed",
  fogged: "Area fogged",
  container_removed: "Container removed",
  no_action_needed: "No action needed",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  citizen: "Citizen",
  officer: "PHI officer",
  crew: "Field crew",
};
