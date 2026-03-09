import type {
  Alert,
  CAPResult,
  HealthColor,
  MetricDefinition,
  MetricResult,
  MonthlyReport,
  OAPResult,
  RatioResult,
} from '../types';

// ─── Proration ─────────────────────────────────────────────────────────────────
// Returns the fraction of a month worked (0–1) if the Melder's startDate falls
// within the given month/year. Returns null when no proration applies.

export function getProratedFactor(
  startDate: string | undefined,
  month: number,
  year: number
): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  if (start.getFullYear() !== year || start.getMonth() + 1 !== month) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysWorked = daysInMonth - start.getDate() + 1;
  return Math.min(Math.max(daysWorked / daysInMonth, 0), 1);
}

// ─── Health Thresholds ─────────────────────────────────────────────────────────

export function getOAPHealth(oap: number): HealthColor {
  if (oap >= 100) return 'green';
  if (oap >= 90) return 'yellow';
  return 'red';
}

export function getCAPHealth(cap: number): HealthColor {
  if (cap >= 100) return 'green';
  if (cap >= 90) return 'yellow';
  return 'red';
}

export function getRatioHealth(ratio: number): HealthColor {
  if (ratio > 105) return 'blue';
  if (ratio >= 95) return 'green';
  if (ratio >= 80) return 'yellow';
  return 'red';
}

// ─── OAP Calculation ───────────────────────────────────────────────────────────
// Formula: OAP = sum( (actual/target) * weight ) * 100
// For inverse metrics (lower is better, e.g. response time): attainment = target/actual

export function calculateOAP(
  metrics: MetricDefinition[],
  inputs: Record<string, { actual: number; target: number }>
): OAPResult {
  const metricResults: MetricResult[] = metrics.map((metric) => {
    const input = inputs[metric.id] ?? { actual: 0, target: 0 };
    let attainmentPct: number;
    if (metric.inverse) {
      // Lower actual = better; attainment = target / actual (capped at 150%)
      attainmentPct = input.actual > 0 ? Math.min((input.target / input.actual) * 100, 150) : 0;
    } else {
      attainmentPct = input.target > 0 ? Math.min((input.actual / input.target) * 100, 150) : 0;
    }
    const weightedContribution = attainmentPct * metric.weight;
    return {
      metricId: metric.id,
      metricName: metric.name,
      abbreviation: metric.abbreviation,
      weight: metric.weight,
      actual: input.actual,
      target: input.target,
      attainmentPct,
      weightedContribution,
    };
  });

  const oap = metricResults.reduce((sum, r) => sum + r.weightedContribution, 0);

  return {
    metricResults,
    oap,
    health: getOAPHealth(oap),
  };
}

// ─── CAP Calculation ───────────────────────────────────────────────────────────
// Formula: CAP = (actualCompensation / targetCompensation) * 100

export function calculateCAP(actualCompensation: number, targetCompensation: number): CAPResult {
  const cap = targetCompensation > 0 ? (actualCompensation / targetCompensation) * 100 : 0;
  return {
    actualCompensation,
    targetCompensation,
    cap,
    health: getCAPHealth(cap),
  };
}

// ─── Compensation Ratio Calculation ───────────────────────────────────────────
// Formula: Ratio = (actualCompensation / marketRate) * 100

export function calculateRatio(actualCompensation: number, marketRate: number): RatioResult {
  const ratio = marketRate > 0 ? (actualCompensation / marketRate) * 100 : 0;
  return {
    actualCompensation,
    marketRate,
    ratio,
    health: getRatioHealth(ratio),
  };
}

// ─── Alert Detection ───────────────────────────────────────────────────────────

