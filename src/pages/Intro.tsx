import { ArrowRight, BarChart2, Calculator, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';
const MELD_GOLD = '#FFB41B';
function FlywheelDiagram() {
  const CX = 200, CY = 200, ORBIT = 118, NODE_R = 40;
  const nodes = [
    { angle: -90, label: 'OAP', sub: 'Performance', color: MELD_BLUE },
    { angle: 30,  label: 'CAP', sub: 'Pay Promise',  color: '#0d4a6b' },
    { angle: 150, label: 'Ratio', sub: 'Market',     color: MELD_GOLD },
  ];
  const pts = nodes.map(n => ({
    ...n,
    x: CX + ORBIT * Math.cos(n.angle * Math.PI / 180),
    y: CY + ORBIT * Math.sin(n.angle * Math.PI / 180),
  }));
  const arrows = pts.map((src, i) => {
    const tgt = pts[(i + 1) % pts.length];
    const dx = tgt.x - src.x, dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist, uy = dy / dist;
    const ax = src.x + (NODE_R + 6) * ux, ay = src.y + (NODE_R + 6) * uy;
    const bx = tgt.x - (NODE_R + 10) * ux, by = tgt.y - (NODE_R + 10) * uy;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const cmx = mx - CX, cmy = my - CY;
    const clen = Math.sqrt(cmx * cmx + cmy * cmy);
    const cpx = mx + 22 * cmx / clen, cpy = my + 22 * cmy / clen;
    return { ax, ay, bx, by, cpx, cpy, color: src.color };
  });
  const arcLabels = [
    { label: 'earns', i: 0 },
    { label: 'validated by', i: 1 },
    { label: 'sustains', i: 2 },
  ];
  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-xs mx-auto select-none">
      <circle cx={CX} cy={CY} r={ORBIT} fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="5 5" />
      <defs>
        {arrows.map((a, i) => (
          <marker key={i} id={`ah-${i}`} markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L9,3.5 z" fill={a.color} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => (
        <path key={i} d={`M ${a.ax} ${a.ay} Q ${a.cpx} ${a.cpy} ${a.bx} ${a.by}`}
          fill="none" stroke={a.color} strokeWidth="2.5" strokeLinecap="round"
          markerEnd={`url(#ah-${i})`} opacity="0.9" />
      ))}
      {arrows.map((a, lbl) => {
        const mx = (a.ax + a.bx) / 2, my = (a.ay + a.by) / 2;
        const cmx = mx - CX, cmy = my - CY;
        const clen = Math.sqrt(cmx * cmx + cmy * cmy);
        const lx = mx + 34 * cmx / clen, ly = my + 34 * cmy / clen;
        return (
          <text key={lbl} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill={arrows[lbl].color} fontSize="9.5" fontWeight="600" fontFamily="Rubik, sans-serif" opacity="0.9">
            {arcLabels[lbl].label}
          </text>
        );
      })}
      {pts.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={NODE_R} fill={n.color} />
          <circle cx={n.x} cy={n.y} r={NODE_R} fill="none" stroke="white" strokeWidth="1.5" opacity="0.25" />
          <text x={n.x} y={n.y - 5} textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize="13.5" fontWeight="800" fontFamily="Poppins, sans-serif">{n.label}</text>
          <text x={n.x} y={n.y + 10} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.75)" fontSize="8.5" fontFamily="Rubik, sans-serif">{n.sub}</text>
        </g>
      ))}
      <text x={CX} y={CY - 9} textAnchor="middle" dominantBaseline="middle"
        fill={MELD_DARK} fontSize="10.5" fontWeight="800" fontFamily="Rubik, sans-serif" letterSpacing="0.08em">TRUE</text>
      <text x={CX} y={CY + 7} textAnchor="middle" dominantBaseline="middle"
        fill={MELD_DARK} fontSize="10.5" fontWeight="800" fontFamily="Rubik, sans-serif" letterSpacing="0.08em">HEALTH</text>
    </svg>
  );
}

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
            A self-reinforcing cycle: performance earns pay, pay gets honored, pay stays market-fair, and fair pay sustains performance. OTP makes that cycle visible — and keeps everyone accountable to their part of it.
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

        {/* What is OTP — Flywheel */}
        <Section>
          <SectionTitle>Three Questions. A Cycle That Compounds.</SectionTitle>
          <p className="text-slate-500 text-base mb-6">
            OTP isn't a scorecard — it's a <strong className="text-slate-700">self-reinforcing cycle.</strong> Performance earns pay. The company honors it. The market validates it. And when all three are healthy, people stay, engage, and perform again. Break any one link and the flywheel slows. Keep all three strong and it compounds.
          </p>

          <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
            <FlywheelDiagram />
            <div className="space-y-5">
              {[
                {
                  label: 'OAP', title: 'Did they earn it?',
                  desc: 'A weighted composite of role-specific outcomes. No manager opinion — just what the Melder actually produced, resolved to a single number. This is where the cycle starts.',
                  color: MELD_BLUE, owner: 'Owner: the Melder',
                },
                {
                  label: 'CAP%', title: 'Did we pay it?',
                  desc: 'Did the company honor the plan? If OAP is 100% and CAP is 85%, we underpaid. CAP is accountability — not for the Melder, but for the company.',
                  color: '#0d4a6b', owner: 'Owner: the company',
                },
                {
                  label: 'Ratio', title: 'Is it market-fair?',
                  desc: 'Actual pay as a percentage of market rate. Ratio closes the loop — market-fair pay sustains the motivation that drives the next cycle of performance.',
                  color: MELD_GOLD, owner: 'Owner: the market',
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-black"
                    style={{ background: item.color, fontFamily: 'Poppins, sans-serif' }}>
                    {item.label.replace('%', '')}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: item.color }}>{item.owner}</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Definition cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              {
                abbr: 'OAP',
                full: 'Outcome Attainment Percentage',
                owner: 'Owner: the Melder',
                color: MELD_BLUE,
                formula: 'OAP = Σ(metric_attainment × weight) × 100',
                definition: 'A weighted composite of role-specific outcome metrics. Each metric is scored as actual ÷ target, capped at 150% and floored at 0%, then multiplied by its assigned weight. The result is a single number — 0 to 150+ — that reflects what the Melder actually produced, with no subjective input.',
              },
              {
                abbr: 'CAP',
                full: 'Compensation Attainment Percentage',
                owner: 'Owner: the company',
                color: '#0d4a6b',
                formula: 'CAP = actual_pay ÷ target_comp × 100',
                definition: "The percentage of target compensation actually paid. If a Melder's target comp is $8,000/mo and they received $7,200, CAP is 90%. This metric holds the company accountable — not the Melder. It answers: did we honor the plan we set?",
              },
              {
                abbr: 'Ratio',
                full: 'Compensation Ratio',
                owner: 'Owner: the market',
                color: MELD_GOLD,
                formula: 'Ratio = actual_pay ÷ market_rate × 100',
                definition: 'Actual total compensation as a percentage of the external market rate for that role. A ratio of 85% means the person is paid 15% below market. Not every role targets 100% — some are intentionally positioned below. Ratio makes that strategy explicit rather than hidden.',
              },
            ].map((card) => (
              <div key={card.abbr} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: card.color }}>
                  <div>
                    <span className="text-xl font-black text-white block leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>{card.abbr}</span>
                    <span className="text-xs text-white/80 font-medium">{card.full}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">{card.owner.replace('Owner: ', '')}</span>
                </div>
                <div className="px-5 py-4">
                  <div className="font-mono text-xs rounded-lg px-3 py-2 mb-3 text-slate-600" style={{ background: '#F1F1F1' }}>{card.formula}</div>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.definition}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-xl border-l-4 text-base" style={{ background: `${MELD_BLUE}0d`, borderColor: MELD_BLUE }}>
            <strong style={{ color: MELD_DARK }}>The realization:</strong>
            <span className="text-slate-600"> Performance, pay, and market positioning were always connected inside compensation. Most systems treat them separately. OTP just makes the cycle visible — and keeps everyone accountable to their part of it.</span>
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
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: MELD_BLUE }}>OAP — Threshold: 90%</p>
              <p className="text-xs text-slate-400 mb-4">Outcome Attainment Percentage</p>
              <ThresholdRow color="red" label="Red" range="0 – 89%" meaning="Below expectations" />
              <ThresholdRow color="yellow" label="Yellow" range="90 – 99%" meaning="Approaching target" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above target" />
              <ThresholdRow color="blue" label="Blue" range="110%+" meaning="Exceptional performance" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: MELD_BLUE }}>CAP% — Threshold: 90%</p>
              <p className="text-xs text-slate-400 mb-4">Compensation Attainment Percentage</p>
              <ThresholdRow color="red" label="Red" range="0 – 89%" meaning="Below target compensation" />
              <ThresholdRow color="yellow" label="Yellow" range="90 – 99%" meaning="Approaching target" />
              <ThresholdRow color="green" label="Green" range="100%+" meaning="At or above target comp" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#0d4a6b' }}>Comp Ratio — Threshold: 80%</p>
              <p className="text-xs text-slate-400 mb-4">Compensation Ratio (Actual vs. Market)</p>
              <ThresholdRow color="red" label="Red" range="0 – 79%" meaning="Significant market gap" />
              <ThresholdRow color="yellow" label="Yellow" range="80 – 94%" meaning="Below market (may be intentional)" />
              <ThresholdRow color="green" label="Green" range="95%+" meaning="Competitive or above market" />
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
              { label: 'Exceptional', range: '> 110%', color: MELD_BLUE, bg: `${MELD_BLUE}10`, note: 'Recognition flag' },
            ].map((band) => (
              <div key={band.label} className="rounded-2xl p-6 text-center border" style={{ background: band.bg, borderColor: band.color + '30' }}>
                <p className="text-2xl font-black mb-1.5" style={{ color: band.color, fontFamily: 'Poppins, sans-serif' }}>{band.range}</p>
                <p className="text-sm font-semibold text-slate-600">{band.label}</p>
                <p className="text-xs mt-1.5" style={{ color: band.color, opacity: 0.75 }}>{band.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 2025 Context */}
        <Section>
          <SectionTitle>2025 Performance Context</SectionTitle>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { stat: '+20 pts', label: 'Company-wide OAP growth', sub: '~72.6% → ~93% over 2025', color: MELD_BLUE },
              { stat: '+47 pts', label: 'BD turnaround Q1 → Q4', sub: 'Story of the year', color: '#22c55e' },
              { stat: '100%+', label: 'Customer Support annual', sub: 'Model team across Meld', color: MELD_BLUE },
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
