import Papa from 'papaparse';
import type { AppStorage, Melder, MonthlyReport, RoleId } from '../types';
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
  // Business Development
  'business development associate':      'BDA',
  'bda':                                 'BDA',
  'business development representative': 'BDR',
  'bdr':                                 'BDR',
  'senior business development':         'SR-BDR',
  'senior bdr':                          'SR-BDR',
  'sr bdr':                              'SR-BDR',
  'sr. bdr':                             'SR-BDR',
  'principal bdr':                       'SR-BDR',
  'sr-bdr':                              'SR-BDR',
  // Business Solutions
  'associate business solutions':        'ASSOC-BSE',
  'assoc bse':                           'ASSOC-BSE',
  'business solutions executive':        'BSE',
  'bse':                                 'BSE',
  'senior business solutions':           'SR-BSE',
  'sr bse':                              'SR-BSE',
  'sr. bse':                             'SR-BSE',
  'sr-bse':                              'SR-BSE',
  'director of business solutions':      'BS-DIR',
  'business solutions director':         'BS-DIR',
  'bs-dir':                              'BS-DIR',
  // Customer Success
  'customer success manager':            'CSM',
  'csm':                                 'CSM',
  'mid market customer success':         'MM-CSM',
  'mid-market customer success':         'MM-CSM',
  'mm-csm':                              'MM-CSM',
  'mm csm':                              'MM-CSM',
  'director of customer success':        'CS-MGR',
  'customer success director':           'CS-MGR',
  'vp of customer success':              'CS-MGR',
  'cs-mgr':                              'CS-MGR',
  // Customer Support & Enablement
  'customer support specialist':         'CSS',
  'css':                                 'CSS',
  'customer support':                    'CSS',
  'customer enablement specialist':      'CSS',
  'mid market customer enablement':      'MMES',
  'mid-market customer enablement':      'MMES',
  'mmes':                                'MMES',
  'css-mgr':                             'CSS-MGR',
  'director of customer support':        'CSS-MGR',
  // Customer Onboarding
  'customer onboarding manager':         'COM',
  'com':                                 'COM',
  'onboarding manager':                  'COM',
  'customer onboarding specialist':      'COM',
  // Marketing
  'marketing specialist':                'MKT-IC2',
  'mkt-ic2':                             'MKT-IC2',
  'senior marketing specialist':         'MKT-IC3',
  'senior marketing manager':            'MKT-IC3',
  'marketing manager':                   'MKT-IC3',
  'mkt-ic3':                             'MKT-IC3',
  'director of marketing':               'MKT-L4',
  'marketing director':                  'MKT-L4',
  'vp of marketing':                     'MKT-L4',
  'mkt-l4':                              'MKT-L4',
  // Customer Success — Associate
  'associate csm':                       'ASSOC-CSM',
  'assoc csm':                           'ASSOC-CSM',
  'associate customer success':          'ASSOC-CSM',
  'assoc-csm':                           'ASSOC-CSM',
  // Business Development — Manager
  'manager of business development':     'BD-MGR',
  'business development manager':        'BD-MGR',
  'bd manager':                          'BD-MGR',
  'bd-mgr':                              'BD-MGR',
  // Business Solutions — Mid-Market / Account Executive
  'mid-market account executive':        'BSE',
  'mid market account executive':        'BSE',
  'account executive':                   'BSE',
  // Sales Leadership
  'director of sales':                   'SALES-DIR',
  'sales director':                      'SALES-DIR',
  'vp of sales':                         'SALES-DIR',
  'sales-dir':                           'SALES-DIR',
  // Engineering
  'software engineer':                   'ENG-IC2',
  'software engineer i':                 'ENG-IC1',
  'software engineer ii':                'ENG-IC2',
  'senior software engineer':            'ENG-IC3',
  'staff software engineer':             'ENG-IC4',
  'principal software engineer':         'ENG-IC5',
  'engineering manager':                 'ENG-MGR',
  'manager of engineering':              'ENG-MGR',
  'eng-mgr':                             'ENG-MGR',
  // UI/UX
  'ui/ux designer':                      'UXUI-IC',
  'ux designer':                         'UXUI-IC',
  'ui designer':                         'UXUI-IC',
  'product designer':                    'UXUI-IC',
  'uxui-ic':                             'UXUI-IC',
  // Product
  'product manager':                     'PROD-IC2',
  'senior product manager':              'PROD-IC3',
  'staff product manager':               'PROD-IC4',
  'prod-ic2':                            'PROD-IC2',
  // Marketing — extended
  'marketing coordinator':               'MKT-IC2',
  'content marketing manager':           'MKT-IC3',
  'content marketing':                   'MKT-IC3',
  // Intern
  'intern':                              'INTERN',
  'product & development intern':        'INTERN',
  'p&d intern':                          'INTERN',
  // Administrative / Office
  'office administrator':                'ADMIN-IC',
  'administrator':                       'ADMIN-IC',
  'administrative assistant':            'ADMIN-IC',
  'admin-ic':                            'ADMIN-IC',
  // Executive
  'ceo':                                 'EXEC',
  'chief executive officer':             'EXEC',
  'president':                           'EXEC',
  'exec':                                'EXEC',
  // Customer Support — mid-market alias
  'mid-market customer support':         'MMES',
  'mid market customer support':         'MMES',
  // People Ops
  'people operations manager':           'PEOPLE-OPS-MGR',
  'hr manager':                          'PEOPLE-OPS-MGR',
  'people ops manager':                  'PEOPLE-OPS-MGR',
  'people-ops-mgr':                      'PEOPLE-OPS-MGR',
  'people operations generalist':        'PEOPLE-OPS-IC',
  'people operations specialist':        'PEOPLE-OPS-IC',
  'hr generalist':                       'PEOPLE-OPS-IC',
  'people-ops-ic':                       'PEOPLE-OPS-IC',
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
  // Case-insensitive fallback (handles Carta and other tools with different casing)
  const rowEntries = Object.entries(row);
  for (const k of keys) {
    const kLower = k.toLowerCase();
    const found = rowEntries.find(([rk]) => rk.trim().toLowerCase() === kLower);
    if (found?.[1]?.trim()) return found[1].trim();
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
          const first = pickCol(row, 'Preferred/First Name', 'Preferred Name', 'First Name', 'FirstName', 'First');
          const last  = pickCol(row, 'Last Name', 'LastName', 'Last');
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

        // Department from Paylocity's Department column (e.g. "Sales", "Customer Success")
        const deptRaw = pickCol(row, 'Department', 'Team', 'Dept') || undefined;

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
            department: deptRaw ?? existing.department,
            // targetCompensation is manually set per person — never overwrite from Paylocity
            targetCompensation: existing.targetCompensation,
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
          // Create new Melder — role is optional; warn if missing/unrecognized so user can assign later
          const effectiveRoleId: string = roleId ?? jobTitle ?? 'UNASSIGNED';
          if (!roleId) {
            warnings.push(`Row ${lineNum}: "${name}" — no role matched (title: "${jobTitle || 'none'}"). Created without a role — assign one on the Melders page.`);
          } else if (!currentStorage.roles.some((r) => r.id === roleId)) {
            warnings.push(`Row ${lineNum}: "${name}" — role "${roleId}" not in system yet. Created anyway — add the role or reassign.`);
          }
          const newMelder: Melder = {
            id: generateId(),
            name,
            roleId: effectiveRoleId as RoleId,
            email,
            startDate,
            department: deptRaw,
            targetCompensation: 0, // manually set per person after import
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

// ─── Carta Compensation Benchmark Import ──────────────────────────────────────
// Parses Carta (or similar) compensation benchmarking CSV exports.
// Expected columns: Role/Level identifier + Salary/Total Cash percentile columns.
// Updates marketRate on all Melders whose roleId matches the row's role.
// All values in the CSV are annual — divided by 12 for monthly storage.

export interface CartaImportResult {
  rolesUpdated: number;
  meldersUpdated: number;
  errors: string[];
  warnings: string[];
  preview: Array<{ roleId: string; roleName: string; marketRate: number; meldersAffected: number }>;
}

// Staged review types — parse first, apply only accepted roles
export interface CartaPreviewItem {
  roleId: string;
  roleName: string;
  currentMonthlyRate: number;   // avg current rate across matching Melders
  proposedMonthlyRate: number;  // from Carta CSV
  annualDelta: number;          // (proposed - current) * 12
  changePct: number;            // % change relative to current
  melderNames: string[];
}

export interface CartaPreviewResult {
  items: CartaPreviewItem[];
  warnings: string[];
  errors: string[];
}

// Flexible percentile column lookup — handles many Carta export header formats.
// e.g. "Total Cash (50th)", "Total Cash 50th", "P50 Total Cash", "50th Percentile Total Cash"
function pickPercentileCol(
  row: Record<string, string>,
  pct: string, // "25", "50", "75", "90"
  type: 'total cash' | 'salary'
): string {
  const label = type === 'total cash' ? 'Total Cash' : 'Salary';
  const baseCandidates = [
    `${label} (${pct}th)`, `${label} ${pct}th`, `${label} (${pct}th Percentile)`,
    `${label} P${pct}`, `P${pct} ${label}`, `${pct}th ${label}`,
    `${pct}th Percentile ${label}`, `${label.toLowerCase()}_p${pct}`,
    // Carta sometimes writes "Base Salary" instead of "Salary"
    ...(type === 'salary' ? [
      `Base Salary (${pct}th)`, `Base Salary ${pct}th`, `Base Salary P${pct}`,
      `Annual Salary (${pct}th)`, `Annual Salary ${pct}th`,
    ] : []),
  ];
  for (const key of baseCandidates) {
    // Case-insensitive key lookup
    const found = Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase());
    if (found && found[1]?.trim()) return found[1].trim();
  }
  return '';
}

export function importCartaMarketRateCSV(
  file: File,
  storage: AppStorage,
  percentile: '25' | '50' | '75' | '90',
  onComplete: (result: CartaImportResult, newStorage: AppStorage) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let rolesUpdated = 0;
      let meldersUpdated = 0;
      let currentStorage = { ...storage };
      const preview: CartaImportResult['preview'] = [];

      const allRows = results.data as Record<string, string>[];

      allRows.forEach((row, idx) => {
        const lineNum = idx + 2;

        // Identify the role from whichever column Carta uses
        const roleName = pickCol(row,
          'Role', 'Job Title', 'Position', 'Function', 'Job Family', 'Title',
          'Level', 'Job Level', 'Benchmark Role', 'Benchmark Job', 'Job Name',
          // Additional Carta export formats
          'Benchmark Job Title', 'Benchmark Title', 'Benchmark', 'Benchmark Name',
          'Job', 'Band', 'Grade', 'Level Name', 'Benchmark Level',
          'Benchmark Job Family', 'Benchmark Job Level', 'Track', 'Career Track',
          'Scope', 'Scope Level', 'Job Code', 'Benchmark Code',
        );
        if (!roleName) {
          if (idx === 0) {
            const detected = Object.keys(row).filter((k) => k.trim()).join(', ');
            warnings.push(`No role identifier column detected. Columns in your CSV: [${detected}]. Expected one of: Role, Job Title, Benchmark Job Title, Function, Level, etc.`);
          } else {
            warnings.push(`Row ${lineNum}: No role/level identifier found, skipped`);
          }
          return;
        }

        // Map to an internal roleId
        const roleId = resolveRoleFromTitle(roleName);
        if (!roleId) {
          warnings.push(`Row ${lineNum}: "${roleName}" — no matching role in system, skipped`);
          return;
        }

        // Prefer Total Cash (includes variable), fall back to base Salary
        const totalCashRaw = pickPercentileCol(row, percentile, 'total cash');
        const salaryRaw    = pickPercentileCol(row, percentile, 'salary');
        const annualMarket = parseDollar(totalCashRaw) ?? parseDollar(salaryRaw);

        if (!annualMarket) {
          warnings.push(`Row ${lineNum}: "${roleName}" — no ${percentile}th percentile comp data found, skipped`);
          return;
        }

        // Store as monthly
        const monthlyMarket = annualMarket / 12;

        // Update all Melders with this roleId
        const affected = currentStorage.melders.filter((m) => m.roleId === roleId);
        if (affected.length === 0) {
          warnings.push(`Row ${lineNum}: "${roleName}" (${roleId}) — no Melders with this role currently, skipped`);
          return;
        }

        affected.forEach((melder) => {
          const updated: Melder = {
            ...melder,
            marketRate: monthlyMarket,
            updatedAt: new Date().toISOString(),
          };
          currentStorage = saveMelder(currentStorage, updated);
          meldersUpdated++;
        });

        rolesUpdated++;
        preview.push({ roleId, roleName, marketRate: monthlyMarket, meldersAffected: affected.length });
      });

      onComplete({ rolesUpdated, meldersUpdated, errors, warnings, preview }, currentStorage);
    },
    error: (err) => {
      onComplete({ rolesUpdated: 0, meldersUpdated: 0, errors: [err.message], warnings: [], preview: [] }, storage);
    },
  });
}

