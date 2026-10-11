import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Sparkles,
  PieChart,
  ShieldAlert,
  Users,
  FileText,
  Scale,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isStaff } = useAuth();

  const customerNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts & Ledger', path: '/accounts', icon: Wallet },
    { name: 'Money Transfers', path: '/transfers', icon: ArrowRightLeft },
    { name: 'Financial Products', path: '/products', icon: Sparkles },
    { name: 'Portfolio & Holdings', path: '/portfolio', icon: PieChart },
  ];

  const staffNav = [
    { name: 'Risk Dashboard', path: '/staff', icon: LayoutDashboard },
    { name: 'Fraud Alert Triage', path: '/staff/fraud', icon: ShieldAlert },
    { name: 'Accounts Inspector', path: '/staff/accounts', icon: Users },
    { name: 'Audit Trail', path: '/staff/audit', icon: FileText },
    { name: 'Ledger Reconciliation', path: '/staff/reconciliation', icon: Scale },
    { name: 'Reports & Analytics', path: '/staff/reports', icon: BarChart3 },
  ];

  const navItems = isStaff ? staffNav : customerNav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 shrink-0 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="px-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {isStaff ? 'Staff Portal' : 'Customer Portal'}
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard' || item.path === '/staff'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info box */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-300">Currency</span>
            <span className="font-mono text-emerald-400 font-bold">INR (₹)</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Double-Entry PostgreSQL Ledger. Append-Only Auditing.
          </p>
        </div>
      </aside>
    </>
  );
};
