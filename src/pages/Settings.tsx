import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../components/layout/Header';
import type { AppStorage, MetricDefinition, Role } from '../types';
import { generateId, saveRole } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

interface MetricForm {
  id: string;
  name: string;
  abbreviation: string;
  weight: string;
  description: string;
}

const emptyMetric = (): MetricForm => ({ id: generateId(), name: '', abbreviation: '', weight: '', description: '' });

const emptyRole = { name: '', fullName: '' };

export function Settings({ storage, onSave }: Props) {
  const { roles } = storage;
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [metricForms, setMetricForms] = useState<MetricForm[]>([emptyMetric(), emptyMetric()]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  function addMetric() {
    setMetricForms((prev) => [...prev, emptyMetric()]);
  }

  function removeMetric(idx: number) {
    setMetricForms((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMetric(idx: number, field: keyof MetricForm, value: string) {
    setMetricForms((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function validateRole(): string[] {
    const errors: string[] = [];
    if (!roleForm.name.trim()) errors.push('Role abbreviation is required');
    if (!roleForm.fullName.trim()) errors.push('Full role name is required');
    if (metricForms.length < 1) errors.push('At least one metric is required');

    const totalWeight = metricForms.reduce((s, m) => s + (parseFloat(m.weight) || 0), 0);
    if (Math.abs(totalWeight - 1) > 0.01) errors.push(`Metric weights must sum to 1.0 (current: ${totalWeight.toFixed(2)})`);

    metricForms.forEach((m, i) => {
      if (!m.name.trim()) errors.push(`Metric ${i + 1}: Name is required`);
      if (!m.abbreviation.trim()) errors.push(`Metric ${i + 1}: Abbreviation is required`);
      if (!m.weight || isNaN(parseFloat(m.weight))) errors.push(`Metric ${i + 1}: Weight is required`);
    });

    if (roles.some((r) => r.id.toUpperCase() === roleForm.name.trim().toUpperCase())) {
      errors.push(`A role with ID "${roleForm.name.trim().toUpperCase()}" already exists`);
    }

    return errors;
  }

  function handleSaveRole() {
    const errors = validateRole();
    if (errors.length > 0) { setFormErrors(errors); return; }

    const metrics: MetricDefinition[] = metricForms.map((m) => ({
      id: m.abbreviation.trim().toUpperCase(),
      name: m.name.trim(),
      abbreviation: m.abbreviation.trim().toUpperCase(),
      weight: parseFloat(m.weight),
      description: m.description.trim(),
    }));

    const role: Role = {
      id: roleForm.name.trim().toUpperCase(),
      name: roleForm.name.trim().toUpperCase(),
      fullName: roleForm.fullName.trim(),
      cadence: 'monthly',
      metrics,
      isCustom: true,
    };

    onSave((s) => saveRole(s, role));
    setShowRoleForm(false);
    setRoleForm(emptyRole);
    setMetricForms([emptyMetric(), emptyMetric()]);
    setFormErrors([]);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Header title="Settings" subtitle="Manage roles and system configuration" />

      {/* Roles */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Roles</h2>
            <p className="text-xs text-slate-400 mt-0.5">Built-in and custom roles with metric definitions</p>
          </div>
          <button
            onClick={() => setShowRoleForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1175CC] text-white text-sm font-medium rounded-xl hover:bg-[#0d62b0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </button>
        </div>

        <div className="divide-y divide-slate-50">
          {roles.map((role) => (
            <div key={role.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{role.name}</span>
                    <span className="text-sm text-slate-400">— {role.fullName}</span>
                    {role.isCustom && (
                      <span className="text-xs bg-purple-100 text-purple-600 font-medium px-2 py-0.5 rounded-full">Custom</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {role.metrics.map((m) => (
                      <span key={m.id} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                        {m.abbreviation} <span className="text-slate-400">({(m.weight * 100).toFixed(0)}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Role Form Modal */}
      {showRoleForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">Create Custom Role</h2>
              <button onClick={() => { setShowRoleForm(false); setFormErrors([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role ID / Abbreviation *</label>
                  <input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                    placeholder="e.g. AE"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Full Role Name *</label>
                  <input
                    value={roleForm.fullName}
                    onChange={(e) => setRoleForm({ ...roleForm, fullName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                    placeholder="e.g. Account Executive"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Metrics</label>
                  <button onClick={addMetric} className="text-xs text-[#1175CC] font-medium hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Metric
                  </button>
                </div>
                <div className="space-y-3">
                  {metricForms.map((m, i) => (
                    <div key={m.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Metric {i + 1}</span>
                        {metricForms.length > 1 && (
                          <button onClick={() => removeMetric(i)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs text-slate-500">Name</label>
                          <input value={m.name} onChange={(e) => updateMetric(i, 'name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] bg-white" placeholder="Metric name" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Abbreviation</label>
                          <input value={m.abbreviation} onChange={(e) => updateMetric(i, 'abbreviation', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] bg-white" placeholder="e.g. ARR" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">Weight (0–1)</label>
                          <input type="number" step="0.05" min="0" max="1" value={m.weight} onChange={(e) => updateMetric(i, 'weight', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] bg-white" placeholder="0.50" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-slate-500">Description</label>
                          <input value={m.description} onChange={(e) => updateMetric(i, 'description', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] bg-white" placeholder="What this metric measures" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Weights must sum to exactly 1.0. Current total: {metricForms.reduce((s, m) => s + (parseFloat(m.weight) || 0), 0).toFixed(2)}
                </p>
              </div>

              {formErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  {formErrors.map((e, i) => <p key={i} className="text-red-600 text-sm">{e}</p>)}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowRoleForm(false); setFormErrors([]); }} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleSaveRole} className="px-5 py-2 text-sm font-medium text-white bg-[#1175CC] rounded-xl hover:bg-[#0d62b0]">Create Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
