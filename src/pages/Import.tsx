import { CheckCircle, Download, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import type { AppStorage } from '../types';
import type { CSVImportResult, SalaryImportResult } from '../utils/csv';
import { importMeldersFromCSV, importReportsFromCSV, importSalaryReportCSV } from '../utils/csv';
import { importJSON } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

type ImportType = 'salary' | 'melders' | 'reports' | 'json';
type AnyResult = CSVImportResult | SalaryImportResult | null;

const SALARY_TEMPLATE_ROWS = [
  'Name,Role,Current Salary,Market Salary Target,Total Cash Target (Market),Total Cash Actual (Meld Comp Plan)',
  'Benjamin Capelle,BDR,43900,59000,59000,43900',
  'Winston Pinto,BDR,73000,85000,85000,73000',
  'Jane Smith,CSM,72000,83000,83000,72000',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([SALARY_TEMPLATE_ROWS], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meld-salary-report-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function Import({ storage, onSave }: Props) {
  const [importType, setImportType] = useState<ImportType>('salary');
  const [result, setResult] = useState<AnyResult>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setLoading(true);
    setResult(null);

    if (importType === 'json') {
      importJSON(file)
        .then((data) => {
          onSave(() => data);
          setResult({ meldersAdded: data.melders.length, reportsAdded: data.reports.length, errors: [] } as CSVImportResult);
        })
        .catch((e) => setResult({ meldersAdded: 0, reportsAdded: 0, errors: [e.message] } as CSVImportResult))
        .finally(() => setLoading(false));
      return;
    }

    if (importType === 'salary') {
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

    if (importType === 'melders') {
      importMeldersFromCSV(file, storage, cb);
    } else {
      importReportsFromCSV(file, storage, cb);
    }
  }

  const IMPORT_TYPES: { key: ImportType; label: string; desc: string }[] = [
    { key: 'salary',  label: 'Salary Report',  desc: 'Import comp data from your annual XLSX/CSV export' },
    { key: 'melders', label: 'Melders',         desc: 'Add new Melders to the system' },
    { key: 'reports', label: 'Performance',     desc: 'Import historical monthly report data' },
    { key: 'json',    label: 'JSON Backup',     desc: 'Restore a full system backup' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Header title="Import Data" subtitle="Upload salary reports, add Melders, or restore a backup" />

      {/* Type Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">What are you importing?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {IMPORT_TYPES.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => { setImportType(key); setResult(null); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${importType === key ? 'border-[#1175CC] bg-[#eef5fc]' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <p className={`font-semibold text-sm ${importType === key ? 'text-[#0d4a6b]' : 'text-slate-700'}`}>{label}</p>
              <p className={`text-xs mt-1 ${importType === key ? 'text-[#1175CC]' : 'text-slate-400'}`}>{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format Guide */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Format Guide</h2>

        {importType === 'salary' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Upload your annual compensation CSV. The importer creates new Melders or updates existing ones with salary and market-rate data.
            </p>
            <div className="rounded-xl border border-slate-100 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2">Column</th>
                    <th className="px-4 py-2">Required</th>
                    <th className="px-4 py-2">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    ['Name', 'Yes', 'Melder full name — used to match existing records'],
                    ['Role', 'Recommended', 'Role ID (e.g. BDR, CSM, BSE). Required to create new Melders.'],
                    ['Current Salary', 'Optional', 'Annual base salary'],
                    ['Market Salary Target', 'Optional', 'Market benchmark base salary'],
                    ['Total Cash Target (Market)', 'Preferred', 'Market total cash (base + variable) — used as marketRate'],
                    ['Total Cash Actual (Meld Comp Plan)', 'Preferred', 'Meld planned total cash — used as targetCompensation'],
                  ].map(([col, req, desc]) => (
                    <tr key={col} className="text-slate-700">
                      <td className="px-4 py-2 font-mono font-semibold text-[#1175CC]">{col}</td>
                      <td className="px-4 py-2 text-slate-500">{req}</td>
                      <td className="px-4 py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-[#1175CC] text-[#1175CC] hover:bg-[#eef5fc] transition-colors"
            >
              <Download className="w-4 h-4" /> Download Template CSV
            </button>
          </div>
        )}

        {importType === 'melders' && (
          <div>
            <p className="text-sm text-slate-500 mb-3">CSV with these columns (header row required):</p>
            <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre">
              {'Name,Role,Email,MarketRate,TargetCompensation\nJane Smith,CSM,jane@meld.com,9500,9000\nJohn Doe,BSE,,10000,9500\nSarah Lee,BDR,sarah@meld.com,7000,6500'}
            </code>
            <p className="text-xs text-slate-400 mt-2">Role must match a role ID in the system (e.g. CSM, BSE, BDR, BDA). Email is optional.</p>
          </div>
        )}

        {importType === 'reports' && (
          <div>
            <p className="text-sm text-slate-500 mb-3">CSV with metric columns using abbreviation + _Actual / _Target suffix:</p>
            <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre">
              {'MelderName,Role,Month,Year,ActualCompensation,TargetCompensation,MarketRate,GRR_Actual,GRR_Target,UCR_Actual,UCR_Target\nJane Smith,CSM,1,2025,8500,9000,9500,0.92,1.00,15000,18000'}
            </code>
            <p className="text-xs text-slate-400 mt-2">If a Melder doesn't exist, they'll be created automatically.</p>
          </div>
        )}

        {importType === 'json' && (
          <p className="text-sm text-slate-500">Select a .json backup file exported from this system. This will replace all current data.</p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center cursor-pointer hover:border-[#52a3e8] hover:bg-[#eef5fc]/30 transition-all"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-600">Drop your file here, or click to browse</p>
        <p className="text-sm text-slate-400 mt-1">{importType === 'json' ? '.json files' : '.csv files'}</p>
        <input
          ref={fileRef}
          type="file"
          accept={importType === 'json' ? '.json' : '.csv'}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>

      {loading && (
        <div className="mt-4 text-center text-slate-500 text-sm animate-pulse">Processing file...</div>
      )}

      {/* Result — Salary import */}
      {result && 'meldersCreated' in result && (
        <div className={`mt-4 rounded-2xl border p-5 ${result.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.errors.length === 0 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-amber-500" />}
            <h3 className={`font-bold ${result.errors.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>
              Salary Import {result.errors.length === 0 ? 'Complete' : 'Completed with Errors'}
            </h3>
          </div>
          <div className="text-sm space-y-1">
            {result.meldersCreated > 0 && <p className="text-green-700">{result.meldersCreated} Melder{result.meldersCreated !== 1 ? 's' : ''} created</p>}
            {result.meldersUpdated > 0 && <p className="text-green-700">{result.meldersUpdated} Melder{result.meldersUpdated !== 1 ? 's' : ''} updated with comp data</p>}
            {result.warnings.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-amber-700 mb-1">Warnings:</p>
                {result.warnings.map((w, i) => <p key={i} className="text-amber-600 text-xs">{w}</p>)}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-red-700 mb-1">Errors:</p>
                {result.errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result — standard import */}
      {result && 'meldersAdded' in result && (
        <div className={`mt-4 rounded-2xl border p-5 ${result.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.errors.length === 0 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-amber-500" />}
            <h3 className={`font-bold ${result.errors.length === 0 ? 'text-green-800' : 'text-amber-800'}`}>
              Import {result.errors.length === 0 ? 'Complete' : 'Completed with Errors'}
            </h3>
          </div>
          <div className="text-sm space-y-1">
            {result.meldersAdded > 0 && <p className="text-green-700">{result.meldersAdded} Melder{result.meldersAdded !== 1 ? 's' : ''} added</p>}
            {result.reportsAdded > 0 && <p className="text-green-700">{result.reportsAdded} report{result.reportsAdded !== 1 ? 's' : ''} added</p>}
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-amber-700 mb-1">Errors:</p>
                {result.errors.map((e, i) => <p key={i} className="text-amber-600 text-xs">{e}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
