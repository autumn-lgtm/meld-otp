import { ArrowRight, BarChart2, Calculator, CheckCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';
const MELD_ACCENT = '#FFB41B';

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-12 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold mb-2" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </h2>
  );
}

function ThresholdRow({ color, label, range, meaning }: { color: string; label: string; range: string; meaning: string }) {
  const dot: Record<string, string> = { red: '#ef4444', yellow: '#f59e0b', green: '#22c55e', blue: '#1175CC' };
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 w-20 flex-shrink-0">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dot[color] }} />
        <span className="font-semibold text-sm" style={{ color: dot[color] }}>{label}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-mono font-semibold text-slate-700">{range}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{meaning}</p>
      </div>
    </div>
  );
}

export function Intro() {
  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>
      {/* Hero */}
      <div className="px-10 pt-12 pb-10" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
            Property Meld · Internal System
          </p>
          <h1 className="text-5xl font-black mb-4 text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Outcome-to-Pay
          </h1>
          <p className="text-xl mb-8 max-w-3xl" style={{ color: MELD_LIGHT }}>
            A transparent, measurable compensation framework that connects what Melders deliver directly to what they earn — no black boxes, no surprises.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: MELD_BLUE, color: 'white', fontFamily: 'Rubik, sans-serif' }}
            >
              <Calculator className="w-4 h-4" /> Open Calculator
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: 'Rubik, sans-serif' }}
            >
              <BarChart2 className="w-4 h-4" /> View Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/roles"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: 'Rubik, sans-serif' }}
            >
              Roles &amp; Metrics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-10 py-12">

        {/* What is OTP */}
        <Section>
          <SectionTitle>Three Numbers. One Chain.</SectionTitle>
          <p className="text-slate-500 text-base mb-6">
            PropertyMeld designed OTP from scratch — not borrowed from any external framework. The core insight: performance, pay, and market positioning aren't three separate conversations. They're a chain. OAP drives the pay conversation. CAP holds the company accountable to the plan. Ratio anchors it all to market reality. Misalign any link, and it shows up immediately.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: <TrendingUp className="w-6 h-6" />,
                label: 'OAP%',
                title: 'Did they earn it?',
                desc: 'A weighted average of role-specific outcomes — objective, transparent, no opinions. This is the Melder\'s number. It starts the conversation.',
                color: MELD_BLUE,
              },
              {
                icon: <Calculator className="w-6 h-6" />,
                label: 'CAP%',
                title: 'Did we pay it?',
                desc: 'Did the company follow through on the comp plan? Below 100% means the Melder outperformed their pay — a signal that demands a response.',
                color: '#0d4a6b',
              },
              {
                icon: <BarChart2 className="w-6 h-6" />,
                label: 'Ratio',
                title: 'Is it market-fair?',
                desc: 'Actual pay vs. external market rate. Our strategic lever — some roles sit intentionally below market, and the Ratio makes that honest and visible.',
                color: MELD_ACCENT,
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm flex flex-col">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white" style={{ background: card.color }}>
                  <span style={{ transform: 'scale(1.6)', display: 'block' }}>{card.icon}</span>
                </div>
                <div className="mb-3">
                  <span className="font-black text-3xl block mb-1" style={{ color: card.color, fontFamily: 'Poppins, sans-serif' }}>{card.label}</span>
                  <span className="font-bold text-slate-800 text-base">{card.title}</span>
                </div>
                <p className="text-slate-500 text-base leading-relaxed flex-1">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-6 rounded-xl border-l-4 text-base" style={{ background: `${MELD_BLUE}0d`, borderColor: MELD_BLUE }}>
            <strong style={{ color: MELD_DARK }}>Key distinction:</strong>
            <span className="text-slate-600"> Ratio answers to the <em>market</em>. CAP answers to the <em>internal plan</em>. Both matter. Neither replaces the other.</span>
          </div>
        </Section>

        {/* Health Thresholds */}
        <Section>
          <SectionTitle>Health Thresholds</SectionTitle>
          <p className="text-slate-500 text-base mb-5">
            Every metric resolves to a color based on attainment percentage. The thresholds differ by metric type.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: MELD_BLUE }}>OAP — Threshold: 90%</p>
              <ThresholdRow color="red" label="Red" range="0 – 89%" meaning="Below expectations" />
              <ThresholdRow color="yellow" label="Yellow" range="90 – 99%" meaning="Approaching target" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above target" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: MELD_BLUE }}>CAP% — Threshold: 90%</p>
              <ThresholdRow color="red" label="Red" range="0 – 89%" meaning="Below target compensation" />
              <ThresholdRow color="yellow" label="Yellow" range="90 – 99%" meaning="Approaching target" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above target comp" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: '#0d4a6b' }}>Comp Ratio — Threshold: 80%</p>
              <ThresholdRow color="red" label="Red" range="0 – 79%" meaning="Significant market gap" />
              <ThresholdRow color="yellow" label="Yellow" range="80 – 94%" meaning="Below market (may be intentional)" />
              <ThresholdRow color="green" label="Green" range="95%+" meaning="Competitive or above market" />
              <ThresholdRow color="blue" label="Blue" range="105%+" meaning="Intentionally above market" />
              <p className="text-xs text-slate-400 mt-3">BD and BSE are intentionally positioned below market — known, accepted design choice.</p>
            </div>
          </div>
        </Section>

        {/* The Formula */}
        <Section>
          <SectionTitle>The Formula</SectionTitle>
          <p className="text-slate-500 text-base mb-5">Every role ultimately resolves to the same universal pattern:</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
            <div className="space-y-4">
              <div className="font-mono text-base rounded-xl px-5 py-4" style={{ background: '#F1F1F1', color: MELD_DARK }}>
                Metric_Attainment = Actual / Target
              </div>
              <div className="font-mono text-base rounded-xl px-5 py-4" style={{ background: '#F1F1F1', color: MELD_DARK }}>
                OAP = <span style={{ color: MELD_BLUE }}>Σ</span>(Metric_Attainment × Weight) × 100
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-5">Optional guardrails: metric ceiling 150%, metric floor 0%. Applied consistently across all roles.</p>
          </div>
        </Section>

        {/* Performance Bands */}
        <Section>
          <SectionTitle>Performance Bands</SectionTitle>
          <p className="text-slate-500 text-base mb-5">Used across all roles and departments:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Below Expectations', range: '< 90%', color: '#ef4444', bg: '#fef2f2', note: 'Requires active coaching plan' },
              { label: 'Moderate', range: '90 – 99%', color: '#f59e0b', bg: '#fffbeb', note: 'Approaching target — monitor' },
              { label: 'High Performance', range: '100 – 110%', color: '#22c55e', bg: '#f0fdf4', note: 'At or above target — healthy' },
              { label: 'Exceptional', range: '> 110%', color: MELD_BLUE, bg: `${MELD_BLUE}10`, note: 'Recognition flag — no additional comp trigger' },
            ].map((band) => (
              <div key={band.label} className="rounded-2xl p-6 text-center border" style={{ background: band.bg, borderColor: band.color + '30' }}>
                <p className="text-2xl font-black mb-1.5" style={{ color: band.color, fontFamily: 'Poppins, sans-serif' }}>{band.range}</p>
                <p className="text-sm font-semibold text-slate-600">{band.label}</p>
                <p className="text-xs mt-1.5" style={{ color: band.color, opacity: 0.75 }}>{band.note}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-4">Note: Exceptional (110%+) flags the Melder for recognition. It does not change comp or review cadence — this is a deliberate design choice.</p>
        </Section>

        {/* 2025 Context */}
        <Section>
          <SectionTitle>2025 Performance Context</SectionTitle>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { stat: '+20 pts', label: 'Company-wide OAP growth', sub: '~72.6% → ~93% over 2025', color: MELD_BLUE },
              { stat: '+47 pts', label: 'BD turnaround Q1 → Q4', sub: 'Story of the year', color: '#22c55e' },
              { stat: '100%+', label: 'Customer Support annual', sub: 'Model team across Meld', color: MELD_ACCENT },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
                <p className="text-4xl font-black mb-2" style={{ color: s.color, fontFamily: 'Poppins, sans-serif' }}>{s.stat}</p>
                <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="rounded-2xl p-10 text-center" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, ${MELD_BLUE} 100%)` }}>
          <h2 className="text-3xl font-black text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Ready to run a report?</h2>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: MELD_LIGHT }}>
            Add your Melders, enter actuals, and instantly see OAP, CAP%, and Compensation Ratio with health indicators.
          </p>
          <div className="flex justify-center flex-wrap gap-4">
            <Link
              to="/melders"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: 'white', color: MELD_DARK }}
            >
              Add Melders
            </Link>
            <Link
              to="/calculator"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: MELD_BLUE, color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}
            >
              <Calculator className="w-4 h-4" /> Open Calculator
            </Link>
            <Link
              to="/roles"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
            >
              View Roles &amp; Metrics
            </Link>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Internal use only · Property Meld · Outcome-to-Pay System</span>
        </div>

      </div>
    </div>
  );
}
