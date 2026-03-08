import type { AnnualSnapshot, AppStorage, Melder, MonthlyReport, Role } from '../types';
import { DEFAULT_MELDERS } from '../data/melders';
import { DEFAULT_ROLES } from '../data/roles';
import { SEED_2025_ANNUAL } from '../data/seed2025annual';

const STORAGE_KEY = 'meld-otp-v1';
const CURRENT_VERSION = 1;

function getDefaultStorage(): AppStorage {
  return {
    melders: DEFAULT_MELDERS,
    reports: [],
    roles: DEFAULT_ROLES,
    annualSnapshots: SEED_2025_ANNUAL,
    version: CURRENT_VERSION,
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStorage();
    const parsed = JSON.parse(raw) as AppStorage;
    const existingRoleIds = new Set(parsed.roles.map((r) => r.id));
    const missingDefaults = DEFAULT_ROLES.filter((r) => !existingRoleIds.has(r.id));
    const mergedRoles = parsed.roles.map((role) => {
      const defaultRole = DEFAULT_ROLES.find((d) => d.id === role.id);
      if (!defaultRole || role.isCustom) return role;
      return {
        ...role,
        name: defaultRole.name,
        fullName: defaultRole.fullName,
        metrics: role.metrics.map((metric) => {
          if (metric.targetDisplay) return metric;
          const defaultMetric = defaultRole.metrics.find((m) => m.id === metric.id);
          return defaultMetric?.targetDisplay ? { ...metric, targetDisplay: defaultMetric.targetDisplay } : metric;
        }),
      };
    });
    const melders = parsed.melders.length === 0 ? DEFAULT_MELDERS : parsed.melders;
    // Seed is authoritative base; stored edits override matching IDs; user-added entries preserved.
    // Always take oaPct from seed (it may be computed from quarters) — never let a stored null override it.
    const storedMap = new Map((parsed.annualSnapshots ?? []).map((s) => [s.id, s]));
    const seedIds = new Set(SEED_2025_ANNUAL.map((s) => s.id));
    const userAdded = (parsed.annualSnapshots ?? []).filter((s) => !seedIds.has(s.id));
    const annualSnapshots: AnnualSnapshot[] = [
      ...SEED_2025_ANNUAL.map((s) => {
        const stored = storedMap.get(s.id);
        if (!stored) return s;
        return {
          ...stored,
          oaPct: stored.oaPct ?? s.oaPct,
          q1Oa: stored.q1Oa ?? s.q1Oa,
          q2Oa: stored.q2Oa ?? s.q2Oa,
          q3Oa: stored.q3Oa ?? s.q3Oa,
          q4Oa: stored.q4Oa ?? s.q4Oa,
        };
      }),
      ...userAdded,
    ];
    return { ...parsed, melders, roles: [...missingDefaults, ...mergedRoles], annualSnapshots };
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

// ─── Melder CRUD ────────────────────────────────────────────────────────────

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

// ─── Report CRUD ────────────────────────────────────────────────────────────

export function saveReport(storage: AppStorage, report: MonthlyReport): AppStorage {
  const existing = storage.reports.findIndex((r) => r.id === report.id);
  const reports =
    existing >= 0
      ? storage.reports.map((r) => (r.id === report.id ? report : r))
      : [...storage.reports, report];
  return { ...storage, reports };
}

export function deleteReport(storage: AppStorage, reportId: string): AppStorage {
  return { ...storage, reports: storage.reports.filter((r) => r.id !== reportId) };
}

// ─── Role CRUD ──────────────────────────────────────────────────────────────

export function saveRole(storage: AppStorage, role: Role): AppStorage {
  const existing = storage.roles.findIndex((r) => r.id === role.id);
  const roles =
    existing >= 0
      ? storage.roles.map((r) => (r.id === role.id ? role : r))
      : [...storage.roles, role];
  return { ...storage, roles };
}

export function deleteRole(storage: AppStorage, roleId: string): AppStorage {
  return { ...storage, roles: storage.roles.filter((r) => r.id !== roleId) };
}

// ─── Annual Snapshot CRUD ────────────────────────────────────────────────────

export function saveAnnualSnapshot(storage: AppStorage, snapshot: AnnualSnapshot): AppStorage {
  const existing = storage.annualSnapshots.findIndex((s) => s.id === snapshot.id);
  const annualSnapshots =
    existing >= 0
      ? storage.annualSnapshots.map((s) => (s.id === snapshot.id ? snapshot : s))
      : [...storage.annualSnapshots, snapshot];
  return { ...storage, annualSnapshots };
}

// ─── JSON Export/Import ─────────────────────────────────────────────────────

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

// ─── ID generation ──────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
