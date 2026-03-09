import { ArrowRight, Award, BarChart2, BarChart3, Calculator, CheckCircle, Target, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';
const MELD_GOLD = '#FFB41B';
function FlywheelDiagram() {
  // Globe geometry
  const CX = 215, CY = 192, R = 107;
  const GREEN = '#22c55e';
  const ey = R * 0.27; // equatorial ellipse squish

  // Node positions: equilateral triangle on sphere surface
  const deg = (d: number) => d * Math.PI / 180;
  const oap   = { x: CX,                       y: CY - R };                            // top    –90°
  const cap   = { x: CX + R * Math.cos(deg(30)), y: CY + R * Math.sin(deg(30)) };      // right   30°
  const ratio = { x: CX + R * Math.cos(deg(150)), y: CY + R * Math.sin(deg(150)) };    // left   150°

  return (
    <svg viewBox="0 0 460 375" className="w-full select-none" style={{ filter: 'drop-shadow(0 4px 32px rgba(17,117,204,0.22))' }}>
      <defs>
        <style>{`
          @keyframes fw-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <filter id="fw-fog" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="fw-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <marker id="fw-ab" markerWidth="7" markerHeight="7" refX="5.5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L7,2.5 z" fill={MELD_BLUE} />
        </marker>
        <marker id="fw-ad" markerWidth="7" markerHeight="7" refX="5.5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L7,2.5 z" fill="#0d4a6b" />
        </marker>
        <marker id="fw-ag" markerWidth="7" markerHeight="7" refX="5.5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L7,2.5 z" fill={MELD_GOLD} />
        </marker>
      </defs>

      {/* ── Atmosphere ── */}
      <circle cx={CX} cy={CY} r={R + 48} fill="rgba(17,117,204,0.08)" filter="url(#fw-fog)" />
      <circle cx={CX} cy={CY} r={R + 20} fill="none" stroke={MELD_BLUE} strokeWidth="0.5" opacity="0.14" />

      {/* ── Node colour halos ── */}
      <circle cx={oap.x}   cy={oap.y}   r={38} fill={MELD_BLUE}  opacity="0.18" filter="url(#fw-glow)" />
      <circle cx={cap.x}   cy={cap.y}   r={38} fill="#0d4a6b"    opacity="0.18" filter="url(#fw-glow)" />
      <circle cx={ratio.x} cy={ratio.y} r={38} fill={MELD_GOLD}  opacity="0.18" filter="url(#fw-glow)" />

      {/* ── Globe back hemisphere (dashed) ── */}
      {/* Back equatorial arc (upper half) */}
      <path d={`M ${CX - R} ${CY} A ${R} ${ey} 0 0 0 ${CX + R} ${CY}`}
        fill="none" stroke="rgba(176,227,255,0.28)" strokeWidth="1.1" strokeDasharray="5 4" />
      {/* Back vertical meridian (left half) */}
      <path d={`M ${CX} ${CY - R} A ${R * 0.27} ${R} 0 0 0 ${CX} ${CY + R}`}
        fill="none" stroke="rgba(176,227,255,0.18)" strokeWidth="1" strokeDasharray="5 4" />

      {/* ── Animated rotating great circle ── */}
      <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'fw-orbit 30s linear infinite' }}>
        <ellipse cx={CX} cy={CY} rx={R} ry={R * 0.26}
          fill="none" stroke="rgba(176,227,255,0.18)" strokeWidth="1"
          strokeDasharray="6 5"
          transform={`rotate(20, ${CX}, ${CY})`} />
      </g>

      {/* ── Main sphere outline ── */}
      <circle cx={CX} cy={CY} r={R}
        fill="none" stroke="rgba(176,227,255,0.58)" strokeWidth="1.8" />

      {/* ── Globe front hemisphere (solid) ── */}
      {/* Front equatorial arc (lower half) */}
      <path d={`M ${CX - R} ${CY} A ${R} ${ey} 0 0 1 ${CX + R} ${CY}`}
        fill="none" stroke="rgba(176,227,255,0.48)" strokeWidth="1.4" />
      {/* Front vertical meridian (right half) */}
      <path d={`M ${CX} ${CY - R} A ${R * 0.27} ${R} 0 0 1 ${CX} ${CY + R}`}
        fill="none" stroke="rgba(176,227,255,0.28)" strokeWidth="1.1" />

      {/* ── Flow arcs between nodes (on sphere surface, animated) ── */}
      {/* OAP → CAP */}
      <path d={`M ${oap.x} ${oap.y} A ${R} ${R} 0 0 1 ${cap.x} ${cap.y}`}
        fill="none" stroke={MELD_BLUE} strokeWidth="2" strokeDasharray="7 5"
        markerEnd="url(#fw-ab)" opacity="0.85">
        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
      </path>
      {/* CAP → Ratio */}
      <path d={`M ${cap.x} ${cap.y} A ${R} ${R} 0 0 1 ${ratio.x} ${ratio.y}`}
        fill="none" stroke={MELD_GOLD} strokeWidth="2" strokeDasharray="7 5"
        markerEnd="url(#fw-ag)" opacity="0.85">
        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
      </path>
      {/* Ratio → OAP */}
      <path d={`M ${ratio.x} ${ratio.y} A ${R} ${R} 0 0 1 ${oap.x} ${oap.y}`}
        fill="none" stroke="#0d4a6b" strokeWidth="2" strokeDasharray="7 5"
        markerEnd="url(#fw-ad)" opacity="0.85">
        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" begin="1.0s" />
      </path>

      {/* ── Arc edge labels ── */}
      {/* "earns" — right arc midpoint */}
      <rect x={CX + R * 0.88 - 22} y={CY - R * 0.52 - 18} width="44" height="16" rx="4" fill="rgba(17,117,204,0.22)" />
      <text x={CX + R * 0.88} y={CY - R * 0.52 - 7}
        textAnchor="middle" fill={MELD_LIGHT} fontSize="10.5" fontWeight="700"
        fontFamily="Rubik, sans-serif" letterSpacing="0.09em">earns</text>
      {/* "market-tested" — bottom arc */}
      <rect x={CX - 44} y={CY + R + 6} width="88" height="16" rx="4" fill="rgba(255,180,27,0.2)" />
      <text x={CX} y={CY + R + 17}
        textAnchor="middle" fill={MELD_GOLD} fontSize="10.5" fontWeight="700"
        fontFamily="Rubik, sans-serif" letterSpacing="0.06em">market-tested</text>
      {/* "sustains" — left arc midpoint */}
      <rect x={CX - R * 0.88 - 28} y={CY - R * 0.52 - 18} width="56" height="16" rx="4" fill="rgba(176,227,255,0.15)" />
      <text x={CX - R * 0.88} y={CY - R * 0.52 - 7}
        textAnchor="middle" fill={MELD_LIGHT} fontSize="10.5" fontWeight="700"
        fontFamily="Rubik, sans-serif" letterSpacing="0.09em">sustains</text>

      {/* ── Center TRUE HEALTH (pulsing) ── */}
      <circle cx={CX} cy={CY} r="20" fill={GREEN} opacity="0.10">
        <animate attributeName="r" values="16;26;16" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
        <animate attributeName="opacity" values="0.20;0.05;0.20" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
      </circle>
      <text x={CX} y={CY - 7} textAnchor="middle" dominantBaseline="middle"
        fill={GREEN} fontSize="11" fontWeight="800" fontFamily="Rubik, sans-serif" letterSpacing="0.12em">TRUE</text>
      <text x={CX} y={CY + 7} textAnchor="middle" dominantBaseline="middle"
        fill={GREEN} fontSize="11" fontWeight="800" fontFamily="Rubik, sans-serif" letterSpacing="0.12em">HEALTH</text>

      {/* ══════════════════════════════════════════════
          NODE LABELS — globe tag style (ref-image inspired):
          bullet dot/square → short leader → pill/rect tag
          ══════════════════════════════════════════════ */}

      {/* ── OAP (top) — pill tag extending upward ── */}
      <circle cx={oap.x} cy={oap.y} r={5} fill={MELD_BLUE} />
      <circle cx={oap.x} cy={oap.y} r={5} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1={oap.x} y1={oap.y - 6} x2={oap.x} y2={oap.y - 26} stroke={MELD_BLUE} strokeWidth="1.2" opacity="0.6" />
      {/* Pill */}
      <rect x={oap.x - 40} y={oap.y - 50} width="80" height="22" rx="11" fill={MELD_BLUE} />
      {/* Square bullet inside pill */}
      <rect x={oap.x - 30} y={oap.y - 43} width="7" height="7" fill="white" opacity="0.9" rx="1" />
      <text x={oap.x - 17} y={oap.y - 39} dominantBaseline="middle"
        fill="white" fontSize="9.5" fontWeight="700" fontFamily="Rubik, sans-serif" letterSpacing="0.12em">OAP</text>
      <text x={oap.x} y={oap.y - 57} textAnchor="middle"
        fill={MELD_LIGHT} fontSize="9" fontWeight="600" fontFamily="Rubik, sans-serif" letterSpacing="0.08em" opacity="0.9">PERFORMANCE</text>

      {/* ── CAP (bottom-right) — rect tag extending right ── */}
      <rect x={cap.x - 4} y={cap.y - 4} width="8" height="8" fill="#0d4a6b" rx="1" />
      <rect x={cap.x - 4} y={cap.y - 4} width="8" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" rx="1" />
      <line x1={cap.x + 5} y1={cap.y} x2={cap.x + 20} y2={cap.y} stroke="#0d4a6b" strokeWidth="1.2" opacity="0.6" />
      {/* Rect tag */}
      <rect x={cap.x + 20} y={cap.y - 12} width="84" height="24" rx="3" fill="#0d4a6b" />
      <rect x={cap.x + 29} y={cap.y - 4} width="7" height="7" fill={MELD_BLUE} rx="1" />
      <text x={cap.x + 43} y={cap.y} dominantBaseline="middle"
        fill="white" fontSize="9.5" fontWeight="700" fontFamily="Rubik, sans-serif" letterSpacing="0.12em">CAP</text>
      <text x={cap.x + 62} y={cap.y + 32} textAnchor="middle"
        fill={MELD_LIGHT} fontSize="9" fontWeight="600" fontFamily="Rubik, sans-serif" letterSpacing="0.06em" opacity="0.9">PAY PROMISE</text>

      {/* ── RATIO (bottom-left) — rect tag extending left ── */}
      <rect x={ratio.x - 4} y={ratio.y - 4} width="8" height="8" fill={MELD_GOLD} rx="1" />
      <rect x={ratio.x - 4} y={ratio.y - 4} width="8" height="8" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" rx="1" />
      <line x1={ratio.x - 5} y1={ratio.y} x2={ratio.x - 20} y2={ratio.y} stroke={MELD_GOLD} strokeWidth="1.2" opacity="0.6" />
      {/* Rect tag (extends left) */}
      <rect x={ratio.x - 104} y={ratio.y - 12} width="84" height="24" rx="3" fill={MELD_GOLD} />
      <rect x={ratio.x - 96} y={ratio.y - 4} width="7" height="7" fill={MELD_DARK} rx="1" />
      <text x={ratio.x - 82} y={ratio.y} dominantBaseline="middle"
        fill={MELD_DARK} fontSize="9.5" fontWeight="700" fontFamily="Rubik, sans-serif" letterSpacing="0.12em">RATIO</text>
      <text x={ratio.x - 62} y={ratio.y + 32} textAnchor="middle"
        fill={MELD_DARK} fontSize="9" fontWeight="700" fontFamily="Rubik, sans-serif" letterSpacing="0.06em" opacity="0.85">MARKET</text>
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
      {/* Hero — video background */}
      <div className="relative px-10 pt-14 pb-12 overflow-hidden" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}>
        {/* Aerial neighborhood video — silently hidden if CDN rejects */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.18, filter: 'saturate(0.3) brightness(0.6)' }}
          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        >
          <source src="https://videos.pexels.com/video-files/5031099/5031099-hd_1280_720_25fps.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay keeps text readable over video */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${MELD_DARK}d0 0%, #0d4a6bc8 55%, ${MELD_BLUE}88 100%)` }} />
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Two-column: text left, flywheel right */}
          <div className="grid md:grid-cols-2 gap-10 items-center mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: MELD_LIGHT, fontFamily: 'Rubik, sans-serif' }}>
                Property Meld · Internal System
              </p>
              <h1 className="text-5xl font-black mb-5 text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Outcome-to-Pay
              </h1>
              <p className="text-xl mb-8 leading-relaxed" style={{ color: MELD_LIGHT }}>
                Performance, pay, and market positioning are always connected. OTP makes that visible — so you can diagnose drift before it becomes a problem.
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

            {/* Flywheel — large, in the hero */}
            <div className="flex items-center justify-center">
              <div className="w-full">
                <FlywheelDiagram />
              </div>
            </div>
          </div>

          {/* What OTP connects */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Target,     title: 'Performance',     desc: "Who's delivering \u2014 and by how much",               color: MELD_LIGHT, to: '/dashboard' },
              { icon: DollarSign, title: 'Comp Plans',      desc: 'Are we honoring what we promised?',                     color: MELD_GOLD,  to: '/comp-plans' },
              { icon: Award,      title: 'Realized Reward', desc: 'Did earned performance translate to real pay?',          color: MELD_LIGHT, to: '/history' },
              { icon: Users,      title: 'Role Design',     desc: 'What does good actually look like?',                    color: MELD_GOLD,  to: '/roles' },
              { icon: TrendingUp, title: 'Market Position', desc: 'Are we losing people to better offers?',                color: MELD_LIGHT, to: '/melders' },
              { icon: BarChart3,  title: 'Trend Visibility',desc: 'Is the flywheel accelerating or slowing down?',         color: MELD_GOLD,  to: '/trends' },
            ].map(({ icon: Icon, title, desc, color, to }) => (
              <Link key={title} to={to} className="rounded-xl px-4 py-3 block transition-all hover:scale-[1.02] hover:bg-white/15 active:scale-[0.98]" style={{ background: 'rgba(255,255,255,0.08)', borderTop: `2px solid ${color}40` }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span className="text-sm font-bold" style={{ color, fontFamily: 'Poppins, sans-serif' }}>{title}</span>
                </div>
                <p className="text-xs leading-snug" style={{ color: 'rgba(176,227,255,0.7)' }}>{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-10 py-12">

        {/* What is OTP — Flywheel */}
        <Section>
          <SectionTitle>How it works</SectionTitle>
          <p className="text-slate-500 text-base mb-6">
            Three numbers. Each one answers a different question — and a different person owns the answer. When all three are healthy, people stay, perform, and grow. When one breaks, you know exactly where to look.
          </p>

          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              {
                label: 'OAP', title: 'Did they earn it?',
                desc: 'A weighted composite of role-specific outcomes. No manager opinion — just what the Melder actually produced, resolved to a single number.',
                color: MELD_BLUE, owner: 'Owner: the Melder',
              },
              {
                label: 'CAP', title: 'Did we pay it?',
                desc: 'Did the company honor the plan? If OAP is 100% and CAP is 85%, we underpaid. CAP is accountability — not for the Melder, but for the company.',
                color: '#0d4a6b', owner: 'Owner: the company',
              },
              {
                label: 'Ratio', title: 'Is it market-fair?',
                desc: 'Actual pay as a percentage of market rate. Ratio closes the loop — market-fair pay sustains the motivation that drives the next cycle of performance.',
                color: MELD_GOLD, owner: 'Owner: the market',
              },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: item.color, fontFamily: 'Poppins, sans-serif' }}>
                    {item.label}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{item.title}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: item.color }}>{item.owner}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
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
                definition: "Measures execution against the plan — not whether the plan itself is right. If a Melder's target comp is $8,000/mo and they received $7,200, CAP is 90%. CAP holds the company accountable for honoring what was promised. Whether the plan was set correctly is Ratio's job to reveal.",
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

          {/* Realized Reward callout */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #022935 0%, #0d4a6b 100%)' }}>
              <div>
                <span className="text-xl font-black text-white block leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Realized Reward</span>
                <span className="text-xs text-white/80 font-medium">The dollar translation of OAP × CAP</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">both parties</span>
            </div>
            <div className="px-5 py-4">
              <div className="font-mono text-xs rounded-lg px-3 py-2 mb-3 text-slate-600" style={{ background: '#F1F1F1' }}>Realized Reward = OAP% × Target Comp → compare to Actual Paid</div>
              <p className="text-sm text-slate-500 leading-relaxed">Converts the OAP percentage into the dollar amount a Melder <em>earned</em> through their delivery — then compares it to what they actually received. If OAP is 95% and target is $8,000/mo, the performance-earned amount is $7,600. If actual pay was $7,200, the Realized Reward gap is −$400/mo. This makes underpayment concrete and actionable, not just a percentage.</p>
            </div>
          </div>

          <div className="p-6 rounded-xl border-l-4 text-base mb-5" style={{ background: `${MELD_BLUE}0d`, borderColor: MELD_BLUE }}>
            <strong style={{ color: MELD_DARK }}>The realization:</strong>
            <span className="text-slate-600"> Performance, pay, and market positioning were always connected inside compensation. Most systems treat them separately. OTP just makes the cycle visible — and keeps everyone accountable to their part of it.</span>
          </div>

          {/* When to redesign the plan */}
          <div className="p-6 rounded-xl border-l-4 text-base" style={{ background: '#fefce8', borderColor: '#FFB41B' }}>
            <strong style={{ color: '#92400e' }}>When to redesign the plan — not the people:</strong>
            <span className="text-slate-600"> If CAP is consistently at or near 100% but Ratio stays below 80% for two or more quarters, execution is fine — the plan itself is underpaying. That's a signal to revisit target comp levels and market rate inputs, not to coach or manage differently. OTP can tell you which is which.</span>
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
