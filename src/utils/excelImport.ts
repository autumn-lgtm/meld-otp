import * as XLSX from 'xlsx';
import type { CompPlan, CompPlanComponent } from '../types';
import { generateId } from './storage';

// ─── Excel / CSV Comp Plan Importer ──────────────────────────────────────────
// Reads .xlsx / .xls / .csv comp plan files.
// Tries to detect column layout from header keywords and extract structured
// CompPlan records — one per role row found.

export interface ExcelImportResult {
  plans: CompPlan[];
  warnings: string[];
  errors: string[];
  sheetsSeen: string[];
  meldersUpdated?: number;
}

// Keyword maps for each field we want to extract
const KEYWORDS: Record<string, string[]> = {
  role:        ['role', 'title', 'position', 'job title', 'level', 'job', 'function', 'name'],
  department:  ['dept', 'department', 'team', 'group'],
  base:        ['base salary', 'base pay', 'fixed salary', 'base comp', 'base', 'salary', 'fixed'],
  variable:    ['variable target', 'variable comp', 'incentive target', 'variable pay', 'commission target', 'bonus target', 'variable', 'incentive', 'at risk'],
  ote:         ['on-target earnings', 'on target earnings', 'total cash', 'total comp', 'ote', 'total target', 'total'],
  variablePct: ['variable %', 'variable pct', 'var %', 'incentive %', '% variable', '% at risk', 'variable percent', 'var%'],
  basePct:     ['base %', 'base pct', 'fixed %', '% base', 'base percent'],
};

// Department name normalisation
const DEPT_ALIASES: Record<string, string> = {
  'sales':                        'Business Development',
  'bdr':                          'Business Development',
  'business dev':                 'Business Development',
  'business development':         'Business Development',
  'bse':                          'Business Solutions',
  'business solutions':           'Business Solutions',
  'csm':                          'Customer Success',
  'customer success':             'Customer Success',
  'css':                          'Customer Support & Enablement',
  'customer support':             'Customer Support & Enablement',
  'customer enablement':          'Customer Support & Enablement',
  'support':                      'Customer Support & Enablement',
  'onboarding':                   'Customer Onboarding',
  'customer onboarding':          'Customer Onboarding',
  'mkt':                          'Marketing',
  'marketing':                    'Marketing',
  'eng':                          'Engineering',
  'engineering':                  'Engineering',
  'data':                         'Engineering & Data',
  'engineering & data':           'Engineering & Data',
  'product':                      'Product',
  'people':                       'People Ops',
  'people ops':                   'People Ops',
  'hr':                           'People Ops',
  'human resources':              'People Ops',
};

function normaliseDept(raw: string): string {
  const k = raw.toLowerCase().trim();
  return DEPT_ALIASES[k] ?? raw.trim();
}

// Score a column header against a keyword list (higher = better match)
function matchScore(header: string, keywords: string[]): number {
  const h = header.toLowerCase().trim();
  for (const kw of keywords) {
    if (h === kw) return 10;         // exact
    if (h.includes(kw)) return 5;   // contains
    if (kw.includes(h)) return 3;   // header is substring of keyword
  }
  return 0;
}

