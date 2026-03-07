import type { AppStorage, Melder, MonthlyReport, Role } from '../types';
import { DEFAULT_ROLES } from '../data/roles';

const STORAGE_KEY = 'meld-otp-v1';
const CURRENT_VERSION = 1;

function getDefaultStorage(): AppStorage {
  return {
    melders: [],
    reports: [],
    roles: DEFAULT_ROLES,
    version: CURRENT_VERSION,
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStorage();
    const parsed = JSON.parse(raw) as AppStorage;
    // Merge in default roles if missing (for upgrades)
    const existingRoleIds = new Set(parsed.roles.map((r) => r.id));
    const missingDefaults = DEFAULT_ROLES.filter((r) => !existingRoleIds.has(r.id));
    return {
      ...parsed,
      roles: [...missingDefaults, ...parsed.roles],
    };
  } catch {
    return getDefaultStorage();
  }
}

export function saveStorage(data: AppStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// ─── Melder CRUD ───────────────────────────────────────────────────────────────

export function saveMelder(storage: AppStorage, melder: Melder): AppStorage {
  const existing = storage.melders.findIndex((m) => m.id === melder.id);
  const melders =
    existing >= 0
      ? storage.melders.map((m) => (m.id === melder.id ? melder : m))
      : [...storage.melders, melder];
  return { ...storage, melders };
}

export function deleteMelder(storage: AppStorage, melderId: string): AppStorage {
  return {
    ...storage,
    melders: storage.melders.filter((m) => m.id !== melderId),
    reports: storage.reports.filter((r) => r.melderId !== melderId),
  };
}

// ─── Report CRUD ───────────────────────────────────────────────────────────────

export function saveReport(storage: AppStorage, report: MonthlyReport): AppStorage {
  const existing = storage.reports.findIndex((r) => r.id === report.id);
  const reports =
    existing >= 0
      ? storage.reports.map((r) => (r.id === report.id ? report : r))
      : [...storage.reports, report];
  return { ...storage, reports };
}

export function deleteReport(storage: AppStorage, reportId: string): AppStorage {
  return {
    ...storage,
    reports: storage.reports.filter((r) => r.id !== reportId),
  };
}

// ─── Role CRUD ─────────────────────────────────────────────────────────────────

export function saveRole(storage: AppStorage, role: Role): AppStorage {
  const existing = storage.roles.findIndex((r) => r.id === role.id);
  const roles =
    existing >= 0
      ? storage.roles.map((r) => (r.id === role.id ? role : r))
      : [...storage.roles, role];
  return { ...storage, roles };
}

// ─── JSON Export/Import ────────────────────────────────────────────────────────

export function exportJSON(storage: AppStorage): void {
  const blob = new Blob([JSON.stringify(storage, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meld-otp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<AppStorage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppStorage;
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
