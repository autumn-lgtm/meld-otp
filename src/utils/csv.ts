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

        if (!name) { errors.push(`Row ${idx + 2}: Missing Name`); return; }
        if (!roleId) { errors.push(`Row ${idx + 2}: Missing Role`); return; }

        const roleExists = currentStorage.roles.some((r) => r.id === roleId);
        if (!roleExists) { errors.push(`Row ${idx + 2}: Unknown role "${roleId}"`); return; }

        const melder: Melder = {
          id: generateId(),
          name,
          roleId,
          email: row['Email']?.trim() ?? undefined,
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