// Pick the best column index for each field from a header row
function detectColumns(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [field, keywords] of Object.entries(KEYWORDS)) {
    let bestIdx = -1;
    let bestScore = 0;
    headers.forEach((h, i) => {
      const s = matchScore(h, keywords);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    if (bestIdx >= 0 && bestScore >= 3) result[field] = bestIdx;
  }
  return result;
}

// Parse a cell value to a dollar amount
function toDollar(val: unknown): number | null {
  if (val == null || val === '') return null;
  const s = String(val).replace(/[$,\s]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Parse a cell value to a percentage (0–100 range)
function toPct(val: unknown): number | null {
  if (val == null || val === '') return null;
  const s = String(val).replace(/[%\s]/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // If the value looks like a decimal (0.34), convert to %
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

// Infer department from sheet name or role name
function inferDept(sheetName: string, roleName: string): string {
  const candidates = [sheetName, roleName];
  for (const c of candidates) {
    const k = c.toLowerCase();
    for (const [alias, dept] of Object.entries(DEPT_ALIASES)) {
      if (k.includes(alias)) return dept;
    }
  }
  return sheetName.trim() || 'Unknown';
}

// Try to detect variable comp components from column names
function detectComponents(headers: string[], row: (unknown)[]): CompPlanComponent[] {
  const components: CompPlanComponent[] = [];
  const compKeywords = ['commission', 'bonus', 'spiff', 'incentive', 'variable', 'at risk'];
  const seenIndices = new Set<number>();

  headers.forEach((h, i) => {
    const lower = h.toLowerCase();
    const isComp = compKeywords.some((kw) => lower.includes(kw));
    if (!isComp || seenIndices.has(i)) return;
    const val = toDollar(row[i]);
    if (!val) return;

    seenIndices.add(i);
    const type: CompPlanComponent['type'] =
      lower.includes('commission') ? 'commission' :
      lower.includes('spiff')      ? 'spiff'      :
      lower.includes('bonus')      ? 'bonus'      : 'other';

    const frequency: CompPlanComponent['frequency'] =
      lower.includes('annual') ? 'annual' :
      lower.includes('quarter') ? 'quarterly' : 'monthly';

    components.push({
      id: generateId(),
      name: h.trim(),
      type,
      frequency,
      annualTarget: frequency === 'monthly' ? val * 12 : frequency === 'quarterly' ? val * 4 : val,
    });
  });

  return components;
}

// Detect the vertical CSM/BSE Compensation Calculator format
function isCSMCalculatorFormat(rows: unknown[][]): boolean {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const s = (rows[i] ?? []).map((c) => String(c ?? '').toLowerCase()).join(' ');
    if (s.includes('compensation calculator')) return true;
  }
  // Secondary: check for GRR payout tiers (CSM-specific)
  let hasGRR = false, hasRetention = false;
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const s = (rows[i] ?? []).map((c) => String(c ?? '').toLowerCase()).join(' ');
    if (s.includes('grr payout')) hasGRR = true;
    if (s.includes('retention bonus')) hasRetention = true;
  }
  return hasGRR && hasRetention;
}

function parseCSMCalculatorSheet(sheetName: string, rows: unknown[][], warnings: string[]): CompPlan[] {
  const cell = (row: unknown[], col: number): string => String(row?.[col] ?? '').trim();

  let planTitle = '';
  let melderName = '';
  let baseSalaryAnnual = 0;
  let oteAnnual = 0;
  let retentionBonusHitAnnual = 0;
  let upsellCommHitAnnual = 0;
  let grrHitTarget = 0;
  let upsellQuotaMonthly = 0;
  let hasRecoveryBonus = false;
  let inGRRTiers = false;
  let inScenarios = false;

  // Scan rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const label = cell(row, 0).toLowerCase();
    const c1 = cell(row, 1);
    const c2 = cell(row, 2);

    // Title row (first few rows only)
    if (i < 4) {
      const raw = cell(row, 0);
      if (raw.toLowerCase().includes('compensation calculator') && !planTitle) {
        planTitle = raw;
      }
      // "CSM: Bailey | Portfolio: ..."
      const rolePrefix = raw.match(/^([A-Z][\w-]+):\s*([^|,\n]+)/i);
      if (rolePrefix && !melderName) {
        melderName = rolePrefix[2].trim();
      }
    }

    // Section markers
    if (label.includes('grr payout tiers') || label.includes('grr tiers')) {
      inGRRTiers = true; inScenarios = false; continue;
    }
    if (label === 'compensation scenarios' || label.startsWith('compensation scenarios')) {
      inGRRTiers = false; inScenarios = true; continue;
    }
    const isRecoverySection = label.includes('recovery win bonus') || label.includes('recovery win spiff');
    if (label.includes('quarterly upsell') || label.includes('quarterly retention') || label.includes('annual compensation overview') || isRecoverySection) {
      inGRRTiers = false;
      if (isRecoverySection) hasRecoveryBonus = true;
      else inScenarios = false;
      continue;
    }
    // Reset scenarios on blank rows
    if (label === '' && inScenarios && i > 10) {
      // Don't reset — OTE row comes after a blank after "Total Annual Compensation"
    }

    // Base Salary
    if (label === 'base salary' && !inScenarios) {
      baseSalaryAnnual = toDollar(c1) ?? baseSalaryAnnual;
    }

    // Upsell Quota — parse monthly from label text
    if (!inScenarios && label.startsWith('upsell quota')) {
      const monthMatch = label.match(/\$([0-9,]+)\s*\/\s*month/i);
      if (monthMatch) {
        upsellQuotaMonthly = parseFloat(monthMatch[1].replace(/,/g, ''));
      } else {
        const annual = toDollar(c1);
        if (annual) upsellQuotaMonthly = Math.round(annual / 12);
      }
    }

    // GRR Hit tier — only capture the first (primary/highest-weight) tier
    if (inGRRTiers && label === 'hit') {
      const g = toPct(c1) ?? toPct(c2);
      if (g && !grrHitTarget) grrHitTarget = g;
    }

    // OTE row (Hit value is always in col 2 here)
    if (label.includes('ote') || label.includes('on target earnings')) {
      const v = toDollar(c2) ?? toDollar(c1);
      if (v) oteAnnual = v;
    }

    // Compensation Scenarios rows (Hit = col 2)
    if (inScenarios) {
      if (label.includes('retention bonus')) {
        // Accumulate — handles split rows like "Y1 Retention Bonus (80%)" + "Y2+ Retention Bonus (20%)"
        retentionBonusHitAnnual += toDollar(c2) ?? 0;
      }
      if (label.includes('upsell commission')) {
        upsellCommHitAnnual = toDollar(c2) ?? upsellCommHitAnnual;
      }
      if ((label.includes('total annual comp') || label.includes('total annual compensation')) && !oteAnnual) {
        oteAnnual = toDollar(c2) ?? 0;
      }
    }
  }

  if (baseSalaryAnnual === 0 && oteAnnual === 0) {
    warnings.push(`Sheet "${sheetName}": CSM Calculator format detected but could not extract comp values`);
    return [];
  }

  // Build components
  const components: CompPlanComponent[] = [];
  if (retentionBonusHitAnnual > 0) {
    components.push({ id: generateId(), name: 'Quarterly Retention Bonus', type: 'bonus', frequency: 'quarterly', annualTarget: retentionBonusHitAnnual });
  }
  if (upsellCommHitAnnual > 0) {
    components.push({ id: generateId(), name: 'Upsell Commission (75%)', type: 'commission', frequency: 'quarterly', annualTarget: upsellCommHitAnnual });
  }
  if (hasRecoveryBonus) {
    components.push({ id: generateId(), name: 'Recovery Win Bonus (50% of Saved MRR)', type: 'spiff', frequency: 'quarterly', annualTarget: 0 });
  }

  const annualVariable = Math.max(0, oteAnnual - baseSalaryAnnual);
  const variablePct = oteAnnual > 0 ? Math.round((annualVariable / oteAnnual) * 100) : 0;

  // Extract tier label from title
  const tierMatch = planTitle.match(/^(.+?)\s*[-–]\s*Compensation Calculator/i);
  const planTierLabel = tierMatch ? tierMatch[1].trim() : planTitle.trim();

  // Detect department
  let department = inferDept(sheetName, planTitle);
  if (planTitle.toLowerCase().includes('csm') || planTitle.toLowerCase().includes('customer success')) {
    department = 'Customer Success';
  }

  // OAP metric targets
  type MetricTarget = { abbreviation: string; monthlyTarget: number; label?: string };
  const metricTargets: MetricTarget[] = [];
  if (grrHitTarget > 0) {
    metricTargets.push({ abbreviation: 'GRR', monthlyTarget: grrHitTarget, label: `${grrHitTarget}% GRR (Hit tier)` });
  }
  if (upsellQuotaMonthly > 0) {
    metricTargets.push({ abbreviation: 'UCR', monthlyTarget: upsellQuotaMonthly, label: `$${upsellQuotaMonthly.toLocaleString('en-US')}/mo upsell quota` });
  }

  const plan: CompPlan = {
    id: generateId(),
    department,
    roleName: planTierLabel || 'Customer Success Manager',
    planTierLabel: planTierLabel || undefined,
    melderName: melderName || undefined,
    basePct: 100 - variablePct,
    variablePct,
    annualOTE: Math.round(oteAnnual),
    annualBase: Math.round(baseSalaryAnnual),
    annualVariable: Math.round(annualVariable),
    components,
    metricTargets: metricTargets.length > 0 ? metricTargets : undefined,
    source: 'Comp Plan Import',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [plan];
}

// Parse a single sheet into CompPlan candidates
function parseSheet(
  sheetName: string,
  rows: unknown[][],
  warnings: string[]
): CompPlan[] {
  if (rows.length < 2) return [];

  // Find header row: first row that has ≥3 non-empty string cells
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const nonEmpty = (rows[i] ?? []).filter((c) => c != null && c !== '').length;
    if (nonEmpty >= 3) { headerRowIdx = i; break; }
  }

  const headerRow = (rows[headerRowIdx] ?? []).map((c) => String(c ?? ''));
  const cols = detectColumns(headerRow);

  if (cols.role === undefined && cols.base === undefined && cols.ote === undefined) {
    warnings.push(`Sheet "${sheetName}": could not detect comp plan columns — skipped`);
    return [];
  }

  const plans: CompPlan[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const roleRaw = cols.role !== undefined ? String(row[cols.role] ?? '').trim() : '';
    if (!roleRaw) continue; // skip empty rows

    const deptRaw = cols.department !== undefined ? String(row[cols.department] ?? '').trim() : '';
    const department = deptRaw
      ? normaliseDept(deptRaw)
      : inferDept(sheetName, roleRaw);

    const base       = cols.base       !== undefined ? toDollar(row[cols.base])       : null;
    const variable   = cols.variable   !== undefined ? toDollar(row[cols.variable])   : null;
    const ote        = cols.ote        !== undefined ? toDollar(row[cols.ote])         : null;
    const variablePctRaw = cols.variablePct !== undefined ? toPct(row[cols.variablePct]) : null;
    const basePctRaw     = cols.basePct     !== undefined ? toPct(row[cols.basePct])     : null;

    // Derive missing values
    let annualOTE      = ote    ?? (base != null && variable != null ? base + variable : 0);
    let annualBase     = base   ?? (annualOTE && variablePctRaw ? annualOTE * (1 - variablePctRaw / 100) : 0);
    let annualVariable = variable ?? (annualOTE && annualBase ? annualOTE - annualBase : 0);

    let variablePct = variablePctRaw ?? (annualOTE > 0 ? Math.round((annualVariable / annualOTE) * 100) : 0);
    let basePct     = basePctRaw     ?? (100 - variablePct);

    // Clamp
    variablePct = Math.max(0, Math.min(100, variablePct));
    basePct     = Math.max(0, Math.min(100, basePct));

    // Detect component breakdown columns
    const components = detectComponents(headerRow, row);

    plans.push({
      id: generateId(),
      department,
      roleName: roleRaw,
      basePct,
      variablePct,
      annualOTE: Math.round(annualOTE),
      annualBase: Math.round(annualBase),
      annualVariable: Math.round(annualVariable),
      components,
      source: 'Excel Import',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return plans;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function importCompPlanExcel(
  file: File,
  onComplete: (result: ExcelImportResult) => void
): void {
  const reader = new FileReader();

  reader.onload = (e) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const allPlans: CompPlan[] = [];
    const sheetsSeen: string[] = [];

    try {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      for (const sheetName of workbook.SheetNames) {
        sheetsSeen.push(sheetName);
        const sheet = workbook.Sheets[sheetName];
        // Convert to array of arrays (raw values)
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        const plans = isCSMCalculatorFormat(rows)
          ? parseCSMCalculatorSheet(sheetName, rows, warnings)
          : parseSheet(sheetName, rows, warnings);
        allPlans.push(...plans);
      }

      if (allPlans.length === 0) {
        errors.push('No comp plan rows could be extracted. Make sure your file has columns for Role/Title, Base, Variable, and/or OTE.');
      }
    } catch (err) {
      errors.push(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`);
    }

    onComplete({ plans: allPlans, warnings, errors, sheetsSeen });
  };

  reader.onerror = () => {
    onComplete({ plans: [], warnings: [], errors: ['Failed to read file'], sheetsSeen: [] });
  };

  reader.readAsArrayBuffer(file);
}
