import { AlertTriangle, Info, XCircle } from 'lucide-react';
import type { Alert } from '../../types';

interface Props {
  alerts: Alert[];
}

const severityConfig = {
  info:     { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: Info,          iconColor: 'text-blue-500' },
  warning:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  icon: AlertTriangle, iconColor: 'text-amber-500' },
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: XCircle,       iconColor: 'text-red-500' },
};

export function AlertBanner({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const cfg = severityConfig[alert.severity];
        const Icon = cfg.icon;
        return (
          <div key={i} className={`flex gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
            <div>
              <p className={`font-semibold text-sm ${cfg.text}`}>{alert.title}</p>
              <p className={`text-sm mt-0.5 ${cfg.text} opacity-80`}>{alert.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
