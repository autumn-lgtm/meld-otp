import { CheckCircle, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import type { AppStorage } from '../types';
import type { CSVImportResult } from '../utils/csv';
import { importMeldersFromCSV, importReportsFromCSV } from '../utils/csv';
import { importJSON } from '../utils/storage';

interface Props {
  storage: AppStorage;
  onSave: (updater: (s: AppStorage) => AppStorage) => void;
}

type ImportType = 'melders' | 'reports' | 'json';

export function Import({ storage, onSave }: Props) {
  const [importType, setImportType] = useState<ImportType>('melders');
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setLoading(true);
    setResult(null);

    if (importType === 'json') {
      importJSON(file)
        .then((data) => {
          onSave(() => data);
          setResult({ meldersAdded: data.melders.length, reportsAdded: data.reports.length, errors: [] });
        })
        .catch((e) => setResult({ meldersAdded: 0, reportsAdded: 0, errors: [e.message] }))
        .finally(() => setLoading(false));
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Header title="Import Data" subtitle="Load Melders or reports from CSV or JSON" />

      {/* Type Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">What are you importing?</h2>
        <div className="grid grid-cols-3 gap-3">
          {([ ['melders', 'Melders', 'Add new Melders to the system'], ['reports', 'Reports', 'Import historical monthly report data'], ['json', 'JSON Backup', 'Restore a full system backup'] ] as const).map(([key, label, desc]) => (
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
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Required Format</h2>
        {importType === 'melders' && (
          <div>
            <p className="text-sm text-slate-500 mb-3">CSV with these columns (header row required):</p>
            <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto">
              Name,Role,Email,MarketRate,TargetCompensation<br/>
              Jane Smith,CSM,jane@meld.com,9500,9000<br/>
              John Doe,BSE,,10000,9500<br/>
              Sarah Lee,BDR,sarah@meld.com,7000,6500
            </code>
            <p className="text-xs text-slate-400 mt-2">Role must be one of: CSM, BSE, BDR (or a custom role ID). Email is optional.</p>
          </div>
        )}
        {importType === 'reports' && (
          <div>
            <p className="text-sm text-slate-500 mb-3">CSV with these columns. Metric columns use abbreviation + _Actual / _Target suffix:</p>
            <code className="block bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-700 overflow-x-auto">
              MelderName,Role,Month,Year,ActualCompensation,TargetCompensation,MarketRate,GRR_Actual,GRR_Target,UCR_Actual,UCR_Target<br/>
              Jane Smith,CSM,1,2025,8500,9000,9500,0.92,1.00,15000,18000
            </code>
            <p className="text-xs text-slate-400 mt-2">If a Melder with that name + role doesn't exist, they'll be created automatically.</p>
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

      {/* Loading */}
      {loading && (
        <div className="mt-4 text-center text-slate-500 text-sm animate-pulse">Processing file...</div>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-4 rounded-2xl border p-5 ${result.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.errors.length === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-500" />
            )}
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
                {result.errors.map((e, i) => (
                  <p key={i} className="text-amber-600 text-xs">{e}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
