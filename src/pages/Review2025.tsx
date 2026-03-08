import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Star, Eye, EyeOff } from 'lucide-react';

const MELD_BLUE = '#1175CC';
const MELD_DARK = '#022935';
const MELD_LIGHT = '#B0E3FF';
const MELD_ACCENT = '#FFB41B';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface MelderRow {
  name: string;
  oa: number | null;
  cap: number;
  ratio: number;
  salary: number;
  market: number;
  q: (number | null)[];
  note?: string;
}

interface TeamData {
  id: string;
  name: string;
  note?: string;
  highlight?: 'model' | 'turnaround' | 'watch';
  total: { oa: number | null; cap: number; ratio: number; salary: number; market: number };
  melders: MelderRow[];
}

const TEAMS: TeamData[] = [
  {
    id: 'support',
    name: 'Customer Support & Enablement',
    highlight: 'model',
    note: 'Model team — only team to hit 100%+ OA annually.',
    total: { oa: 100, cap: 96.6, ratio: 100.3, salary: 242000, market: 286000 },
    melders: [
      { name: 'Nathanael Hockley',     oa: null, cap: 92.7,  ratio: 112.5, salary: 75000,  market: 90000, q: [0, 101, 107, 102] },
      { name: 'Jeffrey Monson',         oa: null, cap: 101.2, ratio: 89.3,  salary: 67000,  market: 82000, q: [0, 100, 100, 100] },
      { name: 'Aaron Trimble',          oa: null, cap: 99.5,  ratio: 98.4,  salary: 50000,  market: 57000, q: [0, 100, 100, 100] },
      { name: 'Deepika Yalla-Colomb',   oa: null, cap: 94.8,  ratio: 98.4,  salary: 50000,  market: 57000, q: [0, 100, 100, 100] },
      { name: 'Michael Calabrese',      oa: null, cap: 105.7, ratio: 112.5, salary: 72500,  market: 75000, q: [null, null, 107, 102] },
      { name: 'Megan Byrd',             oa: null, cap: null as unknown as number, ratio: null as unknown as number, salary: null as unknown as number, market: null as unknown as number, q: [null, null, null, 100] },
    ],
  },
  {
    id: 'bd',
    name: 'Business Development (BD)',
    highlight: 'turnaround',
    note: 'BD and BS are intentionally positioned below market on Compensation Ratio — known, accepted design choice.',
    total: { oa: 92.5, cap: 87.7, ratio: 70.5, salary: 366800, market: 526000 },
    melders: [
      { name: 'Benjamin Capelle',    oa: 46,   cap: 70.8,  ratio: 86.6, salary: 43900,  market: 59000, q: [46, 125, null, null] },
      { name: 'Benjamin S Echols',   oa: 75,   cap: 67.9,  ratio: 102.4,salary: 47000,  market: 59000, q: [75, 77, null, null] },
      { name: 'Bridget Marshall',    oa: 64,   cap: 84.2,  ratio: 86.6, salary: 43900,  market: 59000, q: [64, 66, 117, 94] },
      { name: 'Emilee L Willey',     oa: 43,   cap: 90.7,  ratio: 102.4,salary: 47000,  market: 85000, q: [43, 117, 76, null] },
      { name: 'Johnathon L Bintliff',oa: 124,  cap: 85.4,  ratio: 98.1, salary: 50000,  market: 85000, q: [124, 129, 148, 162] },
      { name: 'Nicholas J Nagel',    oa: 73,   cap: 105.8, ratio: 84.2, salary: 62000,  market: 94000, q: [73, 95, 100, 119] },
      { name: 'Winston Pinto',       oa: 120,  cap: 86.4,  ratio: 98.1, salary: 73000,  market: 85000, q: [120, 101, 158, 170] },
      { name: 'Jace Holzer',         oa: 118,  cap: 96.9,  ratio: 96.4, salary: 60000,  market: 63000, q: [null, 125, 137, 93],  note: 'Avg of Q2–Q4' },
      { name: 'Seth Nichols',        oa: 136,  cap: 96.7,  ratio: 86.6, salary: 43900,  market: 59000, q: [null, null, 113, 158], note: 'Avg of Q3–Q4' },
      { name: 'Megan Golliher',      oa: 118,  cap: 111.7, ratio: 86.6, salary: 43900,  market: 59000, q: [null, null, 120, 115], note: 'Avg of Q3–Q4' },
      { name: 'Anthony',             oa: 100,  cap: 109.1, ratio: 86.6, salary: 43900,  market: 59000, q: [null, null, 109, 90],  note: 'Avg of Q3–Q4' },
    ],
  },
  {
    id: 'csm',
    name: 'Customer Success (CSM)',
    total: { oa: 110.6, cap: 87.4, ratio: 106.1, salary: 334000, market: 357000 },
    melders: [
      { name: 'Aaron Seaholm',         oa: 101,   cap: 96.4,  ratio: 133,   salary: 233000, market: 181000, q: [101, 101, null, null] },
      { name: 'Andrew T Conniff',       oa: 115,   cap: 95.3,  ratio: 107.8, salary: 70000,  market: 83000,  q: [115, 79, 25, null] },
      { name: 'Anna Torvi',             oa: 113.6, cap: 75.1,  ratio: 95.8,  salary: 128000, market: 130000, q: [113.6, 68, 93, 91] },
      { name: 'Christopher M Erickson', oa: 132,   cap: 87.2,  ratio: 107,   salary: 68000,  market: 83000,  q: [132, 79, null, null] },
      { name: 'Bryce Codr',             oa: 144,   cap: 87.9,  ratio: 122,   salary: 66000,  market: 61000,  q: [144, 116, 44, 91] },
      { name: 'Kalico Jordan',          oa: 58,    cap: 98.7,  ratio: 110.6, salary: 72000,  market: 83000,  q: [58, 108, null, null] },
      { name: 'David Herr',             oa: null,  cap: 66.9,  ratio: 109,   salary: 70000,  market: 83000,  q: [null, null, 97, 93] },
      { name: 'Ben Capelle',            oa: null,  cap: 85.2,  ratio: 108.9, salary: 63000,  market: 61000,  q: [null, null, 113, 68] },
      { name: 'Johnny Trokey',          oa: null,  cap: 79.2,  ratio: 109,   salary: 70000,  market: 83000,  q: [null, null, null, 116] },
    ],
  },
  {
    id: 'bs',
    name: 'Business Solutions (BS)',
    highlight: 'turnaround',
    note: 'BS is intentionally positioned below market on Compensation Ratio — known, accepted design choice.',
    total: { oa: 88.3, cap: 84.1, ratio: 87.9, salary: 400000, market: 548000 },
    melders: [
      { name: 'Andrew D McGlashan', oa: 100,  cap: 107.4, ratio: 77.2, salary: 55000,  market: 56000,  q: [100, 90, 103, 136] },
      { name: 'Jesse Anderson',      oa: 125,  cap: 100.1, ratio: 73.5, salary: 70000,  market: 110000, q: [125, 114, 112, null] },
      { name: 'Christopher Erickson',oa: null, cap: 95.6,  ratio: 73.5, salary: 68000,  market: 110000, q: [null, null, 109, 102] },
      { name: 'Aaron Costello',      oa: 51,   cap: 75.4,  ratio: 94.7, salary: 81000,  market: 121000, q: [51, 111, 82, 104] },
      { name: 'John Kearns',         oa: 77,   cap: 69.4,  ratio: 114.6,salary: 126000, market: 151000, q: [77, 106, 87, 88] },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    highlight: 'watch',
    total: { oa: 97.5, cap: 87.0, ratio: 96.6, salary: 426400, market: 541000 },
    melders: [
      { name: 'Elizabeth Greenway', oa: 90.3,  cap: 82.4,  ratio: 72.5,  salary: 100000, market: 133000, q: [90.3, 99, 83, 69] },
      { name: 'Michael Nasibog',    oa: 163,   cap: 102.7, ratio: 104.9, salary: 53400,  market: 63000,  q: [102.3, 82, 133, 82] },
      { name: 'Jon Martin',         oa: 105,   cap: 89.8,  ratio: 106.5, salary: 75000,  market: 110000, q: [105, 106, 116, 85] },
      { name: 'Molly Sperlich',     oa: 117,   cap: 93.6,  ratio: 101.6, salary: 62000,  market: 84000,  q: [117, 118, 109, 80] },
      { name: 'Madison',            oa: 73,    cap: 79.8,  ratio: 112.7, salary: 136000, market: 151000, q: [73, 80, 95, 80] },
    ],
  },
  {
    id: 'com',
    name: 'Customer Onboarding (COM)',
    total: { oa: 92, cap: 99.1, ratio: 106.9, salary: 151000, market: 179000 },
    melders: [
      { name: 'Aaron Seaholm',            oa: 101, cap: 96.4,  ratio: 133,   salary: 233000, market: 181000, q: [101, 101, null, null] },
      { name: 'Brianna Pesek',             oa: 76,  cap: 100,   ratio: 108.9, salary: 68000,  market: 83000,  q: [76, 119, 113, 90] },
      { name: 'Kristoffer Allen Hewlett',  oa: 99,  cap: 100,   ratio: 105.3, salary: 83000,  market: 96000,  q: [99, 115, 104, 93] },
    ],
  },
  {
    id: 'pops',
    name: 'People Operations (PoPs)',
    total: { oa: 100, cap: 95.1, ratio: 86.4, salary: 198600, market: 238000 },
    melders: [
      { name: 'Autumn Hughes',  oa: null, cap: 92.6,  ratio: 90.3, salary: 138600, market: 172000, q: [100, 98, 100, 100] },
      { name: 'Amanda Green',   oa: null, cap: 102.9, ratio: 75.9, salary: 60000,  market: 66000,  q: [100, 95, 100, 100] },
    ],
  },
];

interface ExcludedTeam {
  name: string;
  note?: string;
  total: { cap: number; ratio: number; salary: number; market: number };
  melders: { name: string; cap: number; ratio: number; salary: number; market: number; note?: string }[];
}

const EXCLUDED_TEAMS: ExcludedTeam[] = [
  {
    name: 'Product',
    total: { cap: 61.6, ratio: 100, salary: 353600, market: 451000 },
    melders: [
      { name: 'Akinsola Ogunware', cap: 58.2, ratio: 95.4,  salary: 146600, market: 145000 },
      { name: 'Andrew Bien',       cap: 63.3, ratio: 102.9, salary: 100000, market: 99000  },
      { name: 'Aruna Rao',         cap: 63.3, ratio: 94.8,  salary: 12000,  market: 123000, note: 'Likely data entry error ($12k vs $123k market)' },
      { name: 'Elizabeth Archer',  cap: 62.9, ratio: 112.7, salary: 95000,  market: 84000  },
    ],
  },
  {
    name: 'Engineering & Data',
    total: { cap: 61.5, ratio: 107.7, salary: 671000, market: 623000 },
    melders: [
      { name: 'Khalil Rutledge',  cap: 63.3, ratio: 100.5, salary: 160000, market: 151000 },
      { name: 'Matthew Hickey',   cap: 63.8, ratio: 100.5, salary: 160000, market: 151000 },
      { name: 'Zachary Levovitz', cap: 63.1, ratio: 101.1, salary: 161000, market: 151000 },
      { name: 'David Turner',     cap: 57.6, ratio: 126,   salary: 190000, market: 170000 },
    ],
  },
  {
    name: 'Engineering',
    total: { cap: 91.3, ratio: 97.9, salary: 562000, market: 578000 },
    melders: [
      { name: 'Austin Wentz',        cap: 88.4, ratio: 115.8, salary: 192000, market: 173000 },
      { name: 'Cameron Powers',      cap: 98.1, ratio: 96.9,  salary: 125000, market: 117000 },
      { name: 'Chamaka Senarath',    cap: 90.5, ratio: 84.2,  salary: 85000,  market: 103000 },
      { name: 'Cody Hall',           cap: 90.5, ratio: 84.2,  salary: 85000,  market: 103000 },
      { name: 'Dakota Walker',       cap: 90.5, ratio: 93.1,  salary: 75000,  market: 82000  },
      { name: 'Eric Shea',           cap: 92.8, ratio: 100.5, salary: 16000,  market: 151000, note: 'Likely data entry error ($16k vs $151k market)' },
      { name: 'Martin Graham',       cap: 86.2, ratio: 97.8,  salary: 134000, market: 134000 },
      { name: 'Tanner Hohn',         cap: 90.5, ratio: 79.5,  salary: 95000,  market: 117000 },
      { name: 'Rachel Terwilliger',  cap: 90.5, ratio: 80.3,  salary: 81000,  market: 103000 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(v: number | null, decimals = 1): string {
  if (v === null || isNaN(v as number)) return '—';
  return `${v.toFixed(decimals)}%`;
}

function usd(v: number | null): string {
  if (v === null || isNaN(v as number)) return '—';
  return `$${(v / 1000).toFixed(0)}k`;
}

function oaColor(v: number | null): string {
  if (v === null) return '#94a3b8';
  if (v >= 100) return '#22c55e';
  if (v >= 90) return '#f59e0b';
  return '#ef4444';
}

function capColor(v: number): string {
  if (v >= 100) return '#22c55e';
  if (v >= 90) return '#f59e0b';
  return '#ef4444';
}

function ratioColor(v: number): string {
  if (v > 105) return MELD_BLUE;
  if (v >= 85) return '#22c55e';
  if (v >= 70) return '#f59e0b';
  return '#ef4444';
}

function Pill({ value, color }: { value: string; color: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: color + '1a', color }}>
      {value}
    </span>
  );
}

function QCell({ v }: { v: number | null }) {
  if (v === null) return <span className="text-slate-300">—</span>;
  return <span className="font-semibold" style={{ color: oaColor(v) }}>{pct(v, 0)}</span>;
}

// ─── Team Section ─────────────────────────────────────────────────────────────

function TeamSection({ team, masked }: { team: TeamData; masked: boolean }) {
  const [open, setOpen] = useState(false);
  const mask = (v: number | null) => masked ? '••••' : usd(v);

  const highlightStyle: Record<string, { bg: string; border: string; badge: string; badgeColor: string }> = {
    model:      { bg: '#f0fdf4', border: '#bbf7d0', badge: 'Model Team', badgeColor: '#16a34a' },
    turnaround: { bg: '#fffbeb', border: '#fed7aa', badge: 'Turnaround', badgeColor: '#d97706' },
    watch:      { bg: '#f0f9ff', border: '#bae6fd', badge: 'Context Note', badgeColor: '#0284c7' },
  };

  const hs = team.highlight ? highlightStyle[team.highlight] : null;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm border"
      style={{ borderColor: hs ? hs.border : '#e2e8f0', background: hs ? hs.bg : 'white' }}
    >
      {/* Header row */}
      <button
        className="w-full text-left px-6 py-4 flex items-center gap-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>{team.name}</span>
          {team.highlight && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: highlightStyle[team.highlight].badgeColor + '20', color: highlightStyle[team.highlight].badgeColor }}>
              {highlightStyle[team.highlight].badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm flex-shrink-0">
          {team.total.oa !== null && (
            <div className="text-center">
              <p className="text-xs text-slate-400">OAP</p>
              <p className="font-bold" style={{ color: oaColor(team.total.oa) }}>{pct(team.total.oa, 1)}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-slate-400">CAP%</p>
            <p className="font-bold" style={{ color: capColor(team.total.cap) }}>{pct(team.total.cap, 1)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Ratio</p>
            <p className="font-bold" style={{ color: ratioColor(team.total.ratio) }}>{pct(team.total.ratio, 1)}</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-xs text-slate-400">Salary</p>
            <p className="font-semibold text-slate-700">{mask(team.total.salary)}</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-xs text-slate-400">Market</p>
            <p className="font-semibold text-slate-500">{mask(team.total.market)}</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-100">
          {team.note && (
            <div className="px-6 py-3 text-xs text-slate-500 border-b border-slate-100 italic">
              {team.note}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left px-6 py-2 font-semibold">Name</th>
                  <th className="text-right px-3 py-2 font-semibold">OAP</th>
                  <th className="text-right px-3 py-2 font-semibold">CAP%</th>
                  <th className="text-right px-3 py-2 font-semibold">Ratio</th>
                  <th className="text-right px-3 py-2 font-semibold">Salary</th>
                  <th className="text-right px-3 py-2 font-semibold">Market</th>
                  <th className="text-center px-3 py-2 font-semibold">Q1</th>
                  <th className="text-center px-3 py-2 font-semibold">Q2</th>
                  <th className="text-center px-3 py-2 font-semibold">Q3</th>
                  <th className="text-center px-3 py-2 font-semibold">Q4</th>
                </tr>
              </thead>
              <tbody>
                {team.melders.map((m) => (
                  <tr key={m.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-2.5 font-medium text-slate-800">
                      {m.name}
                      {m.note && <span className="ml-2 text-xs font-normal text-slate-400 italic">{m.note}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Pill value={m.oa !== null ? pct(m.oa, 0) : '—'} color={oaColor(m.oa)} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {m.cap ? <Pill value={pct(m.cap, 1)} color={capColor(m.cap)} /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {m.ratio ? <Pill value={pct(m.ratio, 1)} color={ratioColor(m.ratio)} /> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{mask(m.salary)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{mask(m.market)}</td>
                    <td className="px-3 py-2.5 text-center"><QCell v={m.q[0]} /></td>
                    <td className="px-3 py-2.5 text-center"><QCell v={m.q[1]} /></td>
                    <td className="px-3 py-2.5 text-center"><QCell v={m.q[2]} /></td>
                    <td className="px-3 py-2.5 text-center"><QCell v={m.q[3]} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-slate-700" style={{ background: MELD_DARK + '08' }}>
                  <td className="px-6 py-2.5">TOTAL</td>
                  <td className="px-3 py-2.5 text-right">
                    <Pill value={team.total.oa !== null ? pct(team.total.oa, 1) : '—'} color={oaColor(team.total.oa)} />
                  </td>
                  <td className="px-3 py-2.5 text-right"><Pill value={pct(team.total.cap, 1)} color={capColor(team.total.cap)} /></td>
                  <td className="px-3 py-2.5 text-right"><Pill value={pct(team.total.ratio, 1)} color={ratioColor(team.total.ratio)} /></td>
                  <td className="px-3 py-2.5 text-right">{mask(team.total.salary)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{mask(team.total.market)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ExcludedSection({ team, masked }: { team: ExcludedTeam; masked: boolean }) {
  const [open, setOpen] = useState(false);
  const mask = (v: number | null) => masked ? '••••' : usd(v);
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-white">
      <button className="w-full text-left px-6 py-4 flex items-center justify-between gap-4" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{team.name}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">OTP Excluded</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-slate-400">CAP%</p>
            <p className="font-bold" style={{ color: capColor(team.total.cap) }}>{pct(team.total.cap, 1)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Ratio</p>
            <p className="font-bold" style={{ color: ratioColor(team.total.ratio) }}>{pct(team.total.ratio, 1)}</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-6 py-2">Name</th>
                <th className="text-right px-3 py-2">CAP%</th>
                <th className="text-right px-3 py-2">Ratio</th>
                <th className="text-right px-3 py-2">Salary</th>
                <th className="text-right px-3 py-2">Market</th>
              </tr>
            </thead>
            <tbody>
              {team.melders.map((m) => (
                <tr key={m.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-6 py-2.5 font-medium text-slate-800">
                    {m.name}
                    {m.note && <span className="ml-2 text-xs text-amber-600 italic">{m.note}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right"><Pill value={pct(m.cap, 1)} color={capColor(m.cap)} /></td>
                  <td className="px-3 py-2.5 text-right"><Pill value={pct(m.ratio, 1)} color={ratioColor(m.ratio)} /></td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{mask(m.salary)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-400">{mask(m.market)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Review2025() {
  const [masked, setMasked] = useState(true);
  return (
    <div className="min-h-screen" style={{ background: '#F1F1F1' }}>

      {/* Hero */}
      <div className="px-8 pt-10 pb-8" style={{ background: `linear-gradient(135deg, ${MELD_DARK} 0%, #0d4a6b 60%, ${MELD_BLUE} 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: MELD_LIGHT }}>
            Property Meld · Annual Review
          </p>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              2025 Year in Review
            </h1>
            <button
              onClick={() => setMasked((m) => !m)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)' }}
              title={masked ? 'Show salary data' : 'Hide salary data'}
            >
              {masked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {masked ? 'Salaries hidden' : 'Salaries visible'}
            </button>
          </div>
          <p className="text-lg mb-8" style={{ color: MELD_LIGHT }}>
            Company-wide Outcome-to-Pay performance across all teams.
          </p>

          {/* Company Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Company OAP (EOY)',  value: '~99%',  sub: 'Up from 72.6% in Q1', color: '#f59e0b' },
              { label: 'OAP Growth',         value: '+26 pts', sub: 'Q1 → Q4 improvement',  color: MELD_ACCENT },
              { label: 'BD Turnaround',      value: '+47 pts', sub: 'Biggest swing of 2025', color: MELD_ACCENT },
              { label: 'Support Annual OA',  value: '100%+',  sub: 'Model team all year',   color: '#22c55e' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
                <p className="text-xs mb-1" style={{ color: MELD_LIGHT }}>{s.label}</p>
                <p className="text-2xl font-black" style={{ color: s.color, fontFamily: 'Poppins, sans-serif' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(176,227,255,0.6)' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">

        {/* Story Callouts */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 border-l-4" style={{ background: '#f0fdf4', borderColor: '#22c55e' }}>
            <Star className="w-4 h-4 mb-2" style={{ color: '#16a34a' }} />
            <p className="font-bold text-sm" style={{ color: '#15803d', fontFamily: 'Poppins, sans-serif' }}>Support: Model Team</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              The only team to hit 100%+ OA for the full year. Consistent execution across all Melders — the benchmark for the rest of the company.
            </p>
          </div>
          <div className="rounded-2xl p-5 border-l-4" style={{ background: '#fffbeb', borderColor: MELD_ACCENT }}>
            <TrendingUp className="w-4 h-4 mb-2" style={{ color: '#d97706' }} />
            <p className="font-bold text-sm" style={{ color: '#92400e', fontFamily: 'Poppins, sans-serif' }}>BD &amp; BS: Turnaround Story</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Business Development swung from 78% OAP in Q1 to 125%+ in Q4 — a +47-point turnaround. Business Solutions followed the same arc, rebuilding from a weak Q1 to consistent Q3/Q4 performance. Both teams closed 2025 with real momentum.
            </p>
          </div>
          <div className="rounded-2xl p-5 border-l-4" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <AlertTriangle className="w-4 h-4 mb-2" style={{ color: '#dc2626' }} />
            <p className="font-bold text-sm" style={{ color: '#991b1b', fontFamily: 'Poppins, sans-serif' }}>Action Item: COM + Marketing</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Both teams ended the year with comp structure questions. Reassess compensation design for 2026.
            </p>
          </div>
        </div>

        {/* Below-market design note */}
        <div className="rounded-xl px-5 py-3 text-sm flex items-start gap-3" style={{ background: `${MELD_BLUE}10`, border: `1px solid ${MELD_BLUE}30` }}>
          <span className="flex-shrink-0 text-lg">ℹ️</span>
          <p className="text-slate-600"><strong style={{ color: MELD_DARK }}>BD &amp; BS Compensation Ratio:</strong> Both teams are intentionally positioned below market. This is a known, accepted strategic design choice — not a gap to fix.</p>
        </div>

        {/* Team Sections */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif' }}>
            OTP Teams — Click to expand
          </h2>
          <div className="space-y-3">
            {TEAMS.map((team) => (
              <TeamSection key={team.id} team={team} masked={masked} />
            ))}
          </div>
        </div>

        {/* Excluded Teams */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: MELD_DARK, fontFamily: 'Poppins, sans-serif' }}>
            Excluded Teams
          </h2>
          <p className="text-xs text-slate-400 mb-3">Tracked but no OTP metrics assigned — OAP = 0 by design.</p>
          <div className="space-y-3">
            {EXCLUDED_TEAMS.map((team) => (
              <ExcludedSection key={team.name} team={team} masked={masked} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center pt-2">
          Source: Compensation_Overview_2025 · Benchmarks from Carta (Minneapolis/St. Paul/Bloomington, 50th percentile) · Property Meld Internal
        </p>
      </div>
    </div>
  );
}
