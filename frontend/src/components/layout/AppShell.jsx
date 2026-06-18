import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, MapPin, ClipboardList, FlaskConical,
  Activity, ShieldCheck, CheckSquare, LogOut, Leaf, ChevronRight, Bell
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Overview' },
  { to: '/farms', icon: MapPin, label: 'Farms', section: 'Overview' },
  { to: '/qaqc', icon: ShieldCheck, label: 'QA/QC Flags', section: 'Overview' },
  { to: '/farms', icon: ClipboardList, label: 'Baseline', section: 'Data Entry', disabled: true, hint: 'Select a farm first' },
  { to: '/farms', icon: FlaskConical, label: 'SOC Samples', section: 'Data Entry', disabled: true, hint: 'Select a farm first' },
  { to: '/farms', icon: Activity, label: 'Monitoring', section: 'Data Entry', disabled: true, hint: 'Select a farm first' },
  { to: '/verification', icon: CheckSquare, label: 'Verification', section: 'Audit' },
];

export default function AppShell() {
  const { user, logout, name, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const grouped = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">Enviwrap</div>
              <div className="text-[10px] text-emerald-400 font-mono leading-tight">dMRV · VM0042</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-2 mb-2">
                {section}
              </div>
              <ul className="space-y-0.5">
                {items.map(({ to, icon: Icon, label, disabled, hint }) => (
                  <li key={label}>
                    {disabled ? (
                      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-gray-600 cursor-not-allowed text-sm" title={hint}>
                        <Icon size={15} />
                        <span>{label}</span>
                      </div>
                    ) : (
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                          }`
                        }
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gray-800/50 mb-2">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-200 truncate">{name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
