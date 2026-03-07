// ─── Role Definitions ──────────────────────────────────────────────────────────

export type RoleId = 'CSM' | 'BSE' | 'BDR' | string;

export interface MetricDefinition {
  id: string;
  name: string;
  abbreviation: string;
  weight: number; // 0–1, must sum to 1 across metrics for a role
  description: string;
  defaultTarget?: number; // pre-filled quota for this role
  inverse?: boolean;       // true = lower actual is better (e.g. response time); uses target/actual
}

export interface Role {
  id: RoleId;
  name: string;
  fullName: string;
  cadence: 'monthly' | 'quarterly';
  metrics: MetricDefinition[];
  isCustom?: boolean;
}

// ─── Melder ────────────────────────────────────────────────────────────────────

export interface Melder {
  id: string;
  name: string;
  roleId: RoleId;
  email?: string;
  startDate?: string; // ISO date
  marketRate: number; // annual market rate for Ratio calculation
  targetCompensation: number; // annual OTE / target comp
  createdAt: string;
  updatedAt: string;
}

// ─── Report Data ───────────────────────────────────────────────────────────────

export type HealthColor = 'red' | 'yellow' | 'green' | 'blue';

export interface MetricResult {
  metricId: string;
  metricName: string;
  abbreviation: string;
  weight: number;
  actual: number;
  target: number;
  attainmentPct: number; // (actual / target) * 100
  weightedContribution: number; // attainmentPct * weight
}

export interface OAPResult {
  metricResults: MetricResult[];
  oap: number; // sum of weighted contributions * 100 (final %)
  health: HealthColor;
}

export interface CAPResult {
  actualCompensation: number;
  targetCompensation: number;
  cap: number; // (actual / target) * 100
  health: HealthColor;
}

export interface RatioResult {
  actualCompensation: number;
  marketRate: number;
  ratio: number; // (actual / market) * 100
  health: HealthColor;
}

export interface MonthlyReport {
  id: string;
  melderId: string;
  melderName: string;
  roleId: RoleId;
  month: number; // 1–12
  year: number;

  // Raw inputs stored for auditability
  metricInputs: Record<string, { actual: number; target: number }>;
  actualCompensation: number;
  targetCompensation: number;
  marketRate: number;

  // Calculated results
  oapResult: OAPResult;
  capResult: CAPResult;
  ratioResult: RatioResult;

  // Pattern detection
  alerts: Alert[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

export type AlertType =
  | 'flight_risk'
  | 'comp_structure_broken'
  | 'overpaid_underperformer'
  | 'sweet_spot'
  | 'below_market'
  | 'cap_misaligned';

export interface Alert {
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
}

// ─── Storage Shape ─────────────────────────────────────────────────────────────

export interface AppStorage {
  melders: Melder[];
  reports: MonthlyReport[];
  roles: Role[];
  version: number;
}

// ─── UI / Form helpers ─────────────────────────────────────────────────────────

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type Month = typeof MONTHS[number];
