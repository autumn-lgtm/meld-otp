import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../components/layout/Header';
import type { AppStorage, Melder } from '../types';
import { deleteMelder, generateId, saveMelder } from '../utils/storage';

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

export function Melders({ storage, onSave }: Props) {
  const { melders, roles, reports } = storage;
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
      marketRate: melder.marketRate > 0 ? String(melder.marketRate) : '',
      targetCompensation: melder.targetCompensation > 0 ? String(melder.targetCompensation) : '',
    });
    setErrors({});
    setShowForm(true);
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.roleId) e.roleId = 'Role is required';
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
      marketRate: parseFloat(form.marketRate) || 0,
      targetCompensation: parseFloat(form.targetCompensation) || 0,
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

  function reportCount(melderId: string) {
    return reports.filter((r) => r.melderId === melderId).length;
  }

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
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className={inputCls(!!errors.roleId)}
                >
                  <option value="">— select a role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {r.fullName}</option>
                  ))}
                </select>
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
                <Field label="Target Compensation ($/mo)">
                  <input
                    type="number"
                    value={form.targetCompensation}
                    onChange={(e) => setForm({ ...form, targetCompensation: e.target.value })}
                    className={inputCls(false)}
                    placeholder="e.g. 9000"
                  />
                </Field>
                <Field label="Market Rate ($/mo)">
                  <input
                    type="number"
                    value={form.marketRate}
                    onChange={(e) => setForm({ ...form, marketRate: e.target.value })}
                    className={inputCls(false)}
                    placeholder="e.g. 9500"
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

      {/* Melder Table */}
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
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Target Comp</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Market Rate</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Reports</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {melders.map((m) => {
                const role = roles.find((r) => r.id === m.roleId);
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-[#1175CC] bg-[#eef5fc] px-2 py-1 rounded-lg">{m.roleId}</span>
                      {role && <p className="text-xs text-slate-400 mt-0.5">{role.fullName}</p>}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {m.targetCompensation > 0 ? `$${m.targetCompensation.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {m.marketRate > 0 ? `$${m.marketRate.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{reportCount(m.id)}</td>
                    <td className="px-5 py-4">
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
