import type { HealthColor } from '../../types';
import { HealthBadge } from './HealthBadge';

interface Props {
  title: string;
  question: string;
  value: number;
  valueLabel?: string;
  health: HealthColor;
  formula?: string;
  children?: React.ReactNode;
  className?: string;
}

const borderColor: Record<HealthColor, string> = {
  red:    'border-red-400',
  yellow: 'border-yellow-400',
  green:  'border-green-400',
  blue:   'border-blue-400',
};

const headerGradient: Record<HealthColor, string> = {
  red:    'from-red-500 to-red-600',
  yellow: 'from-yellow-500 to-amber-500',
  green:  'from-green-500 to-emerald-600',
  blue:   'from-blue-500 to-indigo-600',
};

export function MetricCard({ title, question, value, valueLabel, health, formula, children, className = '' }: Props) {
  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-md ${borderColor[health]} ${className}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerGradient[health]} px-5 py-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
            <p className="text-white/80 text-sm mt-0.5">{question}</p>
          </div>
          <HealthBadge health={health} size="sm" />
        </div>
        <div className="mt-3">
          <span className="text-white text-4xl font-black">{value.toFixed(1)}%</span>
          {valueLabel && <span className="text-white/70 text-sm ml-2">{valueLabel}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        {formula && (
          <p className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg mb-3 border border-slate-100">
            {formula}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
