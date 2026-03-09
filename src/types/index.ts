// ─── Role Definitions ──────────────────────────────────────────────────────────

export type RoleId = 'CSM' | 'BSE' | 'BDR' | string;

export interface MetricDefinition {
  id: string;
  name: string;
  abbreviation: string;
  weight: number; // 0–1, must sum to 1 across metrics for a role
  description: string;
  defaultTarget?: number;  // pre-filled quota for this role (numeric)
  targetDisplay?: string;  // human-readable target label, e.g. "$5,500/mo" or "98%"
  inverse?: boolean;       // true = lower actual is better (e.g. response time); uses target/actual
}

export interface Role {
  id: RoleId;
  name: string;
  fullName: string;
  level?: 'IC1' | 'IC2' | 'IC3' | 'IC4' | 'MGR' | 'L1' | 'L2' | 'L3' | 'L4';
  cadence: 'monthly' | 'quarterly';
  metrics: MetricDefinition[];
  isCustom?: boolean;
  department?: string; // explicit dept override; falls back to ROLE_DEPT map if unset
}

// ─── Melder ────────────────────────────────────────────────────────────────────

export interface Melder {
  id: string;
  name: string;
  roleId: RoleId;
  email?: string;
  startDate?: string; // ISO date
  department?: string; // explicit dept label (e.g. from Paylocity); falls back to role-dept map
  marketRate: number; // annual market rate for Ratio calculation
  targetCompensation: number; // annual OTE / target comp
  metricTargetOverrides?: Record<string, number>; // abbreviation → target value (same units as metric)
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

// ─── Annual Performance Snapshot ──────────────────────────────────────────────

export interface AnnualSnapshot {
  id: string;                        // unique: slugified `${year}-${team}-${name}`
  year: number;
  team: string;
  name: string;
  level: string | null;
  tenure: string | null;
  oaPct: number | null;
  capPct: number | null;
  compRatio: number | null;
  currentSalary: number | null;
  marketSalary: number | null;
  totalCashTargetMarket: number | null;
  totalCashActualMeld: number | null;
  ytdCashTarget: number | null;
  ytdCashPaid: number | null;
  annualCashPaid: number | null;
  q1Oa: number | null;
  q2Oa: number | null;
  q3Oa: number | null;
  q4Oa: number | null;
}

// ─── Comp Plans ────────────────────────────────────────────────────────────────

export interface CompPlanComponent {
  id: string;
  name: string;
  type: 'commission' | 'bonus' | 'spiff' | 'other';
  frequency: 'monthly' | 'quarterly' | 'annual';
  annualTarget: number;
  description?: string;
}

export interface CompPlan {
  id: string;
  department: string;
  roleId?: string;          // links to Role.id if known
  roleName: string;         // display name (from import or manual entry)
  // Pay mix — what % of total cash is base vs variable
  basePct: number;          // e.g., 66
  variablePct: number;      // e.g., 34
  // Annual targets
  annualOTE: number;        // on-target total cash (base + variable)
  annualBase: number;       // base salary target
  annualVariable: number;   // variable comp target
  // Variable comp breakdown
  components: CompPlanComponent[];
  melderName?: string;      // specific Melder this plan is for (e.g. "Bailey")
  planTierLabel?: string;   // tier label, e.g. "Year 2+ SMB (300-600 Doors)"
  metricTargets?: Array<{   // OAP metric targets from variable comp structure
    abbreviation: string;   // e.g. 'GRR', 'UCR'
    monthlyTarget: number;  // monthly value (GRR as %, UCR as $)
    label?: string;         // human-readable description
  }>;
  source?: string;          // "Excel Import", "Manual", etc.
  effectiveDate?: string;   // ISO date — when this plan took effect
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Storage Shape ─────────────────────────────────────────────────────────────

export interface AppStorage {
  melders: Melder[];
  reports: MonthlyReport[];
  roles: Role[];
  annualSnapshots: AnnualSnapshot[];
  compPlans: CompPlan[];
  version: number;
}

// ─── UI / Form helpers ─────────────────────────────────────────────────────────

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type Month = typeof MONTHS[number];
