import { BarChart2, Calculator, Clock, Download, Home, PieChart, Settings, Upload, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/',           icon: Home,       label: 'Dashboard' },
  { to: '/calculator', icon: Calculator, label: 'Calculator' },
  { to: '/melders',    icon: Users,      label: 'Melders' },
  { to: '/history',    icon: Clock,      label: 'History' },
  { to: '/trends',     icon: BarChart2,  label: 'Trends' },
  { to: '/analytics',  icon: PieChart,   label: 'Analytics' },
  { to: '/import',     icon: Upload,     label: 'Import' },
  { to: '/export',     icon: Download,   label: 'Export' },
  { to: '/settings',   icon: Settings,   label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col shadow-xl">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-black text-sm">OTP</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Outcome-to-Pay</p>
            <p className="text-white/50 text-xs">Meld · Comp System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs">PropertyMeld · Internal</p>
      </div>
    </aside>
  );
}
