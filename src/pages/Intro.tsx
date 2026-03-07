import { ArrowRight, BarChart2, Calculator, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';
const MELD_ACCENT = '#FFB41B';

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-10 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold mb-1" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </h2>
  );
}

function MetricPill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: color + '18', color, border: `1.5px solid ${color}33` }}>
      {label}
    </span>
  );
}

function ThresholdRow({ color, label, range, meaning }: { color: string; label: string; range: string; meaning: string }) {
  const dot: Record<string, string> = { red: '#ef4444', yellow: '#f59e0b', green: '#22c55e' };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dot[color] }} />
      <span className="font-semibold text-sm w-20 flex-shrink-0" style={{ color: dot[color] }}>{label}</span>
      <span className="text-sm font-mono text-slate-600 w-28 flex-shrink-0">{range}</span>
      <span className="text-sm text-slate-500">{meaning}</span>
    </div>
  );
}

function RoleCard({ title, metrics }: { title: string; metrics: { name: string; weight: string; target: string }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100" style={{ background: MELD_DARK }}>
        <p className="text-white font-semibold text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wide">
            <th className="text-left px-5 py-2 font-semibold">Metric</th>
            <th className="text-right px-5 py-2 font-semibold">Weight</th>
            <th className="text-right px-5 py-2 font-semibold">Default Target</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.name} className="border-t border-slate-50">
              <td className="px-5 py-2 font-medium text-slate-800">{m.name}</td>
              <td className="px-5 py-2 text-right font-mono text-slate-600">{m.weight}</td>
              <td className="px-5 py-2 text-right font-mono" style={{ color: MELD_BLUE }}>{m.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Intro() {
  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>
      {/* Hero */}
      <div className="px-8 pt-10 pb-8" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · Internal System
          </p>
          <h1 className="text-4xl font-black mb-3 text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Outcome-to-Pay
          </h1>
          <p className="text-lg mb-6 max-w-2xl" style={{ color: MELD_LIGHT }}>
            A transparent, measurable compensation framework that connects what Melders deliver directly to what they earn — no black boxes, no surprises.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: MELD_BLUE, color: 'white', fontFamily: 'Rubik, sans-serif' }}
            >
              <Calculator className="w-4 h-4" /> Open Calculator
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: 'Rubik, sans-serif' }}
            >
              <BarChart2 className="w-4 h-4" /> View Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* What is OTP */}
        <Section>
          <SectionTitle>What is the OTP System?</SectionTitle>
          <p className="text-slate-500 text-sm mb-5">
            PropertyMeld built the Outcome-to-Pay (OTP) system internally — it's not derived from any market framework. It gives every Melder and their manager a shared, auditable view of three things at once:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <TrendingUp className="w-5 h-5" />,
                label: 'OA%',
                title: 'Outcome Attainment',
                desc: 'Did the Melder hit their performance targets? Measured as a weighted average of role-specific metrics.',
                color: MELD_BLUE,
              },
              {
                icon: <Calculator className="w-5 h-5" />,
                label: 'CAP%',
                title: 'Compensation Attainment',
                desc: 'Did the company pay what it planned to pay, relative to the internal comp plan? Measures system integrity.',
                color: '#0d4a6b',
              },
              {
                icon: <BarChart2 className="w-5 h-5" />,
                label: 'Ratio',
                title: 'Compensation Ratio',
                desc: 'How does actual pay compare to market rate? A strategic lever — intentional below-market positioning is visible here.',
                color: MELD_ACCENT,
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: card.color }}>
                  {card.icon}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-lg" style={{ color: card.color, fontFamily: 'Poppins, sans-serif' }}>{card.label}</span>
                  <span className="font-semibold text-slate-800 text-sm">{card.title}</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl border-l-4 text-sm" style={{ background: `${MELD_BLUE}0d`, borderColor: MELD_BLUE }}>
            <strong style={{ color: MELD_DARK }}>Critical distinction:</strong>
            <span className="text-slate-600"> Compensation Ratio is measured against <em>market</em>. CAP% is measured against the <em>internal plan</em>. Never conflate these.</span>
          </div>
        </Section>

        {/* Health Thresholds */}
        <Section>
          <SectionTitle>Health Thresholds</SectionTitle>
          <p className="text-slate-500 text-sm mb-4">
            Every metric resolves to a color based on attainment percentage. The thresholds differ by metric type.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: MELD_BLUE }}>OA% &amp; CAP% — Threshold: 90%</p>
              <ThresholdRow color="red" label="Red" range="0 – 89%" meaning="Below expectations" />
              <ThresholdRow color="yellow" label="Yellow" range="90 – 99%" meaning="Approaching target" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above target" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#0d4a6b' }}>Comp Ratio — Threshold: 85%</p>
              <ThresholdRow color="red" label="Red" range="0 – 84%" meaning="Significant market gap" />
              <ThresholdRow color="yellow" label="Yellow" range="85 – 99%" meaning="Below market (may be intentional)" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above market" />
              <p className="text-xs text-slate-400 mt-3">BD and BSE are intentionally positioned below market — this is a known, accepted design choice.</p>
            </div>
          </div>
        </Section>

        {/* The Formula */}
        <Section>
          <SectionTitle>The Formula</SectionTitle>
          <p className="text-slate-500 text-sm mb-4">
            Every role ultimately resolves to the same universal pattern:
          </p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="space-y-3">
              <div className="font-mono text-sm rounded-xl px-4 py-3" style={{ background: '#F1F1F1', color: MELD_DARK }}>
                Metric_Attainment = Actual / Target
              </div>
              <div className="font-mono text-sm rounded-xl px-4 py-3" style={{ background: '#F1F1F1', color: MELD_DARK }}>
                OAP = <span style={{ color: MELD_BLUE }}>Σ</span>(Metric_Attainment × Weight) × 100
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Optional guardrails: metric ceiling 150%, metric floor 0%. Applied consistently across all roles.</p>
          </div>
        </Section>

        {/* Performance Bands */}
        <Section>
          <SectionTitle>Performance Bands</SectionTitle>
          <p className="text-slate-500 text-sm mb-4">Used across all roles and departments:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Below Expectations', range: '< 90%', color: '#ef4444', bg: '#fef2f2' },
              { label: 'Moderate', range: '90 – 99%', color: '#f59e0b', bg: '#fffbeb' },
              { label: 'High Performance', range: '100 – 110%', color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Exceptional', range: '> 110%', color: MELD_BLUE, bg: `${MELD_BLUE}10` },
            ].map((band) => (
              <div key={band.label} className="rounded-2xl p-4 text-center border" style={{ background: band.bg, borderColor: band.color + '30' }}>
                <p className="text-xl font-black mb-1" style={{ color: band.color, fontFamily: 'Poppins, sans-serif' }}>{band.range}</p>
                <p className="text-xs font-semibold text-slate-600">{band.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Roles */}
        <Section>
          <SectionTitle>Roles Covered</SectionTitle>
          <p className="text-slate-500 text-sm mb-5">
            OTP covers the following teams. Product, Engineering, and Data are excluded.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {['Customer Onboarding', 'Customer Success', 'Business Development', 'Business Solutions', 'Marketing', 'Customer Support', 'People Ops'].map((r) => (
              <MetricPill key={r} label={r} color={MELD_BLUE} />
            ))}
          </div>
          <div className="space-y-4">
            <RoleCard
              title="Business Development (BDA / BDR / Sr. BDR)"
              metrics={[
                { name: 'SQL Production', weight: '50%', target: '8 SQLs/mo' },
                { name: 'Value Demonstrated', weight: '50%', target: '$2K – $5K/mo' },
              ]}
            />
            <RoleCard
              title="Business Solutions Executive (Assoc / BSE / Sr. BSE)"
              metrics={[
                { name: 'Closed MRR', weight: '75%', target: '$4,500 – $6,500/mo' },
                { name: 'Outbound Conversion Rate', weight: '12.5%', target: '18% – 20%' },
                { name: 'Inbound Conversion Rate', weight: '12.5%', target: '25% – 30%' },
              ]}
            />
            <RoleCard
              title="Customer Success Manager (SMB)"
              metrics={[
                { name: 'Gross Revenue Retention (GRR)', weight: '65%', target: '~80%' },
                { name: 'Upsell Closed Revenue (UCR)', weight: '35%', target: '$2,500/mo' },
              ]}
            />
            <RoleCard
              title="Customer Success Manager (Mid Market)"
              metrics={[
                { name: 'Gross Revenue Retention (GRR)', weight: '80%', target: 'Team-specific' },
                { name: 'Net Revenue Retention (NRR)', weight: '20%', target: 'Team-specific' },
              ]}
            />
            <RoleCard
              title="Customer Onboarding Manager"
              metrics={[
                { name: '14-Day Conversion Rate (avg over quarter)', weight: '50%', target: 'Team-specific' },
                { name: '90-Day Conversion Rate', weight: '50%', target: 'Team-specific' },
              ]}
            />
          </div>
        </Section>

        {/* 2025 Context */}
        <Section>
          <SectionTitle>2025 Performance Context</SectionTitle>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { stat: '+20 pts', label: 'Company-wide OAP growth', sub: '~72.6% → ~93% over 2025', color: MELD_BLUE },
              { stat: '+47 pts', label: 'BD turnaround Q1 → Q4', sub: 'Story of the year', color: '#22c55e' },
              { stat: '100%+', label: 'Customer Support annual', sub: 'Model team across Meld', color: MELD_ACCENT },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
                <p className="text-3xl font-black mb-1" style={{ color: s.color, fontFamily: 'Poppins, sans-serif' }}>{s.stat}</p>
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl border-l-4 text-sm" style={{ background: '#fffbeb', borderColor: MELD_ACCENT }}>
            <strong style={{ color: '#92400e' }}>Note on Marketing Q1:</strong>
            <span className="text-slate-600"> Q1 numbers reflect a measurement methodology change, not a true performance decline — always contextualize this when reviewing data.</span>
          </div>
        </Section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, ${MELD_BLUE} 100%)` }}>
          <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Ready to run a report?</h2>
          <p className="text-sm mb-6" style={{ color: MELD_LIGHT }}>
            Add your Melders, enter actuals, and instantly see OAP, CAP%, and Compensation Ratio with health indicators.
          </p>
          <div className="flex justify-center flex-wrap gap-3">
            <Link
              to="/melders"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: 'white', color: MELD_DARK }}
            >
              <Users className="w-4 h-4" /> Add Melders
            </Link>
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: MELD_BLUE, color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}
            >
              <Calculator className="w-4 h-4" /> Open Calculator
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Internal use only · Property Meld · Outcome-to-Pay System</span>
        </div>

      </div>
    </div>
  );
}
