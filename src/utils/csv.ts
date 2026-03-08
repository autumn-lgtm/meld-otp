import Papa from 'papaparse';
import type { AppStorage, Melder, MonthlyReport } from '../types';
import { buildReport } from './calculations';
import { generateId, saveMelder, saveReport } from './storage';

// ─── CSV Export ────────────────────────────────────────────────────────────────

export function exportReportsCSV(reports: MonthlyReport[], melders: Melder[]): void {
  const melderMap = Object.fromEntries(melders.map((m) => [m.id, m]));
  const rows = reports.map((r) => {
    const melder = melderMap[r.melderId];
    return {
      'Melder Name': r.melderName,
      'Role': r.roleId,
      'Month': r.month,
      'Year': r.year,
      'OAP (%)': r.oapResult.oap.toFixed(2),
      'OAP Health': r.oapResult.health,
      'CAP (%)': r.capResult.cap.toFixed(2),
      'CAP Health': r.capResult.health,
      'Ratio (%)': r.ratioResult.ratio.toFixed(2),
      'Ratio Health': r.ratioResult.health,
      'Actual Compensation': r.actualCompensation,
      'Target Compensation': r.targetCompensation,
      'Market Rate': r.marketRate,
      'Alerts': r.alerts.map((a) => a.title).join('; '),
      'Notes': r.notes ?? '',
      'Email': melder?.email ?? '',
    };
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meld-otp-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV Import ────────────────────────────────────────────────────────────────
// Expected CSV columns for bulk Melder import:
// Name, Role, Email, MarketRate, TargetCompensation
//
// Expected CSV columns for report import (pre-calculated or raw):
// MelderName, Role, Month, Year, ActualCompensation, [metric columns per role]

export interface CSVImportResult {
  meldersAdded: number;
  reportsAdded: number;
  errors: string[];
}

export interface SalaryImportResult {
  meldersCreated: number;
  meldersUpdated: number;
  errors: string[];
  warnings: string[];
}

// Salary Report CSV columns (flexible matching):
// Name, Role, Current Salary, Market Salary Target, Total Cash Actual (Meld Comp Plan),
// Total Cash Target (Market)
// "Role" must match a role ID in the system (e.g. BDR, BSE, CSM).
// If Role is omitted, the importer matches by name to an existing Melder.

function parsePct(v: string | undefined): number | null {
  if (!v || v.trim() === '—' || v.trim() === '') return null;
  const n = parseFloat(v.replace('%', '').trim());
  return isNaN(n) ? null : n;
}

function parseDollar(v: string | undefined): number | null {
  if (!v || v.trim() === '—' || v.trim() === '') return null;
  const n = parseFloat(v.replace(/[$,]/g, '').trim());
  return isNaN(n) ? null : n;
}

// suppress unused warning — parsePct may be used by callers
void parsePct;

export function importSalaryReportCSV(
  file: File,
  storage: AppStorage,
  onComplete: (result: SalaryImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let meldersCreated = 0;
      let meldersUpdated = 0;
      let currentStorage = { ...storage };

      (results.data as Record<string, string>[]).forEach((row, idx) => {
        const lineNum = idx + 2;
        const name = (row['Name'] ?? row['name'] ?? '').trim();
        if (!name) { errors.push(`Row ${lineNum}: Missing Name — skipped`); return; }

        const roleId = (row['Role'] ?? row['role'] ?? '').trim().toUpperCase() || null;
        const hireDateRaw = (row['HireDate'] ?? row['Hire Date'] ?? row['StartDate'] ?? row['Start Date'] ?? '').trim();
        let startDate: string | undefined;
        if (hireDateRaw) {
          const d = new Date(hireDateRaw);
          if (!isNaN(d.getTime())) startDate = d.toISOString().slice(0, 10);
        }

        const currentSalary = parseDollar(row['Current Salary'] ?? row['current_salary']);
        const marketSalary  = parseDollar(row['Market Salary Target'] ?? row['Market Salary'] ?? row['market_salary']);
        const totalCashPlan = parseDollar(row['Total Cash Actual (Meld Comp Plan)'] ?? row['Total Cash Actual'] ?? row['total_cash_actual']);
        const totalCashMkt  = parseDollar(row['Total Cash Target (Market)'] ?? row['Total Cash Target'] ?? row['total_cash_target']);

        // Prefer total-cash values over base salary
        const effectiveMarketRate = totalCashMkt  ?? marketSalary  ?? 0;
        const effectiveTargetComp = totalCashPlan ?? currentSalary ?? 0;

        let existingMelder = currentStorage.melders.find((m) => {
          const nameMatch = m.name.toLowerCase() === name.toLowerCase();
          return roleId ? nameMatch && m.roleId === roleId : nameMatch;
        });

        if (!existingMelder && !roleId) {
          warnings.push(`Row ${lineNum}: "${name}" — no Role column and no existing Melder found by name. Skipped.`);
          return;
        }

        if (!existingMelder && roleId) {
          if (!currentStorage.roles.some((r) => r.id === roleId)) {
            errors.push(`Row ${lineNum}: "${name}" — unknown role "${roleId}". Skipped.`);
            return;
          }
          const newMelder: Melder = {
            id: generateId(),
            name,
            roleId,
            startDate,
            marketRate: effectiveMarketRate,
            targetCompensation: effectiveTargetComp,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          currentStorage = saveMelder(currentStorage, newMelder);
          meldersCreated++;
        } else if (existingMelder) {
          const updated: Melder = {
            ...existingMelder,
            marketRate: effectiveMarketRate || existingMelder.marketRate,
            targetCompensation: effectiveTargetComp || existingMelder.targetCompensation,
            updatedAt: new Date().toISOString(),
          };
          currentStorage = saveMelder(currentStorage, updated);
          meldersUpdated++;
        }
      });

      onComplete({ meldersCreated, meldersUpdated, errors, warnings }, currentStorage);
    },
    error: (err) => {
      onComplete({ meldersCreated: 0, meldersUpdated: 0, errors: [err.message], warnings: [] }, storage);
    },
  });
}

export function importMeldersFromCSV(
  file: File,
  storage: AppStorage,
  onComplete: (result: CSVImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      let meldersAdded = 0;
      let currentStorage = { ...storage };

      (results.data as Record<string, string>[]).forEach((row, idx) => {
        const name = row['Name']?.trim();
        const roleId = row['Role']?.trim()?.toUpperCase();
        const marketRate = parseFloat(row['MarketRate'] ?? row['Market Rate'] ?? '0');
        const targetComp = parseFloat(row['TargetCompensation'] ?? row['Target Compensation'] ?? '0');
        const hireDateRaw = (row['HireDate'] ?? row['Hire Date'] ?? row['StartDate'] ?? row['Start Date'] ?? '').trim();

        if (!name) { errors.push(`Row ${idx + 2}: Missing Name`); return; }
        if (!roleId) { errors.push(`Row ${idx + 2}: Missing Role`); return; }

        const roleExists = currentStorage.roles.some((r) => r.id === roleId);
        if (!roleExists) { errors.push(`Row ${idx + 2}: Unknown role "${roleId}"`); return; }

        // Normalise hire date to ISO (YYYY-MM-DD), supporting M/D/YYYY and YYYY-MM-DD input
        let startDate: string | undefined;
        if (hireDateRaw) {
          const d = new Date(hireDateRaw);
          if (!isNaN(d.getTime())) startDate = d.toISOString().slice(0, 10);
        }

        const melder: Melder = {
          id: generateId(),
          name,
          roleId,
          email: row['Email']?.trim() ?? undefined,
          startDate,
          marketRate: isNaN(marketRate) ? 0 : marketRate,
          targetCompensation: isNaN(targetComp) ? 0 : targetComp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        currentStorage = saveMelder(currentStorage, melder);
        meldersAdded++;
      });

      onComplete({ meldersAdded, reportsAdded: 0, errors }, currentStorage);
    },
    error: (err) => {
      onComplete({ meldersAdded: 0, reportsAdded: 0, errors: [err.message] }, storage);
    },
  });
}

export function importReportsFromCSV(
  file: File,
  storage: AppStorage,
  onComplete: (result: CSVImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      let reportsAdded = 0;
      let currentStorage = { ...storage };

      (results.data as Record<string, string>[]).forEach((row, idx) => {
        const melderName = row['MelderName']?.trim() ?? row['Melder Name']?.trim();
        const roleId = row['Role']?.trim()?.toUpperCase();
        const month = parseInt(row['Month'] ?? '0');
        const year = parseInt(row['Year'] ?? '0');
        const actualComp = parseFloat(row['ActualCompensation'] ?? row['Actual Compensation'] ?? '0');
        const targetComp = parseFloat(row['TargetCompensation'] ?? row['Target Compensation'] ?? '0');
        const marketRate = parseFloat(row['MarketRate'] ?? row['Market Rate'] ?? '0');

        if (!melderName) { errors.push(`Row ${idx + 2}: Missing MelderName`); return; }
        if (!roleId) { errors.push(`Row ${idx + 2}: Missing Role`); return; }
        if (!month || month < 1 || month > 12) { errors.push(`Row ${idx + 2}: Invalid Month`); return; }
        if (!year || year < 2020) { errors.push(`Row ${idx + 2}: Invalid Year`); return; }

        // Find or create melder
        let melder = currentStorage.melders.find(
          (m) => m.name.toLowerCase() === melderName.toLowerCase() && m.roleId === roleId
        );

        if (!melder) {
          melder = {
            id: generateId(),
            name: melderName,
            roleId,
            marketRate: isNaN(marketRate) ? 0 : marketRate,
            targetCompensation: isNaN(targetComp) ? 0 : targetComp,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          currentStorage = saveMelder(currentStorage, melder);
        }

        const role = currentStorage.roles.find((r) => r.id === roleId);
        if (!role) { errors.push(`Row ${idx + 2}: Unknown role "${roleId}"`); return; }

        // Build metric inputs from CSV columns (metric abbreviation = column name)
        const metricInputs: Record<string, { actual: number; target: number }> = {};
        role.metrics.forEach((metric) => {
          const actualKey = `${metric.abbreviation}_Actual`;
          const targetKey = `${metric.abbreviation}_Target`;
          const actualVal = parseFloat(row[actualKey] ?? '0');
          const targetVal = parseFloat(row[targetKey] ?? '0');
          metricInputs[metric.id] = {
            actual: isNaN(actualVal) ? 0 : actualVal,
            target: isNaN(targetVal) ? 0 : targetVal,
          };
        });

        const report = buildReport({
          id: generateId(),
          melderId: melder.id,
          melderName: melder.name,
          roleId,
          month,
          year,
          metrics: role.metrics,
          metricInputs,
          actualCompensation: isNaN(actualComp) ? 0 : actualComp,
          targetCompensation: isNaN(targetComp) ? 0 : targetComp,
          marketRate: isNaN(marketRate) ? 0 : marketRate,
        });

        currentStorage = saveReport(currentStorage, report);
        reportsAdded++;
      });

      onComplete({ meldersAdded: 0, reportsAdded, errors }, currentStorage);
    },
    error: (err) => {
      onComplete({ meldersAdded: 0, reportsAdded: 0, errors: [err.message] }, storage);
    },
  });
}

