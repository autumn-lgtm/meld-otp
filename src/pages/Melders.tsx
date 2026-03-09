import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useSalaryVisible } from '../hooks/useSalaryVisible';
import { Header } from '../components/layout/Header';
import type { AppStorage, Melder, Role } from '../types';
import { deleteMelder, generateId, saveMelder, saveRole } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

const emptyForm = {
  name: '',
  roleId: '',
  email: '',
  marketRate: '',
  targetCompensation: '',
};

type FormState = typeof emptyForm;

// ── Department / leader helpers ───────────────────────────────────────────────

const ROLE_DEPT: Record<string, string> = {
  BDA: 'Business Development', BDR: 'Business Development', 'SR-BDR': 'Business Development', 'BD-MGR': 'Business Development',
  'ASSOC-BSE': 'Business Solutions', BSE: 'Business Solutions', 'SR-BSE': 'Business Solutions', 'BS-DIR': 'Business Solutions',
  CSM: 'Customer Success', 'MM-CSM': 'Customer Success', 'CS-MGR': 'Customer Success', 'ASSOC-CSM': 'Customer Success',
  CSS: 'Customer Support & Enablement', MMES: 'Customer Support & Enablement', 'CSS-MGR': 'Customer Support & Enablement',
  COM: 'Customer Onboarding',
  'MKT-IC2': 'Marketing', 'MKT-IC3': 'Marketing', 'MKT-L4': 'Marketing',
  'ENG-IC1': 'Engineering', 'ENG-IC2': 'Engineering', 'ENG-IC3': 'Engineering',
  'ENG-IC4': 'Engineering', 'ENG-IC5': 'Engineering', 'ENG-MGR': 'Engineering',
  'UXUI-IC': 'Engineering', 'INTERN': 'Engineering',
  'DATA-IC1': 'Engineering & Data', 'DATA-IC2': 'Engineering & Data', 'DATA-IC3': 'Engineering & Data',
  'DATA-IC4': 'Engineering & Data', 'DATA-IC5': 'Engineering & Data', 'DATA-MGR': 'Engineering & Data',
  'PROD-IC2': 'Product', 'PROD-IC3': 'Product', 'PROD-IC4': 'Product',
  'PEOPLE-OPS-IC': 'People Ops', 'PEOPLE-OPS-MGR': 'People Ops',
  'SALES-DIR': 'Business Solutions',
  'EXEC': 'Leadership', 'ADMIN-IC': 'Leadership',
};

const DEPT_ORDER = [
  'Business Development',
  'Business Solutions',
  'Customer Success',
  'Customer Support & Enablement',
  'Customer Onboarding',
  'Marketing',
  'Engineering',
  'Engineering & Data',
  'Product',
  'People Ops',
  'Leadership',
  'Other',
];

const DEPT_COLORS: Record<string, string> = {
  'Business Development': '#f59e0b',
  'Business Solutions': '#8b5cf6',
  'Customer Success': '#22c55e',
  'Customer Support & Enablement': '#06b6d4',
  'Customer Onboarding': '#1175CC',
  'Marketing': '#94a3b8',
  'Engineering': '#f97316',
  'Engineering & Data': '#e11d48',
  'Product': '#ec4899',
  'People Ops': '#14b8a6',
  'Leadership': '#6366f1',
  'Other': '#64748b',
};

function roleDept(roleId: string, rolesList?: Role[]): string {
  // Prefer the role object's department field (custom roles have this set)
  const roleObj = rolesList?.find(r => r.id === roleId);
  if (roleObj?.department) return roleObj.department;
  return ROLE_DEPT[roleId] ?? 'Other';
}

const DEPT_LEADER_IDS = new Set([
  'melder-madison',            // Marketing
  'melder-nicholas-nagel',     // Business Development
  'melder-john-kearns',        // Business Solutions
  'melder-aaron-seaholm',      // Customer Onboarding
  'melder-anna-torvi',         // Customer Success
  'melder-nathanael-hockley',  // Customer Support & Enablement
  'melder-austin-wentz',       // Engineering
  'melder-erin',               // Engineering & Data
]);

function isLeaderRole(roleId: string, melderId?: string): boolean {
  return (melderId !== undefined && DEPT_LEADER_IDS.has(melderId)) || /MGR|DIR|L4|LEAD/.test(roleId);
}

// ── Inline "add new role" inside the Role dropdown ───────────────────────────

const NEW_ROLE_SENTINEL = '__new__';

interface RoleSelectProps {
  roles: Role[];
  value: string;
  hasError: boolean;
  onChange: (roleId: string) => void;
  onRoleCreated: (role: Role) => void;
}