// Dry-run version — parses CSV and returns proposed changes without saving anything.
export function previewCartaMarketRateCSV(
  file: File,
  storage: AppStorage,
  percentile: '25' | '50' | '75' | '90',
  onComplete: (result: CartaPreviewResult) => void
): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const warnings: string[] = [];
      const errors: string[] = [];
      const items: CartaPreviewItem[] = [];

      const allRows = results.data as Record<string, string>[];

      allRows.forEach((row, idx) => {
        const lineNum = idx + 2;

        const roleName = pickCol(row,
          'Role', 'Job Title', 'Position', 'Function', 'Job Family', 'Title',
          'Level', 'Job Level', 'Benchmark Role', 'Benchmark Job', 'Job Name',
          // Additional Carta export formats
          'Benchmark Job Title', 'Benchmark Title', 'Benchmark', 'Benchmark Name',
          'Job', 'Band', 'Grade', 'Level Name', 'Benchmark Level',
          'Benchmark Job Family', 'Benchmark Job Level', 'Track', 'Career Track',
          'Scope', 'Scope Level', 'Job Code', 'Benchmark Code',
        );
        if (!roleName) {
          if (idx === 0) {
            const detected = Object.keys(row).filter((k) => k.trim()).join(', ');
            warnings.push(`No role identifier column detected. Columns in your CSV: [${detected}]. Expected one of: Role, Job Title, Benchmark Job Title, Function, Level, etc.`);
          } else {
            warnings.push(`Row ${lineNum}: No role identifier found, skipped`);
          }
          return;
        }

        const roleId = resolveRoleFromTitle(roleName);
        if (!roleId) { warnings.push(`Row ${lineNum}: "${roleName}" — no matching role in system, skipped`); return; }

        const totalCashRaw = pickPercentileCol(row, percentile, 'total cash');
        const salaryRaw    = pickPercentileCol(row, percentile, 'salary');
        const annualMarket = parseDollar(totalCashRaw) ?? parseDollar(salaryRaw);

        if (!annualMarket) {
          warnings.push(`Row ${lineNum}: "${roleName}" — no ${percentile}th percentile data found, skipped`);
          return;
        }

        const proposedMonthlyRate = annualMarket / 12;
        const affected = storage.melders.filter((m) => m.roleId === roleId);

        if (affected.length === 0) {
          warnings.push(`Row ${lineNum}: "${roleName}" (${roleId}) — no Melders with this role, skipped`);
          return;
        }

        // Average current rate across all matching melders
        const avgCurrentRate = affected.reduce((s, m) => s + m.marketRate, 0) / affected.length;
        const annualDelta = (proposedMonthlyRate - avgCurrentRate) * 12;
        const changePct = avgCurrentRate > 0
          ? Math.round(((proposedMonthlyRate - avgCurrentRate) / avgCurrentRate) * 100)
          : 0;

        items.push({
          roleId,
          roleName,
          currentMonthlyRate: avgCurrentRate,
          proposedMonthlyRate,
          annualDelta,
          changePct,
          melderNames: affected.map((m) => m.name),
        });
      });

      onComplete({ items, warnings, errors });
    },
    error: (err) => {
      onComplete({ items: [], warnings: [], errors: [err.message] });
    },
  });
}

