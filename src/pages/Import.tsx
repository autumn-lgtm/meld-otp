import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Download, FileText, TrendingDown, TrendingUp, Upload, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppStorage } from '../types';
import { MONTHS } from '../types';
import type {
  CartaImportResult,
  CartaPreviewResult,
  CommissionImportResult,
  CompStructureItem,
  CompStructureParseResult,
  CSVImportResult,
  PaylocityImportResult,
  SalaryImportResult,
} from '../utils/csv';
import {
  applyCartaUpdates,
  applyCompStructureOTEs,
  importCommissionCSV,
  importMeldersFromCSV,
  importPaylocityCSV,
  importReportsFromCSV,
  importSalaryReportCSV,
  parseCompStructureFiles,
  previewCartaMarketRateCSV,
} from '../utils/csv';
import { importJSON } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

type ImportMode =
  | 'paylocity'
  | 'commission'
  | 'carta'
  | 'comp-structure'
  | 'salary'
  | 'melders'
  | 'reports'
  | 'json';

type AnyResult =
  | PaylocityImportResult
  | CommissionImportResult
  | CartaImportResult
  | SalaryImportResult
  | CSVImportResult
  | null;

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';

// ─── Success Celebration ──────────────────────────────────────────────────────

function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch {
    // Audio context unavailable — silent fallback
  }
}

function SuccessOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(2,41,53,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="flex flex-col items-center gap-4 px-12 py-10 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #022935ee 0%, #0d4a6bee 100%)',
          border: '1.5px solid rgba(34,197,94,0.4)',
          boxShadow: '0 0 60px rgba(34,197,94,0.25)',
          animation: 'success-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <style>{`
          @keyframes success-pop {
            from { transform: scale(0.6); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes check-draw {
            from { stroke-dashoffset: 80; }
            to   { stroke-dashoffset: 0;  }
          }
          @keyframes success-fade {
            0%   { opacity: 1; }
            70%  { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
        <div style={{ animation: 'success-fade 2.4s ease-out forwards' }} className="flex flex-col items-center gap-4">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="2.5" />
            <polyline
              points="22,42 34,54 58,28"
              fill="none"
              stroke="#22c55e"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="80"
              strokeDashoffset="0"
              style={{ animation: 'check-draw 0.45s ease-out 0.25s both' }}
            />
          </svg>
          <p className="text-white font-black text-2xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Import Complete</p>
          <p className="text-[#B0E3FF] text-sm">Data saved successfully</p>
        </div>
      </div>
    </div>
  );
}

function useSuccessCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const celebrate = useCallback(() => {
    playSuccessSound();
    setCelebrating(true);
  }, []);
  const overlay = celebrating ? <SuccessOverlay onDone={() => setCelebrating(false)} /> : null;
  return { celebrate, overlay };
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[]) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const PAYLOCITY_SAMPLE = [
  'Employee ID,First Name,Last Name,Email Address,Hire Date,Job Title,Department,Annual Salary,Employment Status',
  '1001,Benjamin,Capelle,bcapelle@propertymeld.com,01/15/2022,Business Development Representative,Sales,43900,Active',
  '1002,Jane,Smith,jsmith@propertymeld.com,03/01/2023,Customer Success Manager,Customer Success,72000,Active',
  '1003,Jon,Martin,jmartin@propertymeld.com,06/10/2021,Director of Marketing,Marketing,95000,Active',
  '1004,Former,Employee,former@propertymeld.com,04/01/2020,Business Solutions Executive,Sales,80000,Terminated',
].join('\n');

const COMMISSION_SAMPLE = [
  'Employee Name,Pay Period,Regular Pay,Commission,Total Gross Pay',
  'Benjamin Capelle,2025-03,3658.33,1200.00,4858.33',
  'Jane Smith,2025-03,6000.00,850.00,6850.00',
  'Jon Martin,March 2025,7916.67,0,7916.67',
].join('\n');

// ─── Main Component ───────────────────────────────────────────────────────────

export function Import({ storage, onSave }: Props) {
  const [mode, setMode] = useState<ImportMode>('paylocity');
  const [result, setResult] = useState<AnyResult>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Commission period selector
  const now = new Date();
  const [commMonth, setCommMonth] = useState(now.getMonth() + 1);
  const [commYear, setCommYear] = useState(now.getFullYear());

  // Carta percentile selector + staged review
  const [cartaPercentile, setCartaPercentile] = useState<'25' | '50' | '75' | '90'>('50');
  const [cartaPreview, setCartaPreview] = useState<CartaPreviewResult | null>(null);
  const [cartaAccepted, setCartaAccepted] = useState<Set<string>>(new Set());

  // Comp structure OTE review
  const [compStructurePreview, setCompStructurePreview] = useState<CompStructureParseResult | null>(null);
  const [compStructureAssignments, setCompStructureAssignments] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const { celebrate, overlay } = useSuccessCelebration();

  function handleFileList(files: File[]) {
    if (files.length === 0) return;
    if (mode === 'comp-structure') {
      setLoading(true);
      setResult(null);
      setCompStructurePreview(null);
      parseCompStructureFiles(files, storage, (preview) => {
        setCompStructurePreview(preview);
        const initial: Record<string, string> = {};
        for (const item of preview.items) {
          if (item.matchedMelderId) initial[item.fileName] = item.matchedMelderId;
        }
        setCompStructureAssignments(initial);
        setLoading(false);
      });
      return;
    }
    handleFile(files[0]);
  }

  function handleFile(file: File) {
    setLoading(true);
    setResult(null);
    setCartaPreview(null);

    if (mode === 'paylocity') {
      importPaylocityCSV(file, storage, (res, newStorage) => {
        onSave(() => newStorage);
        setResult(res);
        setLoading(false);
        if (res.errors.length === 0) celebrate();
      });
      return;
    }

    if (mode === 'commission') {
      importCommissionCSV(file, storage, commMonth, commYear, (res, newStorage) => {
        onSave(() => newStorage);
        setResult(res);
        setLoading(false);
        if (res.errors.length === 0) celebrate();
      });
      return;
    }

    if (mode === 'carta') {
      // Dry-run first — show review table before saving anything
      previewCartaMarketRateCSV(file, storage, cartaPercentile, (preview) => {
        setCartaPreview(preview);
        // Default: accept all valid items
        setCartaAccepted(new Set(preview.items.map((i) => i.roleId)));
        setLoading(false);
      });
      return;
    }

    if (mode === 'json') {
      importJSON(file)
        .then((data) => {
          onSave(() => data);
          setResult({ meldersAdded: data.melders.length, reportsAdded: data.reports.length, errors: [] } as CSVImportResult);
          celebrate();
        })
        .catch((e) => setResult({ meldersAdded: 0, reportsAdded: 0, errors: [e.message] } as CSVImportResult))
        .finally(() => setLoading(false));
      return;
    }

    if (mode === 'salary') {
      importSalaryReportCSV(file, storage, (res, newStorage) => {
        onSave(() => newStorage);
        setResult(res);
        setLoading(false);
        if (res.errors.length === 0) celebrate();
      });
      return;
    }

    const cb = (res: CSVImportResult, newStorage: AppStorage) => {
      onSave(() => newStorage);
      setResult(res);
      setLoading(false);
      if (res.errors.length === 0) celebrate();
    };
    if (mode === 'melders') importMeldersFromCSV(file, storage, cb);
    else importReportsFromCSV(file, storage, cb);
  }

  const isJson = mode === 'json';

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>
      {overlay}

      {/* Hero */}
      <div
        className="px-8 pt-8 pb-8"
        style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-[#B0E3FF]" style={{ fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · OTP System
          </p>
          <h1 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Import Data
          </h1>
          <p className="text-sm text-[#B0E3FF]">Upload your monthly reports to auto-populate comp and commission data</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">

        {/* ── Monthly Workflow ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.5 }}>
            Monthly Workflow
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WorkflowCard
              step="1"
              title="Paylocity Salary Export"
              subtitle="Creates / updates Melders with salary data. Run once a month after any comp changes."
              active={mode === 'paylocity'}
              onClick={() => { setMode('paylocity'); setResult(null); }}
            />
            <WorkflowCard
              step="2"
              title="Commission & Bonus Report"
              subtitle="Sets each Melder's actual monthly pay. Creates stub reports ready for OAP entry."
              active={mode === 'commission'}
              onClick={() => { setMode('commission'); setResult(null); }}
            />
            <WorkflowCard
              step="3"
              title="Carta Market Benchmarks"
              subtitle="Updates market rate targets from a Carta compensation benchmarking export."
              active={mode === 'carta'}
              onClick={() => { setMode('carta'); setResult(null); }}
            />
          </div>
        </div>

        {/* ── Compensation Setup ───────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif', opacity: 0.5 }}>
            Compensation Setup
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WorkflowCard
              step="★"
              title="Comp Structure Upload"
              subtitle="Upload per-employee comp calculator sheets to auto-set each Melder's Target Comp (OTE)."
              active={mode === 'comp-structure'}
              onClick={() => { setMode('comp-structure'); setResult(null); setCompStructurePreview(null); }}
            />
          </div>
        </div>

        {/* ── Format Guide ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {mode === 'paylocity' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-800 mb-1">Paylocity — Employee Salary Report</h2>
                  <p className="text-sm text-slate-500">
                    Export from Paylocity under <span className="font-mono text-xs bg-slate-100 px-1 rounded">Reports → Payroll → Employee Salary</span> or build an ad-hoc report with these columns. Terminated employees are skipped automatically.
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV('paylocity-sample.csv', PAYLOCITY_SAMPLE.split('\n'))}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap flex-shrink-0 transition-colors hover:bg-[#eef5fc]"
                  style={{ borderColor: MELD_BLUE, color: MELD_BLUE }}
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </button>
              </div>
              <ColTable rows={[
                ['First Name + Last Name', 'Required', 'Employee full name — used to match existing Melders'],
                ['Employee Name', 'Alt', 'Combined name column — either format works'],
                ['Email Address', 'Recommended', 'Most reliable match key; updates contact info'],
                ['Annual Salary', 'Required', 'Paylocity annual base — stored as monthly (÷12)'],
                ['Job Title', 'For new Melders', 'Auto-maps to role ID (BDR, CSM, BSE, etc.)'],
                ['Hire Date', 'Optional', 'Sets Melder start date for proration'],
                ['Employment Status', 'Optional', '"Terminated" rows are automatically skipped'],
              ]} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Role mapping:</strong> Job titles like "Business Development Representative" auto-map to role IDs. Unrecognized titles will appear in the results as <em>unmapped</em> — you can assign their role in the Melders page after import.
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'commission' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-800 mb-1">Commission & Bonus Report</h2>
                  <p className="text-sm text-slate-500">
                    Export from Paylocity payroll detail, or your commission tool (Spiff, CaptivateIQ, etc.). Sets <strong>actual monthly comp</strong> on each Melder's report for the selected period.
                  </p>
                </div>
                <button
                  onClick={() => downloadCSV('commission-sample.csv', COMMISSION_SAMPLE.split('\n'))}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap flex-shrink-0 transition-colors hover:bg-[#eef5fc]"
                  style={{ borderColor: MELD_BLUE, color: MELD_BLUE }}
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </button>
              </div>

              {/* Period selector */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fallback Period (if not in CSV)</p>
                <div className="flex gap-3">
                  <select
                    value={commMonth}
                    onChange={(e) => setCommMonth(Number(e.target.value))}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={commYear}
                    onChange={(e) => setCommYear(Number(e.target.value))}
                    className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">If your CSV has a Pay Period / Month / Year column, it overrides this selection per row.</p>
              </div>

              <ColTable rows={[
                ['Employee Name', 'Required', 'Must match a Melder already in the system'],
                ['Total Gross Pay', 'Preferred', 'Monthly total payout — used as actualCompensation'],
                ['Regular Pay', 'Alt', 'Monthly base; combined with Commission if no Total'],
                ['Commission', 'Alt', 'Variable / incentive pay for the period'],
                ['Bonus', 'Alt', 'Recognized as variable pay (same as Commission)'],
                ['Pay Period', 'Optional', '"2025-03", "March 2025", "03/2025", or a date'],
                ['Month + Year', 'Optional', 'Separate numeric columns (1–12 and 4-digit year)'],
              ]} />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-[#1175CC] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    If a report for that period doesn't exist yet, a <strong>stub report</strong> is created with comp data pre-filled. You'll still need to enter OAP metric actuals in the Calculator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === 'carta' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-800 mb-1">Carta — Compensation Benchmarks</h2>
                  <p className="text-sm text-slate-500">
                    Export from Carta under <span className="font-mono text-xs bg-slate-100 px-1 rounded">Compensation → Benchmarks → Export CSV</span>. Updates each Melder's <strong>Market Rate</strong> — the Ratio denominator — so the flywheel stays grounded in real market data.
                  </p>
                </div>
              </div>

              {/* Comp philosophy callout */}
              <div className="rounded-xl p-4 border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Property Meld Compensation Framework
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li><span className="font-semibold">Total Cash target</span> — 50th percentile (market median). This sets the <strong>Market Rate</strong> imported here.</li>
                  <li><span className="font-semibold">Base salary</span> — 25th–50th percentile, varying by role's variable comp mix.</li>
                  <li><span className="font-semibold">Variable comp</span> — bridges base to 50th Total Cash based on each function's OTE structure.</li>
                </ul>
              </div>

              {/* Percentile selector */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Percentile to use as Market Rate</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { p: '25', label: '25th', note: 'Base salary floor' },
                    { p: '50', label: '50th', note: 'Total Cash target ★' },
                    { p: '75', label: '75th', note: 'Market-leading' },
                    { p: '90', label: '90th', note: 'Top of market' },
                  ] as const).map(({ p, label, note }) => (
                    <button
                      key={p}
                      onClick={() => setCartaPercentile(p)}
                      className="px-4 py-2 rounded-xl text-left text-sm font-semibold border-2 transition-all"
                      style={cartaPercentile === p
                        ? { borderColor: MELD_BLUE, background: '#eef5fc', color: MELD_DARK }
                        : { borderColor: '#e2e8f0', background: 'white', color: '#64748b' }
                      }
                    >
                      <span className="block">{label}</span>
                      <span className="block text-[10px] font-normal mt-0.5" style={{ color: cartaPercentile === p ? '#1175CC' : '#94a3b8' }}>{note}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  <strong className="text-slate-600">Total Cash</strong> columns are used when present; falls back to base Salary.
                </p>
              </div>

              <ColTable rows={[
                ['Role / Job Title / Level', 'Required', 'Matched to internal role IDs (BDR, CSM, BSE, etc.)'],
                ['Total Cash (50th)', 'Preferred', 'Annual total cash at selected percentile → marketRate (/12 for monthly)'],
                ['Salary (50th)', 'Fallback', 'Annual base salary — used if no Total Cash column present'],
                ['Total Cash (25th / 75th / 90th)', 'Optional', 'Available when other percentiles are selected above'],
              ]} />

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-[#1175CC] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Market rates are updated for <strong>every Melder</strong> in each matched role. Re-run whenever Carta publishes new benchmarks (typically quarterly or after survey refresh).
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === 'comp-structure' && (
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 mb-1">Comp Structure Upload — OTE Import</h2>
                <p className="text-sm text-slate-500">
                  Upload each employee's compensation calculator spreadsheet (exported as CSV). The importer scans for the{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">OTE (On Target Earnings)</span> row and reads
                  the dollar value regardless of which row it's on. Upload multiple files at once — one per employee or role tier.
                </p>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  How it works
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>The importer looks for any row containing <strong>"On Target Earnings"</strong> and extracts the adjacent dollar value.</li>
                  <li>The employee name is parsed from the header line (e.g. <span className="font-mono text-xs">"CSM: Bailey | Portfolio..."</span> → <strong>Bailey</strong>).</li>
                  <li>Matched Melders are pre-filled in the review table — unmatched ones require manual assignment before applying.</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    OTE is stored as <strong>Target Compensation</strong> (monthly = OTE ÷ 12) and is the denominator for <strong>CAP%</strong>. It is never overwritten by Paylocity imports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(mode === 'salary' || mode === 'melders' || mode === 'reports' || mode === 'json') && (
            <AdvancedGuide mode={mode} />
          )}
        </div>

        {/* ── Carta Staged Review ──────────────────────────────────── */}
        {mode === 'carta' && cartaPreview && (
          <CartaReviewPanel
            preview={cartaPreview}
            accepted={cartaAccepted}
            onToggle={(roleId) => setCartaAccepted((prev) => {
              const next = new Set(prev);
              next.has(roleId) ? next.delete(roleId) : next.add(roleId);
              return next;
            })}
            onToggleAll={(all) => setCartaAccepted(all
              ? new Set(cartaPreview.items.map((i) => i.roleId))
              : new Set()
            )}
            onApply={() => {
              const accepted = cartaPreview.items.filter((i) => cartaAccepted.has(i.roleId));
              const { storage: newStorage, meldersUpdated } = applyCartaUpdates(storage, accepted);
              onSave(() => newStorage);
              setResult({
                rolesUpdated: accepted.length,
                meldersUpdated,
                errors: cartaPreview.errors,
                warnings: cartaPreview.warnings,
                preview: accepted.map((i) => ({
                  roleId: i.roleId, roleName: i.roleName,
                  marketRate: i.proposedMonthlyRate, meldersAffected: i.melderNames.length,
                })),
              } as CartaImportResult);
              setCartaPreview(null);
              if (cartaPreview.errors.length === 0) celebrate();
            }}
            onDiscard={() => { setCartaPreview(null); setResult(null); }}
          />
        )}

        {/* ── Comp Structure Staged Review ─────────────────────────── */}
        {mode === 'comp-structure' && compStructurePreview && (
          <CompStructureReviewPanel
            preview={compStructurePreview}
            assignments={compStructureAssignments}
            melders={storage.melders}
            onAssign={(fileName, melderId) =>
              setCompStructureAssignments((prev) => ({ ...prev, [fileName]: melderId }))
            }
            onApply={() => {
              const toApply = compStructurePreview.items
                .filter((i) => compStructureAssignments[i.fileName])
                .map((i) => ({ melderId: compStructureAssignments[i.fileName], annualOte: i.annualOte }));
              const { storage: newStorage, updated } = applyCompStructureOTEs(storage, toApply);
              onSave(() => newStorage);
              setResult({
                meldersCreated: 0,
                meldersUpdated: updated,
                errors: compStructurePreview.errors,
                warnings: [],
              } as SalaryImportResult);
              setCompStructurePreview(null);
              if (compStructurePreview.errors.length === 0) celebrate();
            }}
            onDiscard={() => { setCompStructurePreview(null); setResult(null); }}
          />
        )}

        {/* ── Drop Zone ────────────────────────────────────────────── */}
        {!(mode === 'carta' && cartaPreview) && !(mode === 'comp-structure' && compStructurePreview) && (
        <div
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center cursor-pointer transition-all hover:border-[#52a3e8] hover:bg-[#eef5fc]/30"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileList(Array.from(e.dataTransfer.files));
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#eef5fc' }}
          >
            <Upload className="w-7 h-7" style={{ color: MELD_BLUE }} />
          </div>
          <p className="font-bold text-slate-700 text-lg">
            {mode === 'comp-structure' ? 'Drop files here, or click to browse' : 'Drop your file here, or click to browse'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {isJson ? '.json backup file' : mode === 'comp-structure' ? 'Multiple .csv files — one per employee' : '.csv file'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept={isJson ? '.json' : '.csv,.xlsx,.xls'}
            multiple={mode === 'comp-structure'}
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFileList(Array.from(e.target.files)); e.target.value = ''; }}
          />
        </div>
        )}

        {loading && (
          <div className="text-center text-slate-500 text-sm animate-pulse">Processing file…</div>
        )}

        {/* ── Results ──────────────────────────────────────────────── */}
        {result && <ImportResult result={result} />}

        {/* ── Advanced importers ───────────────────────────────────── */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Advanced Importers
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showAdvanced && (
            <div className="p-5 bg-white border-t border-slate-100 space-y-3">
              <p className="text-xs text-slate-400">These importers are for manual data entry or restoring backups.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { key: 'salary',  label: 'Generic Salary', desc: 'Custom salary CSV' },
                  { key: 'melders', label: 'Melders',         desc: 'Bulk add Melders' },
                  { key: 'reports', label: 'Performance',     desc: 'Historical reports' },
                  { key: 'json',    label: 'JSON Backup',     desc: 'Restore full backup' },
                ] as { key: ImportMode; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => { setMode(key); setResult(null); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${mode === key ? 'border-[#1175CC] bg-[#eef5fc]' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <p className={`font-semibold text-sm ${mode === key ? 'text-[#0d4a6b]' : 'text-slate-700'}`}>{label}</p>
                    <p className={`text-xs mt-1 ${mode === key ? 'text-[#1175CC]' : 'text-slate-400'}`}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Carta Staged Review Panel ───────────────────────────────────────────────

function CartaReviewPanel({ preview, accepted, onToggle, onToggleAll, onApply, onDiscard }: {
  preview: CartaPreviewResult;
  accepted: Set<string>;
  onToggle: (roleId: string) => void;
  onToggleAll: (all: boolean) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const allChecked = preview.items.length > 0 && preview.items.every((i) => accepted.has(i.roleId));
  const acceptedCount = accepted.size;

  function fmtAnnual(monthly: number) {
    return `$${Math.round(monthly * 12).toLocaleString('en-US')}`;
  }
  function fmtDelta(delta: number) {
    const abs = `$${Math.abs(Math.round(delta)).toLocaleString('en-US')}`;
    return delta >= 0 ? `+${abs}` : `-${abs.replace('$', '$')}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Review Market Rate Updates
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {preview.items.length} role{preview.items.length !== 1 ? 's' : ''} found — uncheck any you want to skip, then click Apply.
          </p>
        </div>
        <button onClick={onDiscard} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="px-6 py-3 border-b border-amber-100 bg-amber-50">
          {preview.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">⚠ {w}</p>
          ))}
        </div>
      )}

      {preview.items.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">
          No matching roles found in this file. Check the warnings above.
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => onToggleAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">Current (Annual)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">New (Annual)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">Change</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">Melders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.items.map((item) => {
                  const isAccepted = accepted.has(item.roleId);
                  const isIncrease = item.annualDelta >= 0;
                  const unchanged = item.changePct === 0;
                  return (
                    <tr
                      key={item.roleId}
                      className={`transition-colors ${isAccepted ? 'bg-white' : 'bg-slate-50 opacity-50'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isAccepted}
                          onChange={() => onToggle(item.roleId)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{item.roleName}</p>
                        <p className="text-slate-400 font-mono">{item.roleId}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {item.currentMonthlyRate > 0 ? fmtAnnual(item.currentMonthlyRate) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                        {fmtAnnual(item.proposedMonthlyRate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unchanged ? (
                          <span className="text-slate-400">No change</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-semibold ${isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                            {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {fmtDelta(item.annualDelta)}
                            <span className="font-normal text-xs opacity-75">({item.changePct > 0 ? '+' : ''}{item.changePct}%)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        <span title={item.melderNames.join(', ')} className="cursor-help border-b border-dashed border-slate-300">
                          {item.melderNames.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button onClick={onDiscard} className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">{acceptedCount} of {preview.items.length} roles selected</p>
              <button
                disabled={acceptedCount === 0}
                onClick={onApply}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: acceptedCount > 0 ? '#022935' : '#94a3b8' }}
              >
                Apply {acceptedCount} Update{acceptedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({ step, title, subtitle, active, onClick }: {
  step: string; title: string; subtitle: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-5 rounded-2xl border-2 transition-all w-full"
      style={active
        ? { borderColor: MELD_BLUE, background: '#eef5fc' }
        : { borderColor: '#e2e8f0', background: 'white' }
      }
    >
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
          style={active
            ? { background: MELD_BLUE, color: 'white' }
            : { background: '#f1f5f9', color: '#94a3b8' }
          }
        >
          {step}
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: active ? MELD_DARK : '#334155' }}>{title}</p>
          <p className="text-xs mt-1" style={{ color: active ? '#1175CC' : '#94a3b8' }}>{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Column Table ─────────────────────────────────────────────────────────────

function ColTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">Column</th>
            <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-2 font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(([col, req, desc]) => (
            <tr key={col}>
              <td className="px-4 py-2 font-mono font-semibold" style={{ color: MELD_BLUE }}>{col}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  req === 'Required' ? 'bg-red-50 text-red-600' :
                  req === 'Recommended' ? 'bg-amber-50 text-amber-700' :
                  req === 'Preferred' ? 'bg-blue-50 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{req}</span>
              </td>
              <td className="px-4 py-2 text-slate-500">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Advanced Guide ───────────────────────────────────────────────────────────

function AdvancedGuide({ mode }: { mode: ImportMode }) {
  return (
    <div className="p-6">
      {mode === 'salary' && (
        <>
          <h2 className="font-bold text-slate-800 mb-3">Generic Salary Report</h2>
          <ColTable rows={[
            ['Name', 'Required', 'Melder full name'],
            ['Role', 'Recommended', 'Role ID (BDR, CSM, BSE, etc.)'],
            ['Current Salary', 'Optional', 'Annual base salary'],
            ['Total Cash Target (Market)', 'Preferred', 'Annual market total cash → marketRate'],
            ['Total Cash Actual (Meld Comp Plan)', 'Preferred', 'Annual Meld target → targetCompensation'],
          ]} />
        </>
      )}
      {mode === 'melders' && (
        <>
          <h2 className="font-bold text-slate-800 mb-2">Bulk Melder Import</h2>
          <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre mb-2">
            {'Name,Role,HireDate,Email,MarketRate,TargetCompensation\nJane Smith,CSM,2024-03-15,jane@meld.com,9500,9000'}
          </code>
          <p className="text-xs text-slate-400">MarketRate and TargetCompensation should be monthly amounts.</p>
        </>
      )}
      {mode === 'reports' && (
        <>
          <h2 className="font-bold text-slate-800 mb-2">Historical Reports</h2>
          <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre mb-2">
            {'MelderName,Role,Month,Year,ActualCompensation,TargetCompensation,MarketRate,GRR_Actual,GRR_Target\nJane Smith,CSM,1,2025,8500,9000,9500,0.92,1.00'}
          </code>
          <p className="text-xs text-slate-400">Metric columns use abbreviation + _Actual / _Target suffix. Comp values are monthly.</p>
        </>
      )}
      {mode === 'json' && (
        <p className="text-sm text-slate-500">Select a .json backup exported from this system. <strong className="text-red-600">This replaces all current data.</strong></p>
      )}
    </div>
  );
}

// ─── Comp Structure Review Panel ─────────────────────────────────────────────

function CompStructureReviewPanel({ preview, assignments, melders, onAssign, onApply, onDiscard }: {
  preview: CompStructureParseResult;
  assignments: Record<string, string>;
  melders: import('../types').Melder[];
  onAssign: (fileName: string, melderId: string) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const assignedCount = preview.items.filter((i) => assignments[i.fileName]).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Review OTE Assignments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {preview.items.length} file{preview.items.length !== 1 ? 's' : ''} parsed — confirm each Melder assignment, then click Apply.
          </p>
        </div>
        <button onClick={onDiscard} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      {preview.errors.length > 0 && (
        <div className="px-6 py-3 border-b border-amber-100 bg-amber-50">
          {preview.errors.map((e, i) => (
            <p key={i} className="text-xs text-amber-700">⚠ {e}</p>
          ))}
        </div>
      )}

      {preview.items.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">
          No OTE values found. Ensure your files have an "OTE (On Target Earnings)" row.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">File</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">Detected Name</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-wide">OTE (Annual)</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wide">Assign to Melder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.items.map((item: CompStructureItem) => (
                  <tr key={item.fileName} className="bg-white">
                    <td className="px-4 py-3 font-mono text-slate-500 max-w-[180px] truncate" title={item.fileName}>
                      {item.fileName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.detectedName ?? <span className="text-slate-300 italic">not detected</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                      ${item.annualOte.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={assignments[item.fileName] ?? ''}
                        onChange={(e) => onAssign(item.fileName, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
                      >
                        <option value="">— select melder —</option>
                        {melders.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button onClick={onDiscard} className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">{assignedCount} of {preview.items.length} assigned</p>
              <button
                disabled={assignedCount === 0}
                onClick={onApply}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: assignedCount > 0 ? '#022935' : '#94a3b8' }}
              >
                Apply {assignedCount} OTE{assignedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Import Result ────────────────────────────────────────────────────────────

function ImportResult({ result }: { result: AnyResult }) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const hasWarnings = 'warnings' in result && (result.warnings as string[]).length > 0;
  const ok = !hasErrors;

  // Summary line
  const lines: string[] = [];
  if ('meldersCreated' in result && result.meldersCreated > 0)  lines.push(`${result.meldersCreated} Melder${result.meldersCreated !== 1 ? 's' : ''} created`);
  if ('meldersUpdated' in result && result.meldersUpdated > 0)  lines.push(`${result.meldersUpdated} Melder${result.meldersUpdated !== 1 ? 's' : ''} updated`);
  if ('meldersAdded'   in result && result.meldersAdded   > 0)  lines.push(`${result.meldersAdded}   Melder${result.meldersAdded   !== 1 ? 's' : ''} added`);
  if ('reportsAdded'   in result && result.reportsAdded   > 0)  lines.push(`${result.reportsAdded}   report${result.reportsAdded   !== 1 ? 's' : ''} added`);
  if ('reportsUpdated' in result && result.reportsUpdated > 0)  lines.push(`${result.reportsUpdated} report${result.reportsUpdated !== 1 ? 's' : ''} updated`);
  if ('reportsCreated' in result && result.reportsCreated > 0)  lines.push(`${result.reportsCreated} stub report${result.reportsCreated !== 1 ? 's' : ''} created`);
  if ('skipped'        in result && result.skipped        > 0)  lines.push(`${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped`);
  if ('rolesUpdated'   in result && result.rolesUpdated   > 0)  lines.push(`${result.rolesUpdated} role${result.rolesUpdated !== 1 ? 's' : ''} updated`);

  const cartaPreview = 'preview' in result ? (result as CartaImportResult).preview : [];

  const unmapped = 'unmappedRoles' in result ? result.unmappedRoles as { name: string; jobTitle: string }[] : [];

  return (
    <div
      className="rounded-2xl border p-5"
      style={
        hasErrors   ? { background: '#fff7ed', borderColor: '#fed7aa' } :
        hasWarnings ? { background: '#f0fdf4', borderColor: '#bbf7d0' } :
                      { background: '#f0fdf4', borderColor: '#bbf7d0' }
      }
    >
      <div className="flex items-center gap-3 mb-3">
        {ok
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <XCircle    className="w-5 h-5 text-amber-500" />
        }
        <h3 className={`font-bold ${ok ? 'text-green-800' : 'text-amber-800'}`}>
          Import {ok ? 'Complete' : 'Completed with Errors'}
        </h3>
      </div>

      {lines.length > 0 && (
        <div className="space-y-0.5 mb-3">
          {lines.map((l) => (
            <p key={l} className="text-sm text-green-700 font-medium">{l}</p>
          ))}
        </div>
      )}

      {cartaPreview.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-green-700 mb-2">Market rates updated:</p>
          <div className="rounded-xl border border-green-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-green-50">
                  <th className="text-left px-3 py-1.5 font-semibold text-green-700">Role</th>
                  <th className="text-right px-3 py-1.5 font-semibold text-green-700">Monthly Mkt Rate</th>
                  <th className="text-right px-3 py-1.5 font-semibold text-green-700">Melders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {cartaPreview.map((row) => (
                  <tr key={row.roleId}>
                    <td className="px-3 py-1.5 font-mono font-semibold text-green-800">{row.roleId}</td>
                    <td className="px-3 py-1.5 text-right text-green-700">${row.marketRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-1.5 text-right text-green-600">{row.meldersAffected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unmapped.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-amber-700 mb-1">{unmapped.length} employee{unmapped.length !== 1 ? 's' : ''} with unrecognized job title:</p>
          <div className="space-y-1">
            {unmapped.map((u) => (
              <p key={u.name} className="text-xs text-amber-600">
                <span className="font-semibold">{u.name}</span> — "{u.jobTitle}" (assign role in Melders page)
              </p>
            ))}
          </div>
        </div>
      )}

      {hasWarnings && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-blue-700 mb-1">Notes:</p>
          {(result as { warnings: string[] }).warnings.map((w, i) => (
            <p key={i} className="text-xs text-blue-600">{w}</p>
          ))}
        </div>
      )}

      {hasErrors && (
        <div>
          <p className="text-sm font-semibold text-red-700 mb-1">Errors:</p>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600">{e}</p>
          ))}
        </div>
      )}
    </div>
  );
}