export function detectAlerts(
  oapResult: OAPResult,
  capResult: CAPResult,
  ratioResult: RatioResult
): Alert[] {
  const alerts: Alert[] = [];
  const { oap } = oapResult;
  const { cap } = capResult;
  const { ratio } = ratioResult;

  const highOAP = oap >= 90;
  const lowCAP = cap < 90;
  const lowRatio = ratio < 85;
  const highRatio = ratio > 105;
  const lowOAP = oap < 90;
  const highCAP = cap >= 100;

  // Sweet spot — all green
  if (oapResult.health === 'green' && capResult.health === 'green' &&
    (ratioResult.health === 'green' || ratioResult.health === 'blue')) {
    alerts.push({
      type: 'sweet_spot',
      severity: 'info',
      title: 'Sweet Spot',
      description: 'All three metrics are aligned and healthy. This Melder is performing well and being compensated fairly at a competitive market rate.',
    });
    return alerts; // sweet spot — no other alerts needed
  }

  // Flight risk: high performance, low market competitiveness
  if (highOAP && lowRatio) {
    alerts.push({
      type: 'flight_risk',
      severity: 'critical',
      title: 'Flight Risk',
      description: `High performance (${oap.toFixed(1)}% OAP) but compensation is only ${ratio.toFixed(1)}% of market rate. This Melder is an underpaid star performer — a retention risk.`,
    });
  }

  // Broken comp structure: performs but doesn't get paid for it
  if (highOAP && lowCAP) {
    alerts.push({
      type: 'comp_structure_broken',
      severity: 'critical',
      title: 'Compensation Structure Broken',
      description: `This Melder delivered ${oap.toFixed(1)}% OAP but only received ${cap.toFixed(1)}% of target compensation. The comp structure is not rewarding performance — this is a system integrity issue.`,
    });
  }

  // Overpaid underperformer
  if (lowOAP && highCAP) {
    alerts.push({
      type: 'overpaid_underperformer',
      severity: 'warning',
      title: 'Overpaid Relative to Output',
      description: `Compensation attainment (${cap.toFixed(1)}% CAP) significantly exceeds performance (${oap.toFixed(1)}% OAP). Review whether comp structure is appropriately tied to outcomes.`,
    });
  }

  // Below market even with good CAP
  if (lowRatio && !highOAP) {
    alerts.push({
      type: 'below_market',
      severity: 'warning',
      title: 'Below Market Rate',
      description: `Compensation is ${ratio.toFixed(1)}% of market rate (threshold: 85%). Consider a market adjustment to maintain competitive positioning.`,
    });
  }

  // CAP misalignment without the other pattern triggers
  if (lowCAP && !highOAP) {
    alerts.push({
      type: 'cap_misaligned',
      severity: 'warning',
      title: 'Compensation Below Target',
      description: `CAP is ${cap.toFixed(1)}% — below the 90% system integrity threshold. Review whether this reflects a structural issue or temporary adjustment.`,
    });
  }

  // Above market note
  if (highRatio) {
    alerts.push({
      type: 'sweet_spot',
      severity: 'info',
      title: 'Above Market',
      description: `Compensation is ${ratio.toFixed(1)}% of market rate — intentionally above market. Ensure this is a deliberate strategic decision.`,
    });
  }

  return alerts;
}

// ─── Full Monthly Report Builder ───────────────────────────────────────────────

export function buildReport(params: {
  id: string;
  melderId: string;
  melderName: string;
  roleId: string;
  month: number;
  year: number;
  metrics: MetricDefinition[];
  metricInputs: Record<string, { actual: number; target: number }>;
  actualCompensation: number;
  targetCompensation: number;
  marketRate: number;
  notes?: string;
}): MonthlyReport {
  const oapResult = calculateOAP(params.metrics, params.metricInputs);
  const capResult = calculateCAP(params.actualCompensation, params.targetCompensation);
  const ratioResult = calculateRatio(params.actualCompensation, params.marketRate);
  const alerts = detectAlerts(oapResult, capResult, ratioResult);
  const now = new Date().toISOString();

  return {
    id: params.id,
    melderId: params.melderId,
    melderName: params.melderName,
    roleId: params.roleId,
    month: params.month,
    year: params.year,
    metricInputs: params.metricInputs,
    actualCompensation: params.actualCompensation,
    targetCompensation: params.targetCompensation,
    marketRate: params.marketRate,
    oapResult,
    capResult,
    ratioResult,
    alerts,
    notes: params.notes,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Team Aggregation ──────────────────────────────────────────────────────────

export interface TeamSummary {
  avgOAP: number;
  avgCAP: number;
  avgRatio: number;
  totalActualComp: number;
  totalTargetComp: number;
  totalMarketRate: number;
  oapHealth: HealthColor;
  capHealth: HealthColor;
  ratioHealth: HealthColor;
  reportCount: number;
}

export function aggregateTeamReports(reports: MonthlyReport[]): TeamSummary | null {
  if (reports.length === 0) return null;
  const avgOAP = reports.reduce((s, r) => s + r.oapResult.oap, 0) / reports.length;
  const avgCAP = reports.reduce((s, r) => s + r.capResult.cap, 0) / reports.length;
  const avgRatio = reports.reduce((s, r) => s + r.ratioResult.ratio, 0) / reports.length;
  return {
    avgOAP,
    avgCAP,
    avgRatio,
    totalActualComp: reports.reduce((s, r) => s + r.actualCompensation, 0),
    totalTargetComp: reports.reduce((s, r) => s + r.targetCompensation, 0),
    totalMarketRate: reports.reduce((s, r) => s + r.marketRate, 0),
    oapHealth: getOAPHealth(avgOAP),
    capHealth: getCAPHealth(avgCAP),
    ratioHealth: getRatioHealth(avgRatio),
    reportCount: reports.length,
  };
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}
