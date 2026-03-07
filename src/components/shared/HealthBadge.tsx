import type { HealthColor } from '../../types';

interface Props {
  health: HealthColor;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const config: Record<HealthColor, { bg: string; text: string; border: string; dot: string; label: string }> = {
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'Low' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'Moderate' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  label: 'High' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   label: 'Above Market' },
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function HealthBadge({ health, label, size = 'md' }: Props) {
  const c = config[health];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border} ${sizes[size]}`}>
      <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
      {label ?? c.label}
    </span>
  );
}