// ─── Paylocity Salary Import ──────────────────────────────────────────────────
// Handles Paylocity's standard "Employee Salary" CSV export.
// Maps Paylocity column names → Melder fields, creates/updates Melders.
// All comp values from Paylocity are annual — divided by 12 for monthly storage.

export interface PaylocityImportResult {
  meldersCreated: number;
  meldersUpdated: number;
  skipped: number;
  unmappedRoles: Array<{ name: string; jobTitle: string }>;
  errors: string[];
  warnings: string[];
}

// Job title → roleId mapping table.
// Keys are lowercase, partial-match friendly.
export const PAYLOCITY_ROLE_MAP: Record<string, string> = {
  'business development associate':    'BDA',
  'bda':                               'BDA',
  'business development representative': 'BDR',
  'bdr':                               'BDR',
  'senior bdr':                        'SR-BDR',
  'sr bdr':                            'SR-BDR',
  'sr. bdr':                           'SR-BDR',
  'principal bdr':                     'SR-BDR',
  'associate business solutions':      'ASSOC-BSE',
  'assoc bse':                         'ASSOC-BSE',
  'business solutions executive':      'BSE',
  'bse':                               'BSE',
  'senior business solutions':         'SR-BSE',
  'sr bse':                            'SR-BSE',
  'sr. bse':                           'SR-BSE',
  'customer success manager':          'CSM',
  'csm':                               'CSM',
  'mid market customer success':       'MM-CSM',
  'mm-csm':                            'MM-CSM',
  'mm csm':                            'MM-CSM',
  'customer support specialist':       'CSS',
  'css':                               'CSS',
  'customer support':                  'CSS',
  'mid market customer enablement':    'MMES',
  'mmes':                              'MMES',
  'customer onboarding manager':       'COM',
  'com':                               'COM',
  'onboarding manager':                'COM',
  'marketing specialist':              'MKT-IC2',
  'mkt-ic2':                           'MKT-IC2',
  'senior marketing manager':          'MKT-IC3',
  'marketing manager':                 'MKT-IC3',
  'mkt-ic3':                           'MKT-IC3',
  'director of marketing':             'MKT-L4',
  'marketing director':                'MKT-L4',
  'mkt-l4':                            'MKT-L4',
};

