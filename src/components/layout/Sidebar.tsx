import { BarChart2, Calculator, Clock, Download, Home, BookOpen, CalendarDays, PieChart, Settings, Upload, Users, AlertTriangle, Layers } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const primaryNav = [
  { to: '/',            icon: BookOpen,     label: 'Overview' },
  { to: '/dashboard',   icon: Home,         label: 'Dashboard' },
  { to: '/calculator',  icon: Calculator,   label: 'Calculator' },
  { to: '/history',     icon: Clock,        label: 'History' },
  { to: '/trends',      icon: BarChart2,    label: 'Trends' },
  { to: '/analytics',   icon: PieChart,     label: 'Analytics' },
  { to: '/review-2025', icon: CalendarDays, label: '2025 Review' },
];

const systemNav = [
  { to: '/roles',    icon: Layers,    label: 'Roles & Metrics' },
  { to: '/melders',  icon: Users,     label: 'Melders' },
  { to: '/import',   icon: Upload,    label: 'Import' },
  { to: '/export',   icon: Download,  label: 'Export' },
  { to: '/settings', icon: Settings,  label: 'Settings' },
];

// Property Meld logo — house silhouette as a plus/cross with roof triangle cutout and wrench notch
function MeldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="pm-logo-mask">
          {/* Cross/plus shape — chimney top arm */}
          <rect x="9.5" y="0" width="9" height="11" rx="2.5" fill="white" />
          {/* Cross/plus shape — wide wings body */}
          <rect x="0" y="7.5" width="28" height="14" rx="3.5" fill="white" />
          {/* Cross/plus shape — door bottom arm */}
          <rect x="9.5" y="20.5" width="9" height="7.5" rx="2.5" fill="white" />
          {/* Roof peak triangle cutout */}
          <polygon points="14,9 0.5,20.5 27.5,20.5" fill="black" />
          {/* Wrench/tool notch cutout (upper-right of body) */}
          <rect x="19" y="11.5" width="4" height="6" rx="1" fill="black" />
        </mask>
      </defs>
      <rect width="28" height="28" fill="white" mask="url(#pm-logo-mask)" />
    </svg>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
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
        {primaryNav.map(item => <NavItem key={item.to} {...item} />)}

        {/* System divider */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(176,227,255,0.35)' }}>System</p>
        </div>

        {systemNav.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* Persistence warning */}
      <NavLink
        to="/export"
        className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-start gap-2 hover:bg-white/10 transition-all"
        style={{ background: 'rgba(255,180,27,0.12)', border: '1px solid rgba(255,180,27,0.25)' }}
      >
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#FFB41B' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#FFB41B' }}>Data is browser-local</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(176,227,255,0.6)' }}>Export a backup to share or persist across devices.</p>
        </div>
      </NavLink>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs" style={{ color: 'rgba(176,227,255,0.4)' }}>Property Meld · Internal Tool</p>
      </div>
    </aside>
  );
}
