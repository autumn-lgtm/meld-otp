import confetti from 'canvas-confetti';
import { CheckCircle, Download, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// ─── Audio feedback ────────────────────────────────────────────────────────────
function playChime(type: 'success' | 'celebration') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = type === 'celebration' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * (type === 'celebration' ? 0.13 : 0.1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(type === 'celebration' ? 0.25 : 0.15, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch {
    // AudioContext not available — silent fail
  }
}
import { AlertBanner } from '../components/shared/AlertBanner';
import { MetricCard } from '../components/shared/MetricCard';
import { Header } from '../components/layout/Header';
import type { AppStorage, Melder } from '../types';
import { MONTHS } from '../types';
import {
  buildReport,
  calculateCAP,
  calculateOAP,
  calculateRatio,
  fmtCurrency,
  fmtPct,
  getProratedFactor,
} from '../utils/calculations';
import { exportReportPDF } from '../utils/pdf';
import { generateId, saveReport } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function Calculator({ storage, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const preselectedMelder = searchParams.get('melder') ?? '';

  const { melders, roles } = storage;

  const [melderId, setMelderId] = useState(preselectedMelder || (melders[0]?.id ?? ''));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [metricInputs, setMetricInputs] = useState<Record<string, { actual: string; target: string }>>({});
  const [actualComp, setActualComp] = useState('');
  const [targetComp, setTargetComp] = useState('');
  const [marketRate, setMarketRate] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [overrideRoleId, setOverrideRoleId] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  const confettiFiredKey = useRef<string>('');

  const melder: Melder | undefined = melders.find((m) => m.id === melderId);
  // Role: use melder's role if a melder is selected, otherwise fall back to manual override
  const effectiveRoleId = melder?.roleId ?? overrideRoleId;
  const role = roles.find((r) => r.id === effectiveRoleId);

  // Pre-fill from melder defaults, applying proration when they started in the selected month
  useEffect(() => {
    if (melder) {
      const factor = getProratedFactor(melder.startDate, month, year);
      if (factor != null) {
        // Start month — prorate to days worked out of monthly target (annual ÷ 12)
        const proTarget = Math.round((melder.targetCompensation / 12) * factor);
        const proMarket = Math.round((melder.marketRate / 12) * factor);
        setTargetComp(proTarget > 0 ? String(proTarget) : '');
        setMarketRate(proMarket > 0 ? String(proMarket) : '');
      } else {
        setTargetComp(melder.targetCompensation > 0 ? String(melder.targetCompensation) : '');
        setMarketRate(melder.marketRate > 0 ? String(melder.marketRate) : '');
      }
      setOverrideRoleId('');
    }
  }, [melder?.id, month, year]);

  // Reset metric inputs when role changes, pre-filling targets from role defaults
  useEffect(() => {
    if (role) {
      const initial: Record<string, { actual: string; target: string }> = {};
      role.metrics.forEach((m) => {
        initial[m.id] = {
          actual: '',
          target: m.defaultTarget != null ? String(m.defaultTarget) : '',
        };
      });
      setMetricInputs(initial);
    }
  }, [role?.id]);

  const numInputs = useMemo(() => {
    const parsed: Record<string, { actual: number; target: number }> = {};
    if (role) {
      role.metrics.forEach((m) => {
        parsed[m.id] = {
          actual: parseFloat(metricInputs[m.id]?.actual ?? '0') || 0,
          target: parseFloat(metricInputs[m.id]?.target ?? '0') || 0,
        };
      });
    }
    return parsed;
  }, [metricInputs, role]);

  const oapResult = useMemo(
    () => (role ? calculateOAP(role.metrics, numInputs) : null),
    [role, numInputs]
  );

  const capResult = useMemo(
    () => calculateCAP(parseFloat(actualComp) || 0, parseFloat(targetComp) || 0),
    [actualComp, targetComp]
  );

  const ratioResult = useMemo(
    () => calculateRatio(parseFloat(actualComp) || 0, parseFloat(marketRate) || 0),
    [actualComp, marketRate]
  );

  const hasEnoughData = role && oapResult && parseFloat(actualComp) > 0 && parseFloat(targetComp) > 0;

  // Sweet spot: all three metrics healthy
  const isSweetSpot =
    !!oapResult &&
    oapResult.health === 'green' &&
    capResult.health === 'green' &&
    (ratioResult.health === 'green' || ratioResult.health === 'blue');

  // Celebration — fires once per unique "all green" state
  useEffect(() => {
    if (!isSweetSpot || !hasEnoughData) return;
    const key = `${melderId}-${month}-${year}-${oapResult?.oap.toFixed(1)}-${capResult.cap.toFixed(1)}-${ratioResult.ratio.toFixed(1)}`;
    if (confettiFiredKey.current === key) return;
    confettiFiredKey.current = key;
    playChime('celebration');
    const end = Date.now() + 2200;
    const fire = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#1175CC', '#B0E3FF', '#FFB41B', '#022935', '#ffffff'] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#1175CC', '#B0E3FF', '#FFB41B', '#022935', '#ffffff'] });
      if (Date.now() < end) requestAnimationFrame(fire);
    };
    fire();
  }, [isSweetSpot, hasEnoughData, melderId, month, year, oapResult?.oap, capResult.cap, ratioResult.ratio]);

  // Success chime when valid OAP result first appears
  const prevOapValid = useRef(false);
  useEffect(() => {
    const nowValid = !!oapResult && oapResult.oap > 0;
    if (nowValid && !prevOapValid.current && !isSweetSpot) playChime('success');
    prevOapValid.current = nowValid;
  }, [oapResult?.oap, isSweetSpot]);

  const reportData = useMemo(() => {
    if (!hasEnoughData || !role || !oapResult) return null;
    return buildReport({
      id: generateId(),
      melderId: melder?.id ?? 'adhoc',
      melderName: melder?.name ?? 'Ad-hoc Calculation',
      roleId: effectiveRoleId,
      month,
      year,
      metrics: role.metrics,
      metricInputs: numInputs,
      actualCompensation: parseFloat(actualComp) || 0,
      targetCompensation: parseFloat(targetComp) || 0,
      marketRate: parseFloat(marketRate) || 0,
      notes,
    });
  }, [hasEnoughData, melder, role, oapResult, month, year, numInputs, actualComp, targetComp, marketRate, notes]);

  function handleSave() {
    if (!reportData) return;
    onSave((s) => saveReport(s, reportData));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleExportPDF() {
    if (!reportData) return;
    setExporting(true);
    try {
      await exportReportPDF('report-printable', reportData);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Header
        title="OTP Calculator"
        subtitle="Calculate Outcome Attainment, Compensation Attainment, and Market Ratio"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Panel: Inputs ── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Melder & Period */}
          <Section title="Melder & Period">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Melder</span>
              <select
                value={melderId}
                onChange={(e) => { setMelderId(e.target.value); setSaved(false); }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
              >
                <option value="">— select —</option>
                {melders.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.roleId})</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>
          </Section>

          {/* Role selector — shown when no melder selected so OAP inputs still appear */}
          {!melder && (
            <Section title="Role">
              <p className="text-xs text-slate-400 mb-2">
                No Melder selected — pick a role to calculate OAP metrics directly.
              </p>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</span>
                <select
                  value={overrideRoleId}
                  onChange={(e) => { setOverrideRoleId(e.target.value); setSaved(false); }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                >
                  <option value="">— select role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.level ? `[${r.level}] ` : ""}{r.id} — {r.fullName}</option>
                  ))}
                </select>
              </label>
            </Section>
          )}

          {/* OAP Inputs */}
          {role && (
            <Section title="Outcome Attainment (OAP)">
              <p className="text-xs text-slate-400 mb-3">Enter actual vs. target for each metric.</p>
              {role.metrics.map((metric) => {
                const actualVal = parseFloat(metricInputs[metric.id]?.actual ?? '');
                const targetVal = parseFloat(metricInputs[metric.id]?.target ?? '');
                const metricValid = !isNaN(actualVal) && actualVal > 0 && !isNaN(targetVal) && targetVal > 0;
                return (
                <div key={metric.id} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">{metric.abbreviation}</span>
                      {metricValid && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{(metric.weight * 100).toFixed(0)}% weight</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{metric.name}</p>
                  {metric.inverse && (
                    <p className="text-xs mb-2 px-2 py-1 rounded-lg font-medium" style={{ background: '#fff7ed', color: '#c2410c' }}>
                      Lower is better — attainment = Target ÷ Actual
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Actual</label>
                      <input
                        type="number"
                        value={metricInputs[metric.id]?.actual ?? ''}
                        onChange={(e) => setMetricInputs((prev) => ({ ...prev, [metric.id]: { ...prev[metric.id], actual: e.target.value } }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Target</label>
                      <input
                        type="number"
                        value={metricInputs[metric.id]?.target ?? ''}
                        onChange={(e) => setMetricInputs((prev) => ({ ...prev, [metric.id]: { ...prev[metric.id], target: e.target.value } }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </Section>
          )}

          {/* Compensation Inputs */}
          <Section title="Compensation">
            {melder?.startDate && (() => {
              const factor = getProratedFactor(melder.startDate, month, year);
              if (!factor) return null;
              const startD = new Date(melder.startDate);
              const daysInMonth = new Date(year, month, 0).getDate();
              const daysWorked = daysInMonth - startD.getDate() + 1;
              return (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-1 text-xs" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span className="mt-0.5">⚡</span>
                  <span style={{ color: '#92400e' }}>
                    <strong>Prorated:</strong> started {startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {daysWorked} of {daysInMonth} days ({Math.round(factor * 100)}%). Target and Market Rate pre-filled as prorated monthly amounts. Adjust if comp was handled differently.
                  </span>
                </div>
              );
            })()}
            <NumField label="Actual Compensation ($)" value={actualComp} onChange={setActualComp} placeholder="e.g. 8500" />
            <NumField label="Target Compensation ($)" value={targetComp} onChange={setTargetComp} placeholder="e.g. 9000" />
            <NumField label="Market Rate ($)" value={marketRate} onChange={setMarketRate} placeholder="e.g. 9500" />
          </Section>

          {/* Notes */}
          <Section title="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC] resize-none"
              placeholder="Context, exceptions, next steps..."
            />
          </Section>
        </div>

        {/* ── Right Panel: Results ── */}
        <div className="lg:col-span-2 space-y-5" ref={reportRef}>
          {!melder && !role && (
            <div className="flex items-center justify-center h-48 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm">
              Select a Melder or choose a Role to begin
            </div>
          )}

          {role && oapResult && (
            <>
              {/* Sweet Spot banner */}
              {isSweetSpot && (
                <div
                  className="rounded-2xl px-5 py-4 flex items-center gap-3 text-white font-semibold text-sm shadow-md"
                  style={{ background: 'linear-gradient(135deg, #022935 0%, #1175CC 100%)' }}
                >
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p style={{ fontFamily: 'Poppins, sans-serif' }}>Sweet Spot — All Metrics Aligned</p>
                    <p className="font-normal text-xs mt-0.5 opacity-75">OAP, CAP, and Compensation Ratio are all healthy. This Melder is performing well and paid fairly at market.</p>
                  </div>
                </div>
              )}

              {/* Three metric cards */}
              <MetricCard
                title="Outcome Attainment (OAP)"
                question="Did we deliver to the plan?"
                value={oapResult.oap}
                health={oapResult.health}
                formula={`OAP = Σ (Actual/Target × Weight) × 100`}
              >
                <div className="space-y-2">
                  {oapResult.metricResults.map((r) => (
                    <div key={r.metricId} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{r.abbreviation} <span className="text-slate-300">({(r.weight * 100).toFixed(0)}%)</span></span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">{fmtPct(r.attainmentPct)} attainment</span>
                        <span className="font-semibold text-slate-700">+{fmtPct(r.weightedContribution)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </MetricCard>

              <MetricCard
                title="Compensation Attainment (CAP)"
                question="Did the Melders' pay reflect that delivery?"
                value={capResult.cap}
                health={capResult.health}
                formula={`CAP = (Actual Comp / Target Comp) × 100`}
              >
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Actual</p>
                    <p className="font-semibold text-slate-700">{fmtCurrency(capResult.actualCompensation)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Target</p>
                    <p className="font-semibold text-slate-700">{fmtCurrency(capResult.targetCompensation)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Gap</p>
                    <p className={`font-semibold ${capResult.actualCompensation >= capResult.targetCompensation ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtCurrency(capResult.actualCompensation - capResult.targetCompensation)}
                    </p>
                  </div>
                </div>
              </MetricCard>

              <MetricCard
                title="Compensation Ratio"
                question="Are we paying competitively against the market?"
                value={ratioResult.ratio}
                health={ratioResult.health}
                formula={`Ratio = (Actual Comp / Market Rate) × 100`}
              >
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Actual</p>
                    <p className="font-semibold text-slate-700">{fmtCurrency(ratioResult.actualCompensation)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Market Rate</p>
                    <p className="font-semibold text-slate-700">{fmtCurrency(ratioResult.marketRate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">vs Market</p>
                    <p className={`font-semibold ${ratioResult.actualCompensation >= ratioResult.marketRate ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtCurrency(ratioResult.actualCompensation - ratioResult.marketRate)}
                    </p>
                  </div>
                </div>
              </MetricCard>

              {/* Alerts */}
              {reportData && <AlertBanner alerts={reportData.alerts} />}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={!hasEnoughData}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    saved
                      ? 'bg-green-500 text-white'
                      : hasEnoughData
                      ? 'bg-[#1175CC] text-white hover:bg-[#0d62b0]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {saved ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {saved ? 'Saved!' : 'Save Report'}
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={!hasEnoughData || exporting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Generating...' : 'Export PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden printable report for PDF */}
      {reportData && (
        <div id="report-printable" className="fixed -left-[9999px] top-0 w-[900px] bg-slate-50 p-8">
          <PrintableReport report={reportData} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
        placeholder={placeholder}
      />
    </label>
  );
}

// ─── Printable Report ────────────────────────────────────────────────────────

function PrintableReport({ report }: { report: ReturnType<typeof buildReport> }) {
  const healthLabel = { red: 'Low', yellow: 'Moderate', green: 'High', blue: 'Above Market' };
  const healthBg = { red: '#fef2f2', yellow: '#fefce8', green: '#f0fdf4', blue: '#eff6ff' };
  const healthBorder = { red: '#f87171', yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa' };
  const healthText = { red: '#b91c1c', yellow: '#92400e', green: '#065f46', blue: '#1e40af' };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#1e293b' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 16, padding: '32px', marginBottom: 24, color: 'white' }}>
        <p style={{ opacity: 0.7, fontSize: 12, marginBottom: 4 }}>OUTCOME-TO-PAY REPORT · Property Meld</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{report.melderName}</h1>
        <p style={{ opacity: 0.8, marginTop: 4 }}>{report.roleId} · {MONTHS[report.month - 1]} {report.year}</p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'OAP', q: 'Did we deliver to the plan?', value: report.oapResult.oap, health: report.oapResult.health },
          { title: 'CAP', q: 'Did pay reflect delivery?', value: report.capResult.cap, health: report.capResult.health },
          { title: 'Ratio', q: 'Competitive vs. market?', value: report.ratioResult.ratio, health: report.ratioResult.health },
        ].map((m) => (
          <div key={m.title} style={{ background: healthBg[m.health], border: `2px solid ${healthBorder[m.health]}`, borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: healthText[m.health], textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{m.title}</p>
            <p style={{ fontSize: 11, color: healthText[m.health], opacity: 0.7, margin: '4px 0 8px' }}>{m.q}</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: healthText[m.health], margin: 0 }}>{m.value.toFixed(1)}%</p>
            <p style={{ fontSize: 12, color: healthText[m.health], margin: '4px 0 0' }}>{healthLabel[m.health]}</p>
          </div>
        ))}
      </div>

      {/* OAP Detail */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Outcome Breakdown</h3>
        {report.oapResult.metricResults.map((r) => (
          <div key={r.metricId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{r.metricName} ({(r.weight * 100).toFixed(0)}%)</span>
            <span style={{ fontWeight: 600 }}>{r.attainmentPct.toFixed(1)}% attainment → +{r.weightedContribution.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {report.alerts.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Recommendations</h3>
          {report.alerts.map((a, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px 14px', background: a.severity === 'critical' ? '#fef2f2' : a.severity === 'warning' ? '#fffbeb' : '#eff6ff', borderRadius: 8, fontSize: 13 }}>
              <p style={{ fontWeight: 600, margin: '0 0 4px', color: a.severity === 'critical' ? '#b91c1c' : a.severity === 'warning' ? '#92400e' : '#1d4ed8' }}>{a.title}</p>
              <p style={{ margin: 0, opacity: 0.8, color: a.severity === 'critical' ? '#b91c1c' : a.severity === 'warning' ? '#92400e' : '#1d4ed8' }}>{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {report.notes && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Notes</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{report.notes}</p>
        </div>
      )}
    </div>
  );
}