function resolveRoleFromTitle(jobTitle: string): string | null {
  const norm = jobTitle.toLowerCase().trim();
  // Exact match
  if (PAYLOCITY_ROLE_MAP[norm]) return PAYLOCITY_ROLE_MAP[norm];
  // Contains match (handles "Sr. Customer Success Manager", "BDR II", etc.)
  for (const [key, roleId] of Object.entries(PAYLOCITY_ROLE_MAP)) {
    if (norm.includes(key)) return roleId;
  }
  return null;
}

function pickCol(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  return '';
}

export function importPaylocityCSV(
  file: File,
  storage: AppStorage,
  onComplete: (result: PaylocityImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const unmappedRoles: PaylocityImportResult['unmappedRoles'] = [];
      let meldersCreated = 0;
      let meldersUpdated = 0;
      let skipped = 0;
      let currentStorage = { ...storage };

      (results.data as Record<string, string>[]).forEach((row, idx) => {
        const lineNum = idx + 2;

        // Skip terminated employees
        const status = pickCol(row, 'Employment Status', 'Status', 'Employee Status').toLowerCase();
        if (status && (status.includes('terminat') || status.includes('inactive'))) {
          skipped++;
          return;
        }

        // Build full name from First+Last or combined Name field
        let name = pickCol(row, 'Employee Name', 'Name', 'Full Name', 'EE Name');
        if (!name) {
          const first = pickCol(row, 'First Name', 'FirstName', 'First');
          const last  = pickCol(row, 'Last Name',  'LastName',  'Last');
          if (first || last) name = `${first} ${last}`.trim();
        }
        if (!name) { errors.push(`Row ${lineNum}: Missing employee name — skipped`); return; }

        // Email (stable match key)
        const email = pickCol(row, 'Email Address', 'Work Email', 'Email', 'E-Mail').toLowerCase() || undefined;

        // Hire date
        const hireDateRaw = pickCol(row, 'Hire Date', 'Date of Hire', 'Original Hire Date', 'Start Date', 'HireDate');
        let startDate: string | undefined;
        if (hireDateRaw) {
          const d = new Date(hireDateRaw);
          if (!isNaN(d.getTime())) startDate = d.toISOString().slice(0, 10);
        }

        // Annual salary (Paylocity stores annual base)
        const annualSalaryRaw = pickCol(row, 'Annual Salary', 'Salary Amount', 'Base Salary', 'Salary Rate', 'Salary');
        const annualSalary = parseDollar(annualSalaryRaw);
        if (!annualSalary) {
          warnings.push(`Row ${lineNum}: "${name}" — no salary found, comp fields will not be updated`);
        }
        // Store as monthly (÷12) to match app convention
        const monthlySalary = annualSalary ? annualSalary / 12 : null;

        // Role resolution
        const jobTitle = pickCol(row, 'Job Title', 'Position', 'Title', 'Role');
        const explicitRoleId = pickCol(row, 'Role ID', 'RoleId', 'MeldRole').toUpperCase() || null;
        let roleId: string | null = explicitRoleId;
        if (!roleId && jobTitle) roleId = resolveRoleFromTitle(jobTitle);

        // Match existing Melder (email > name)
        let existing = email
          ? currentStorage.melders.find((m) => m.email?.toLowerCase() === email)
          : null;
        if (!existing) {
          existing = currentStorage.melders.find((m) => m.name.toLowerCase() === name.toLowerCase());
        }

        if (existing) {
          // Update — preserve existing roleId unless explicitly overridden
          const updated: Melder = {
            ...existing,
            email: email ?? existing.email,
            startDate: startDate ?? existing.startDate,
            targetCompensation: monthlySalary ?? existing.targetCompensation,
            // Only update marketRate if we have a new salary and no separate market source
            marketRate: monthlySalary ?? existing.marketRate,
            updatedAt: new Date().toISOString(),
          };
          if (roleId && roleId !== existing.roleId) {
            if (currentStorage.roles.some((r) => r.id === roleId)) {
              updated.roleId = roleId;
            }
          }
          currentStorage = saveMelder(currentStorage, updated);
          meldersUpdated++;
        } else {
          // Create new Melder — role is required
          if (!roleId) {
            unmappedRoles.push({ name, jobTitle: jobTitle || '(no title)' });
            return;
          }
          if (!currentStorage.roles.some((r) => r.id === roleId)) {
            errors.push(`Row ${lineNum}: "${name}" — role "${roleId}" not found in system. Skipped.`);
            return;
          }
          const newMelder: Melder = {
            id: generateId(),
            name,
            roleId,
            email,
            startDate,
            targetCompensation: monthlySalary ?? 0,
            marketRate: monthlySalary ?? 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          currentStorage = saveMelder(currentStorage, newMelder);
          meldersCreated++;
        }
      });

      onComplete({ meldersCreated, meldersUpdated, skipped, unmappedRoles, errors, warnings }, currentStorage);
    },
    error: (err) => {
      onComplete({ meldersCreated: 0, meldersUpdated: 0, skipped: 0, unmappedRoles: [], errors: [err.message], warnings: [] }, storage);
    },
  });
}

