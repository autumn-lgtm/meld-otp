import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Download, FileText, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AppStorage } from '../types';
import { MONTHS } from '../types';
import type {
  CommissionImportResult,
  CSVImportResult,
  PaylocityImportResult,
  SalaryImportResult,
} from '../utils/csv';
import {
  importCommissionCSV,
  importMeldersFromCSV,
  importPaylocityCSV,
  importReportsFromCSV,
  importSalaryReportCSV,
} from '../utils/csv';
import { importJSON } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

type ImportMode =
  | 'paylocity'
  | 'commission'
  | 'salary'
  | 'melders'
  | 'reports'
  | 'json';

type AnyResult =
  | PaylocityImportResult
  | CommissionImportResult
  | SalaryImportResult
  | CSVImportResult
  | null;

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';

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

  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setLoading(true);
    setResult(null);

    if (mode === 'paylocity') {
      importPaylocityCSV(file, storage, (res, newStorage) => {
        onSave(() => newStorage);
        setResult(res);
        setLoading(false);
      });
      return;
    }

    if (mode === 'commission') {
      importCommissionCSV(file, storage, commMonth, commYear, (res, newStorage) => {
        onSave(() => newStorage);
        setResult(res);
        setLoading(false);
      });
      return;
    }

    if (mode === 'json') {
      importJSON(file)
        .then((data) => {
          onSave(() => data);
          setResult({ meldersAdded: data.melders.length, reportsAdded: data.reports.length, errors: [] } as CSVImportResult);
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
      });
      return;
    }

    const cb = (res: CSVImportResult, newStorage: AppStorage) => {
      onSave(() => newStorage);
      setResult(res);
      setLoading(false);
    };
    if (mode === 'melders') importMeldersFromCSV(file, storage, cb);
    else importReportsFromCSV(file, storage, cb);
  }

  const isJson = mode === 'json';

  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {(mode === 'salary' || mode === 'melders' || mode === 'reports' || mode === 'json') && (
            <AdvancedGuide mode={mode} />
          )}
        </div>

        {/* ── Drop Zone ────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center cursor-pointer transition-all hover:border-[#52a3e8] hover:bg-[#eef5fc]/30"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#eef5fc' }}
          >
            <Upload className="w-7 h-7" style={{ color: MELD_BLUE }} />
          </div>
          <p className="font-bold text-slate-700 text-lg">Drop your file here, or click to browse</p>
          <p className="text-sm text-slate-400 mt-1">{isJson ? '.json backup file' : '.csv file'}</p>
          <input
            ref={fileRef}
            type="file"
            accept={isJson ? '.json' : '.csv'}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>

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