// Apply only the accepted items from a Carta preview
export function applyCartaUpdates(
  storage: AppStorage,
  acceptedItems: CartaPreviewItem[]
): { storage: AppStorage; meldersUpdated: number } {
  let currentStorage = { ...storage };
  let meldersUpdated = 0;

  for (const item of acceptedItems) {
    const affected = currentStorage.melders.filter((m) => m.roleId === item.roleId);
    for (const melder of affected) {
      const updated: Melder = {
        ...melder,
        marketRate: item.proposedMonthlyRate,
        updatedAt: new Date().toISOString(),
      };
      currentStorage = saveMelder(currentStorage, updated);
      meldersUpdated++;
    }
  }

  return { storage: currentStorage, meldersUpdated };
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

// ─── Comp Structure (OTE) Import ──────────────────────────────────────────────
// Parses per-employee compensation calculator spreadsheets (exported as CSV).
// Scans all rows for one containing "On Target Earnings", extracts the dollar value,
// and tries to detect the employee's name from the header row ("Role: Name | ...").

export interface CompStructureItem {
  fileName: string;
  detectedName: string | null;
  annualOte: number;
  matchedMelderId: string | null;
  matchedMelderName: string | null;
}

export interface CompStructureParseResult {
  items: CompStructureItem[];
  errors: string[];
}

export function parseCompStructureFiles(
  files: File[],
  storage: AppStorage,
  onComplete: (result: CompStructureParseResult) => void,
): void {
  const items: CompStructureItem[] = [];
  const errors: string[] = [];
  let pending = files.length;

  if (pending === 0) {
    onComplete({ items, errors });
    return;
  }

  files.forEach((file) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = (results.data as unknown[][]).map((r) =>
          (r as unknown[]).map((c) => String(c ?? '').trim()),
        );

        // Find OTE row — scan for any cell containing "On Target Earnings"
        let annualOte = 0;
        for (const row of rows) {
          if (row.some((cell) => /on target earnings/i.test(cell))) {
            for (const cell of row) {
              if (/on target earnings/i.test(cell)) continue;
              const v = parseDollar(cell);
              if (v !== null && v > 0) { annualOte = v; break; }
            }
            break;
          }
        }

        // Detect name from header rows — pattern: "ROLE: Name | ..."
        let detectedName: string | null = null;
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const cell = rows[i][0] ?? '';
          const m = cell.match(/^[A-Za-z\s]+:\s+([^|]+)/);
          if (m) {
            const candidate = m[1].trim();
            if (candidate && !/component|annual|compensation|quarter/i.test(candidate)) {
              detectedName = candidate;
              break;
            }
          }
        }

        // Auto-match to melder by first name, last name, or full name
        let matchedMelderId: string | null = null;
        let matchedMelderName: string | null = null;
        if (detectedName) {
          const needle = detectedName.toLowerCase();
          const match = storage.melders.find((m) => {
            const full = m.name.toLowerCase();
            const parts = full.split(' ');
            return full === needle || parts.some((p) => p === needle);
          });
          if (match) {
            matchedMelderId = match.id;
            matchedMelderName = match.name;
          }
        }

        if (annualOte === 0) {
          errors.push(`${file.name}: Could not find "OTE (On Target Earnings)" value`);
        } else {
          items.push({ fileName: file.name, detectedName, annualOte, matchedMelderId, matchedMelderName });
        }

        pending--;
        if (pending === 0) onComplete({ items, errors });
      },
      error: (err) => {
        errors.push(`${file.name}: ${err.message}`);
        pending--;
        if (pending === 0) onComplete({ items, errors });
      },
    });
  });
}

export function applyCompStructureOTEs(
  storage: AppStorage,
  assignments: Array<{ melderId: string; annualOte: number }>,
): { storage: AppStorage; updated: number } {
  let current = storage;
  let updated = 0;
  for (const { melderId, annualOte } of assignments) {
    const melder = current.melders.find((m) => m.id === melderId);
    if (melder) {
      current = saveMelder(current, {
        ...melder,
        targetCompensation: annualOte / 12,
        updatedAt: new Date().toISOString(),
      });
      updated++;
    }
  }
  return { storage: current, updated };
}