// ─── Commission / Bonus Import ────────────────────────────────────────────────
// Monthly payout CSV (Paylocity payroll detail, commission tool export, etc.).
// Updates actualCompensation on existing MonthlyReports, or creates stub reports.
// Input comp values are per-month (already monthly, not annual).

export interface CommissionImportResult {
  reportsUpdated: number;
  reportsCreated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

function parseCommissionPeriod(raw: string): { month: number; year: number } | null {
  if (!raw) return null;
  const clean = raw.trim();

  // "2025-03" or "03/2025"
  const isoMatch = clean.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) return { year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]) };

  const slashMatch = clean.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return { month: parseInt(slashMatch[1]), year: parseInt(slashMatch[2]) };

  // "March 2025", "Mar 2025"
  const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const namedMatch = clean.toLowerCase().match(/^([a-z]{3})[a-z]*\s+(\d{4})$/);
  if (namedMatch) {
    const m = MONTH_NAMES.indexOf(namedMatch[1]) + 1;
    if (m > 0) return { month: m, year: parseInt(namedMatch[2]) };
  }

  // Date-like "03/15/2025" or "2025-03-15" — use month of the date
  const d = new Date(clean);
  if (!isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() };

  return null;
}

export function importCommissionCSV(
  file: File,
  storage: AppStorage,
  month: number,     // fallback period if not in CSV
  year: number,
  onComplete: (result: CommissionImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let reportsUpdated = 0;
      let reportsCreated = 0;
      let skipped = 0;
      let currentStorage = { ...storage };

      (results.data as Record<string, string>[]).forEach((row, idx) => {
        const lineNum = idx + 2;

        // Employee name
        const name = pickCol(row, 'Employee Name', 'Full Name', 'Name', 'EE Name').trim();
        if (!name) { errors.push(`Row ${lineNum}: Missing employee name — skipped`); return; }

        // Period
        const periodRaw = pickCol(row, 'Pay Period', 'Period', 'Pay Date', 'Check Date', 'Month Year', 'PayPeriod');
        const explicitMonth = parseInt(pickCol(row, 'Month', 'Pay Month') || '0');
        const explicitYear  = parseInt(pickCol(row, 'Year',  'Pay Year')  || '0');

        let reportMonth = month;
        let reportYear  = year;

        if (explicitMonth >= 1 && explicitMonth <= 12 && explicitYear >= 2020) {
          reportMonth = explicitMonth;
          reportYear  = explicitYear;
        } else if (periodRaw) {
          const parsed = parseCommissionPeriod(periodRaw);
          if (parsed) { reportMonth = parsed.month; reportYear = parsed.year; }
        }

        // Comp amounts (monthly, not annual)
        const totalGross  = parseDollar(pickCol(row, 'Total Gross Pay', 'Gross Pay', 'Total Pay', 'Total Compensation', 'Total Actual Pay'));
        const basePay     = parseDollar(pickCol(row, 'Regular Pay', 'Base Pay', 'Salary', 'Base Earnings', 'Regular Earnings'));
        const variablePay = parseDollar(pickCol(row, 'Commission', 'Variable Pay', 'Bonus', 'Incentive Pay', 'Commission Earned', 'Variable Earnings'));

        let actualComp: number | null = null;
        if (totalGross != null) {
          actualComp = totalGross;
        } else if (basePay != null) {
          actualComp = basePay + (variablePay ?? 0);
        }

        if (actualComp == null) {
          warnings.push(`Row ${lineNum}: "${name}" — no compensation amount found, skipped`);
          skipped++;
          return;
        }

        // Find Melder
        const melder = currentStorage.melders.find(
          (m) => m.name.toLowerCase() === name.toLowerCase()
        );
        if (!melder) {
          errors.push(`Row ${lineNum}: "${name}" — no matching Melder found. Add them first via Paylocity import.`);
          return;
        }

        // Find existing report for this period
        const existingReport = currentStorage.reports.find(
          (r) => r.melderId === melder.id && r.month === reportMonth && r.year === reportYear
        );

        if (existingReport) {
          // Update actualCompensation
          const updated: MonthlyReport = {
            ...existingReport,
            actualCompensation: actualComp,
            capResult: {
              ...existingReport.capResult,
              actualCompensation: actualComp,
              cap: existingReport.targetCompensation > 0
                ? (actualComp / existingReport.targetCompensation) * 100
                : 0,
            },
            updatedAt: new Date().toISOString(),
          };
          // Recompute ratio too
          updated.ratioResult = {
            ...updated.ratioResult,
            actualCompensation: actualComp,
            ratio: updated.marketRate > 0 ? (actualComp / updated.marketRate) * 100 : 0,
          };
          currentStorage = saveReport(currentStorage, updated);
          reportsUpdated++;
        } else {
          // Create stub report — OAP metrics will be empty (0%), needs manual entry
          const role = currentStorage.roles.find((r) => r.id === melder.roleId);
          if (!role) {
            errors.push(`Row ${lineNum}: "${name}" — role "${melder.roleId}" not found. Skipped.`);
            return;
          }
          const stub = buildReport({
            id: generateId(),
            melderId: melder.id,
            melderName: melder.name,
            roleId: melder.roleId,
            month: reportMonth,
            year: reportYear,
            metrics: role.metrics,
            metricInputs: {},
            actualCompensation: actualComp,
            targetCompensation: melder.targetCompensation,
            marketRate: melder.marketRate,
          });
          currentStorage = saveReport(currentStorage, stub);
          reportsCreated++;
          warnings.push(`"${name}" — stub report created for ${reportMonth}/${reportYear}. Add OAP metrics in the Calculator.`);
        }
      });

      onComplete({ reportsUpdated, reportsCreated, skipped, errors, warnings }, currentStorage);
    },
    error: (err) => {
      onComplete({ reportsUpdated: 0, reportsCreated: 0, skipped: 0, errors: [err.message], warnings: [] }, storage);
    },
  });
}
