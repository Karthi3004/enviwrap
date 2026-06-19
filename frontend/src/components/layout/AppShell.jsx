import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, MapPin, ShieldCheck, ClipboardList,
  FlaskConical, Activity, CheckSquare, LogOut, Leaf, Menu, X
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/farms', icon: MapPin, label: 'Farms' },
    { to: '/qaqc', icon: ShieldCheck, label: 'QA/QC Flags' },
  ]},
  { section: 'Data Entry', items: [
    { to: '/farms', icon: ClipboardList, label: 'Baseline', disabled: true },
    { to: '/farms', icon: FlaskConical, label: 'SOC Samples', disabled: true },
    { to: '/farms', icon: Activity, label: 'Monitoring', disabled: true },
  ]},
  { section: 'Audit', items: [
    { to: '/verification', icon: CheckSquare, label: 'Verification' },
  ]},
];

export default function AppShell() {
  const { logout, name, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">Enviwrap</div>
            <div className="text-[10px] text-emerald-400 font-mono leading-tight">dMRV · VM0042</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={closeSidebar} className="lg:hidden text-gray-500 hover:text-gray-300 p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navItems.map(({ section, items }) => (
          <div key={section}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-2 mb-2">
              {section}
            </div>
            <ul className="space-y-0.5">
              {items.map(({ to, icon: Icon, label, disabled }) => (
                <li key={label}>
                  {disabled ? (
                    <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-gray-600 cursor-not-allowed text-sm">
                      <Icon size={16} />
                      <span>{label}</span>
                    </div>
                  ) : (
                    <NavLink
                      to={to}
                      onClick={closeSidebar}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`
                      }
                    >
                      <Icon size={16} />
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
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
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
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 bg-gray-900 border-r border-gray-800
        flex flex-col flex-shrink-0
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Leaf size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Enviwrap</span>
          </div>
          <div className="ml-auto">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
