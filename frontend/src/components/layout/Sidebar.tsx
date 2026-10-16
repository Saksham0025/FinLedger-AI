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
  GitBranch,
  FlaskConical,
  Activity,
  LifeBuoy,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStaffSection?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isStaffSection = false }) => {
  const { isStaff } = useAuth();

  const customerNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts & Ledger', path: '/accounts', icon: Wallet },
    { name: 'Money Transfers', path: '/transfers', icon: ArrowRightLeft },
    { name: 'Financial Products', path: '/products', icon: Sparkles },
    { name: 'Portfolio & Holdings', path: '/portfolio', icon: PieChart },
    { name: 'Recourse & Disputes', path: '/disputes', icon: LifeBuoy },
  ];

  const staffNav = [
    { name: 'Risk Dashboard', path: '/staff', icon: LayoutDashboard },
    { name: 'Fraud Alert Triage', path: '/staff/fraud', icon: ShieldAlert },
    { name: 'LedgerGraph Explorer', path: '/staff/graph', icon: GitBranch },
    { name: 'Fraud Lab Benchmark', path: '/staff/fraud-lab', icon: FlaskConical },
    { name: 'AI Health & Governance', path: '/staff/ai-health', icon: Activity },
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
          className="fixed inset-0 bg-ink-950/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-14 z-40 h-[calc(100vh-3.5rem)] w-60 shrink-0 p-3 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          isStaffSection
            ? 'bg-forensic-900 border-r border-forensic-700 text-slate-100'
            : 'bg-paper-50 border-r border-eucalyptus-300 text-ink-900 shadow-atelier'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="space-y-4">
          <div
            className={`px-2 pt-1 pb-2 border-b ${
              isStaffSection ? 'border-forensic-700' : 'border-eucalyptus-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                isStaffSection ? 'text-emerald-400' : 'text-forest-800'
              }`}
            >
              {isStaff ? 'Forensic Operations' : 'Ledger Registry'}
            </span>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard' || item.path === '/staff'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded text-xs transition-all ${
                      isActive
                        ? isStaffSection
                          ? 'bg-forensic-800 text-emerald-300 border border-forensic-700 font-bold border-l-4 border-l-emerald-400 shadow-xs [&_svg]:text-emerald-300 [&_span]:text-emerald-300'
                          : 'sidebar-nav-active bg-forest-800 text-white border border-forest-950 font-bold border-l-4 border-l-sage-200 shadow-sm [&_svg]:text-white [&_span]:text-white'
                        : isStaffSection
                        ? 'text-slate-300 hover:text-white hover:bg-forensic-800 font-medium [&_svg]:text-slate-400'
                        : 'sidebar-nav-inactive text-ink-800 hover:text-forest-900 hover:bg-mist-100 font-medium [&_svg]:text-forest-700'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="tracking-wide">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Technical Registry Box */}
        <div
          className={`p-3 rounded-md border text-[10px] font-mono space-y-1.5 ${
            isStaffSection
              ? 'bg-forensic-850 border-forensic-700 text-slate-400'
              : 'bg-mist-100 border-eucalyptus-300 text-ink-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="uppercase text-[9px] tracking-wider text-ink-500 [.theme-forensic_&]:text-slate-500">
              System Core
            </span>
            <span className="font-semibold text-ink-900 [.theme-forensic_&]:text-slate-200">PostgreSQL 16</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase text-[9px] tracking-wider text-ink-500 [.theme-forensic_&]:text-slate-500">
              Protocol
            </span>
            <span className="font-semibold text-forest-800 [.theme-forensic_&]:text-emerald-400 font-bold">Double-Entry</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase text-[9px] tracking-wider text-ink-500 [.theme-forensic_&]:text-slate-500">
              Denomination
            </span>
            <span className="font-semibold text-ink-900 [.theme-forensic_&]:text-slate-200">INR (₹)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