function RoleSelect({ roles, value, hasError, onChange, onRoleCreated }: RoleSelectProps) {
  const [newTitle, setNewTitle] = useState('');
  const showInput = value === NEW_ROLE_SENTINEL;

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === NEW_ROLE_SENTINEL) {
      onChange(NEW_ROLE_SENTINEL);
      setNewTitle('');
    } else {
      onChange(v);
    }
  }

  function createRole() {
    const title = newTitle.trim();
    if (!title) return;
    const slug = title.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').slice(0, 20);
    const id = slug + '-' + generateId().slice(0, 4);
    const role: Role = { id, name: title, fullName: title, cadence: 'monthly', metrics: [], isCustom: true };
    onRoleCreated(role);
    onChange(id);
    setNewTitle('');
  }

  return (
    <div className="space-y-2">
      <select
        value={showInput ? NEW_ROLE_SENTINEL : value}
        onChange={handleSelectChange}
        className={inputCls(hasError)}
      >
        <option value="">— select a role —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name} — {r.fullName}</option>
        ))}
        <option disabled>──────────────</option>
        <option value={NEW_ROLE_SENTINEL}>+ Add new role title…</option>
      </select>

      {showInput && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createRole()}
            className="flex-1 rounded-xl border border-[#1175CC] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
            placeholder="Role title, e.g. Senior AE"
          />
          <button
            type="button"
            onClick={createRole}
            disabled={!newTitle.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0] disabled:opacity-40 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { onChange(''); setNewTitle(''); }}
            className="px-3 py-2 text-sm text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Melders({ storage, onSave }: Props) {
  const { melders, roles, reports } = storage;
  const { salaryVisible } = useSalaryVisible();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Melder | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(melder: Melder) {
    setEditing(melder);
    setForm({
      name: melder.name,
      roleId: melder.roleId,
      email: melder.email ?? '',
      marketRate: melder.marketRate > 0 ? String(Math.round(melder.marketRate * 12)) : '',
      targetCompensation: melder.targetCompensation > 0 ? String(Math.round(melder.targetCompensation * 12)) : '',
    });
    setErrors({});
    setShowForm(true);
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.roleId || form.roleId === NEW_ROLE_SENTINEL) e.roleId = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const now = new Date().toISOString();
    const melder: Melder = {
      id: editing?.id ?? generateId(),
      name: form.name.trim(),
      roleId: form.roleId,
      email: form.email.trim() || undefined,
      marketRate: (parseFloat(form.marketRate) || 0) / 12,
      targetCompensation: (parseFloat(form.targetCompensation) || 0) / 12,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave((s) => saveMelder(s, melder));
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    onSave((s) => deleteMelder(s, id));
    setDeleteConfirm(null);
  }

  function handleRoleCreated(role: Role) {
    onSave((s) => saveRole(s, role));
  }

  function reportCount(melderId: string) {
    return reports.filter((r) => r.melderId === melderId).length;
  }

  // Group and sort melders: by dept, then leaders first within each dept
  const grouped = new Map<string, Melder[]>();
  for (const dept of DEPT_ORDER) grouped.set(dept, []);

  for (const m of melders) {
    const dept = roleDept(m.roleId, roles);
    if (!grouped.has(dept)) grouped.set(dept, []);
    grouped.get(dept)!.push(m);
  }

  // Sort within each group: leaders first, then alphabetically by name
  for (const [, group] of grouped) {
    group.sort((a, b) => {
      const aLeader = isLeaderRole(a.roleId, a.id) ? 0 : 1;
      const bLeader = isLeaderRole(b.roleId, b.id) ? 0 : 1;
      if (aLeader !== bLeader) return aLeader - bLeader;
      return a.name.localeCompare(b.name);
    });
  }

  const activeGroups = DEPT_ORDER.filter(d => (grouped.get(d)?.length ?? 0) > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Header
        title="Melders"
        subtitle="Manage team members tracked in the OTP system"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Melder
          </button>
        }
      />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{editing ? 'Edit Melder' : 'Add Melder'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="Name *" error={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls(!!errors.name)}
                  placeholder="e.g. Jane Smith"
                />
              </Field>

              <Field label="Role *" error={errors.roleId}>
                <RoleSelect
                  roles={roles}
                  value={form.roleId}
                  hasError={!!errors.roleId}
                  onChange={(id) => setForm({ ...form, roleId: id })}
                  onRoleCreated={handleRoleCreated}
                />
              </Field>

              <Field label="Email (optional)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls(false)}
                  placeholder="jane@propertymeld.com"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Target Comp ($/yr)">
                  <input
                    type="number"
                    value={form.targetCompensation}
                    onChange={(e) => setForm({ ...form, targetCompensation: e.target.value })}
                    className={inputCls(false)}
                    placeholder="e.g. 108000"
                  />
                </Field>
                <Field label="Market Rate ($/yr)">
                  <input
                    type="number"
                    value={form.marketRate}
                    onChange={(e) => setForm({ ...form, marketRate: e.target.value })}
                    className={inputCls(false)}
                    placeholder="e.g. 114000"
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0] transition-colors"
              >
                {editing ? 'Save Changes' : 'Add Melder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Delete Melder?</h3>
            <p className="text-slate-500 text-sm mb-5">This will also delete all of their reports. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Melder Table — grouped by dept, leaders first */}
      {melders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm mb-4">No Melders added yet.</p>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0] transition-colors"
          >
            Add your first Melder
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGroups.map(dept => {
            const group = grouped.get(dept)!;
            const color = DEPT_COLORS[dept] ?? '#64748b';
            return (
              <div key={dept} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                {/* Dept header */}
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{dept}</span>
                  <span className="ml-auto text-xs text-slate-400">{group.length}</span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Comp</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Market Rate</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Reports</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((m, idx) => {
                      const role = roles.find((r) => r.id === m.roleId);
                      const leader = isLeaderRole(m.roleId, m.id);
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx < group.length - 1 ? '' : 'last:border-0'}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {leader && (
                                <span
                                  className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0"
                                  style={{ background: `${color}20`, color }}
                                >
                                  Leader
                                </span>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900">{m.name}</p>
                                {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-bold text-[#1175CC] bg-[#eef5fc] px-2 py-1 rounded-lg">{m.roleId}</span>
                            {role && <p className="text-xs text-slate-400 mt-0.5">{role.fullName}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">
                            {m.targetCompensation > 0 ? (salaryVisible ? `$${Math.round(m.targetCompensation * 12).toLocaleString()}/yr` : '$••••') : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">
                            {m.marketRate > 0 ? (salaryVisible ? `$${Math.round(m.marketRate * 12).toLocaleString()}/yr` : '$••••') : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">{reportCount(m.id)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openEdit(m)}
                                className="p-1.5 text-slate-400 hover:text-[#1175CC] hover:bg-[#eef5fc] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(m.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-xl border ${hasError ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] bg-white`;
}
