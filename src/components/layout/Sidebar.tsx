import { BarChart2, Calculator, Clock, Download, Home, BookOpen, CalendarDays, Settings, Upload, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/',            icon: BookOpen,     label: 'Overview' },
  { to: '/dashboard',   icon: Home,         label: 'Dashboard' },
  { to: '/calculator',  icon: Calculator,   label: 'Calculator' },
  { to: '/melders',     icon: Users,        label: 'Melders' },
  { to: '/history',     icon: Clock,        label: 'History' },
  { to: '/trends',      icon: BarChart2,    label: 'Trends' },
  { to: '/review-2025', icon: CalendarDays, label: '2025 Review' },
  { to: '/import',      icon: Upload,       label: 'Import' },
  { to: '/export',      icon: Download,     label: 'Export' },
  { to: '/settings',    icon: Settings,     label: 'Settings' },
];

// Property Meld house + wrench icon in brand SVG
function MeldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* House outline */}
      <path d="M14 3L3 12H6V24H12V17H16V24H22V12H25L14 3Z" fill="white" fillOpacity="0.95" />
      {/* Door */}
      <rect x="12" y="17" width="4" height="7" rx="0.5" fill="#1175CC" />
      {/* Chimney accent */}
      <rect x="17" y="6" width="2.5" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen flex flex-col shadow-xl" style={{ background: 'linear-gradient(180deg, #022935 0%, #0a3d52 60%, #1175CC 100%)' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(17,117,204,0.4)' }}>
            <MeldIcon />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Property Meld</p>
            <p className="text-xs mt-0.5" style={{ color: '#B0E3FF', fontFamily: 'Rubik, sans-serif' }}>Outcome-to-Pay</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'rgba(17,117,204,0.55)' } : {}}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs" style={{ color: 'rgba(176,227,255,0.4)' }}>Property Meld · Internal Tool</p>
      </div>
    </aside>
  );
}
