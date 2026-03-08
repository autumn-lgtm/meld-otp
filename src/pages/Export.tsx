import { Download, Eye, FileBarChart2, FileJson, FileText } from 'lucide-react';
import { forwardRef, useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import type { AppStorage, MonthlyReport } from '../types';
import { MONTHS } from '../types';
import { fmtCurrency, fmtPct } from '../utils/calculations';
import { exportReportsCSV } from '../utils/csv';
import { exportJSON } from '../utils/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  storage: AppStorage;
}

const HEALTH = {
  red:    { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Needs Attention' },
  yellow: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'At Risk' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#065F46', label: 'On Track' },
  blue:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', label: 'Above Target' },
};

export function Export({ storage }: Props) {
  const [selectedMelder, setSelectedMelder] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { melders, reports, roles } = storage;

  const melderReports = selectedMelder
    ? [...reports.filter((r) => r.melderId === selectedMelder)].sort((a, b) => b.year - a.year || b.month - a.month)
    : [];

  const report = melderReports.find((r) => r.id === selectedReportId) ?? melderReports[0] ?? null;
  const role = roles.find((r) => r.id === melders.find((m) => m.id === selectedMelder)?.roleId);

  async function handleExportPDF() {
    if (!printRef.current || !report) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (canvas.height * pw) / canvas.width;
      let y = 0;
      while (y < ih) {
        if (y > 0) pdf.addPage();
        pdf.addImage(img, 'PNG', 0, -y, pw, ih);
        y += ph;
      }
      pdf.save(`OTP-${report.melderName.replace(/\s+/g, '-')}-${MONTHS[report.month - 1]}-${report.year}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Header title="Export" subtitle="Download reports and data in multiple formats" />

      {/* Format cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <FormatCard
          icon={FileText} title="Reports CSV"
          description="All monthly reports with OAP, CAP, and Ratio. Open in Excel or Google Sheets."
          action="Download CSV"
          onClick={() => exportReportsCSV(reports, melders)}
          disabled={reports.length === 0} disabledMsg="No reports yet"
        />
        <FormatCard
          icon={FileJson} title="Full Backup"
          description="Complete export — Melders, reports, and custom roles. Restore or migrate data."
          action="Download JSON"
          onClick={() => exportJSON(storage)}
          disabled={false}
        />
        <FormatCard
          icon={FileBarChart2} title="PDF Report"
          description="Branded single-melder performance report. Select below to preview and export."
          action="Configure below ↓"
          onClick={() => {}} disabled={false} isInfo
        />
      </div>

      {/* Data summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Data Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { value: melders.length, label: 'Melders' },
            { value: reports.length, label: 'Reports' },
            { value: roles.filter((r) => r.isCustom).length, label: 'Custom Roles' },
            { value: new Set(reports.map((r) => `${r.year}-${r.month}`)).size, label: 'Periods' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-black text-[#1175CC]">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Builder */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">PDF Report Builder</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select a Melder and period to preview and export a branded report</p>
          </div>
          <div className="flex gap-2">
            {report && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
            )}
            <button
              onClick={handleExportPDF}
              disabled={!report || exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[#1175CC] text-white hover:bg-[#0d62b0] disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Melder</label>
            <select
              value={selectedMelder}
              onChange={(e) => { setSelectedMelder(e.target.value); setSelectedReportId(''); setShowPreview(false); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC]"
            >
              <option value="">— select a melder —</option>
              {melders.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Period</label>
            <select
              value={selectedReportId || report?.id || ''}
              onChange={(e) => setSelectedReportId(e.target.value)}
              disabled={!selectedMelder || melderReports.length === 0}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1175CC] disabled:bg-slate-50 disabled:text-slate-400"
            >
              {melderReports.length === 0
                ? <option>No reports available</option>
                : melderReports.map((r) => <option key={r.id} value={r.id}>{MONTHS[r.month - 1]} {r.year}</option>)
              }
            </select>
          </div>
        </div>

        {/* Live Preview */}
        {report && showPreview && (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Report Preview — {report.melderName} · {MONTHS[report.month - 1]} {report.year}</p>
            <div className="overflow-x-auto rounded-2xl shadow-lg border border-slate-200">
              <ReportTemplate ref={printRef} report={report} role={role} />
            </div>
          </div>
        )}

        {/* Hidden export target when preview is off */}
        {report && !showPreview && (
          <div className="fixed -left-[9999px] top-0 pointer-events-none">
            <ReportTemplate ref={printRef} report={report} role={role} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Branded PDF Report Template ─────────────────────────────────────────────

const ReportTemplate = forwardRef<HTMLDivElement, { report: MonthlyReport; role?: { fullName: string } }>(
  ({ report, role }, ref) => {
    const metrics = [
      { key: 'OAP', value: report.oapResult.oap,    health: report.oapResult.health,    question: 'Did we deliver to the plan?' },
      { key: 'CAP', value: report.capResult.cap,    health: report.capResult.health,    question: 'Did pay reflect delivery?' },
      { key: 'Ratio', value: report.ratioResult.ratio, health: report.ratioResult.health, question: 'Competitive vs. market?' },
    ];

    return (
      <div ref={ref} style={{ width: 794, fontFamily: 'system-ui, sans-serif', background: '#fff', padding: 48 }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #022935 0%, #0a3d52 55%, #1175CC 100%)', borderRadius: 16, padding: '32px 40px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                  <defs><mask id="pdf-mask"><rect x="9.5" y="0" width="9" height="11" rx="2.5" fill="white"/><rect x="0" y="7.5" width="28" height="14" rx="3.5" fill="white"/><rect x="9.5" y="20.5" width="9" height="7.5" rx="2.5" fill="white"/><polygon points="14,9 0.5,20.5 27.5,20.5" fill="black"/><rect x="19" y="11.5" width="4" height="6" rx="1" fill="black"/></mask></defs>
                  <rect width="28" height="28" fill="white" mask="url(#pdf-mask)"/>
                </svg>
              </div>
              <div>
                <p style={{ color: 'rgba(176,227,255,0.6)', fontSize: 9, margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>Property Meld</p>
                <p style={{ color: 'white', fontSize: 11, fontWeight: 700, margin: 0 }}>Outcome-to-Pay System</p>
              </div>
            </div>
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: '0 0 5px' }}>{report.melderName}</h1>
            <p style={{ color: 'rgba(176,227,255,0.75)', fontSize: 13, margin: 0 }}>{role?.fullName ?? report.roleId} &nbsp;·&nbsp; {MONTHS[report.month - 1]} {report.year}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 1.2 }}>Generated</p>
            <p style={{ color: 'white', fontSize: 11, fontWeight: 600, margin: '0 0 14px' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p style={{ color: 'rgba(176,227,255,0.6)', fontSize: 8, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.2 }}>Report Period</p>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: 0 }}>{MONTHS[report.month - 1].slice(0, 3).toUpperCase()} {report.year}</p>
            </div>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 26 }}>
          {metrics.map(({ key, value, health, question }) => {
            const c = HEALTH[health];
            return (
              <div key={key} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 14, padding: '20px 22px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: c.text, textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 2px' }}>{key}</p>
                <p style={{ fontSize: 10, color: c.text, opacity: 0.65, margin: '0 0 10px' }}>{question}</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: c.text, margin: '0 0 6px', lineHeight: 1 }}>{value.toFixed(1)}%</p>
                <span style={{ fontSize: 9, fontWeight: 700, color: c.text, background: 'rgba(0,0,0,0.07)', padding: '2px 9px', borderRadius: 20, display: 'inline-block' }}>{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Compensation Detail ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 22px', marginBottom: 22 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 14px' }}>Compensation Detail</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Actual Compensation', value: fmtCurrency(report.capResult.actualCompensation), delta: report.capResult.actualCompensation - report.capResult.targetCompensation },
              { label: 'Target Compensation', value: fmtCurrency(report.capResult.targetCompensation), delta: null },
              { label: 'Market Rate', value: fmtCurrency(report.ratioResult.marketRate), delta: report.capResult.actualCompensation - report.ratioResult.marketRate },
            ].map(({ label, value, delta }) => (
              <div key={label}>
                <p style={{ fontSize: 9, color: '#94A3B8', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', margin: '0 0 2px' }}>{value}</p>
                {delta !== null && (
                  <p style={{ fontSize: 10, fontWeight: 600, color: delta >= 0 ? '#065F46' : '#B91C1C', margin: 0 }}>
                    {delta >= 0 ? '+' : ''}{fmtCurrency(delta)} vs target
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── OAP Breakdown Table ── */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 22 }}>
          <div style={{ background: '#022935', padding: '11px 20px' }}>
            <p style={{ color: 'white', fontSize: 10, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1.2 }}>Outcome Attainment Breakdown</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Metric', 'Actual', 'Target', 'Weight', 'Attainment', 'Contribution'].map((h) => (
                  <th key={h} style={{ padding: '8px 14px', fontSize: 8, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.oapResult.metricResults.map((m, i) => {
                const attColor = m.attainmentPct >= 90 ? '#065F46' : m.attainmentPct >= 70 ? '#92400E' : '#B91C1C';
                return (
                  <tr key={m.metricId} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, color: '#1E293B' }}>
                      {m.abbreviation}
                      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 5 }}>{m.metricName}</span>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>{m.actual}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>{m.target}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, color: '#475569' }}>{(m.weight * 100).toFixed(0)}%</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: attColor }}>{fmtPct(m.attainmentPct)}</td>
                    <td style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: '#1175CC' }}>+{fmtPct(m.weightedContribution)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Alerts ── */}
        {report.alerts.length > 0 && (
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 22 }}>
            <div style={{ background: '#7F1D1D', padding: '11px 20px' }}>
              <p style={{ color: 'white', fontSize: 10, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1.2 }}>Recommendations & Alerts</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {report.alerts.map((a, i) => {
                const s = a.severity === 'critical' ? { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444' }
                        : a.severity === 'warning'  ? { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' }
                        :                             { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#3B82F6' };
                return (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '11px 15px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: s.text, margin: '0 0 2px' }}>{a.title}</p>
                      <p style={{ fontSize: 10, color: s.text, opacity: 0.8, margin: 0 }}>{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {report.notes && (
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 20px', marginBottom: 22 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 5px' }}>Notes</p>
            <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.6 }}>{report.notes}</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, background: '#1175CC', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 28 28" fill="none">
                <defs><mask id="pdf-mask-footer"><rect x="9.5" y="0" width="9" height="11" rx="2.5" fill="white"/><rect x="0" y="7.5" width="28" height="14" rx="3.5" fill="white"/><rect x="9.5" y="20.5" width="9" height="7.5" rx="2.5" fill="white"/><polygon points="14,9 0.5,20.5 27.5,20.5" fill="black"/></mask></defs>
                <rect width="28" height="28" fill="white" mask="url(#pdf-mask-footer)"/>
              </svg>
            </div>
            <p style={{ fontSize: 9, color: '#CBD5E1', margin: 0 }}>Property Meld · Outcome-to-Pay · Internal Use Only</p>
          </div>
          <p style={{ fontSize: 9, color: '#CBD5E1', margin: 0 }}>Report ID: {report.id.slice(0, 16)}</p>
        </div>
      </div>
    );
  }
);

// ─── Format Card ─────────────────────────────────────────────────────────────

function FormatCard({ icon: Icon, title, description, action, onClick, disabled, disabledMsg, isInfo }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  disabled: boolean;
  disabledMsg?: string;
  isInfo?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
      <div className="w-10 h-10 rounded-xl bg-[#dceefa] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#1175CC]" />
      </div>
      <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5 flex-1">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isInfo ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#1175CC] text-white hover:bg-[#0d62b0]'
        }`}
      >
        {!isInfo && <Download className="w-4 h-4" />}
        {disabled && disabledMsg ? disabledMsg : action}
      </button>
    </div>
  );
}
