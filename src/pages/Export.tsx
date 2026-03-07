import { Download, FileJson, FileText } from 'lucide-react';
import { Header } from '../components/layout/Header';
import type { AppStorage } from '../types';
import { exportReportsCSV } from '../utils/csv';
import { exportJSON } from '../utils/storage';

interface Props {
  storage: AppStorage;
}

export function Export({ storage }: Props) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Header title="Export Data" subtitle="Download your OTP data in various formats" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExportCard
          icon={FileText}
          title="Reports CSV"
          description="All monthly reports with calculated OAP, CAP, and Ratio values. Use for Excel analysis or archiving."
          action="Download CSV"
          onClick={() => exportReportsCSV(storage.reports, storage.melders)}
          disabled={storage.reports.length === 0}
          disabledMsg="No reports to export"
        />
        <ExportCard
          icon={FileJson}
          title="Full Backup (JSON)"
          description="Complete system export including Melders, reports, and custom roles. Use to restore or migrate data."
          action="Download JSON"
          onClick={() => exportJSON(storage)}
          disabled={false}
        />
      </div>

      <div className="mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
        <h3 className="font-bold text-slate-700 text-sm mb-2">Data Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-[#1175CC]">{storage.melders.length}</p>
            <p className="text-xs text-slate-500">Melders</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1175CC]">{storage.reports.length}</p>
            <p className="text-xs text-slate-500">Reports</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1175CC]">{storage.roles.filter((r) => r.isCustom).length}</p>
            <p className="text-xs text-slate-500">Custom Roles</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ icon: Icon, title, description, action, onClick, disabled, disabledMsg }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  disabled: boolean;
  disabledMsg?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="w-10 h-10 rounded-xl bg-[#dceefa] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#1175CC]" />
      </div>
      <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#1175CC] text-white hover:bg-[#0d62b0]"
      >
        <Download className="w-4 h-4" />
        {disabled && disabledMsg ? disabledMsg : action}
      </button>
    </div>
  );
}
