import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { LedgerMotif } from '../components/common/LedgerMotif';
import { getErrorMessage } from '../api/client';
import { Lock, User, ArrowRight, ShieldCheck, Scale, Eye, EyeOff, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({
        username_or_email: usernameOrEmail.trim(),
        password,
      });

      const savedUserStr = localStorage.getItem('finledger_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      if (from) {
        navigate(from, { replace: true });
      } else if (savedUser?.role === 'STAFF' || savedUser?.role === 'ADMIN') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoPersona = (role: 'customer' | 'staff') => {
    if (role === 'customer') {
      setUsernameOrEmail('saksham_customer');
      setPassword('CustomerPass123!');
    } else {
      setUsernameOrEmail('staff_admin');
      setPassword('AdminPass123!');
    }
  };

  return (
    <div className="min-h-screen bg-parchment-100 text-ink-950 flex flex-col justify-center items-center px-4 py-8 sm:py-16 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: Architectural Financial Instrument Panel */}
        <div className="lg:col-span-6 bg-surface border-2 border-hairline rounded-lg p-6 sm:p-8 flex flex-col justify-between shadow-atelier relative">
          <span className="absolute top-3 left-3 text-copper-700 font-mono text-[10px] select-none opacity-80">+ ARCH.01</span>

          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded bg-forest-800 text-white font-serif font-bold text-sm flex items-center justify-center border border-forest-900 shadow-sm">
                FL
              </div>
              <span className="font-serif font-bold text-lg text-ink-950 tracking-tight">
                FinLedger <span className="text-copper-700 font-sans text-xs uppercase tracking-widest font-bold ml-1">Atelier</span>
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-sans uppercase tracking-widest text-copper-700 font-bold block">
                Accounting Architecture
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink-950 leading-tight">
                The precision of a financial instrument. The clarity of an editorial publication.
              </h1>
              <p className="text-xs text-ink-700 leading-relaxed font-sans pt-1">
                FinLedger-AI is a high-integrity financial system engineered around strict double-entry ledger bookkeeping, PostgreSQL transactional invariance, and transparent advisory fraud intelligence.
              </p>
            </div>

            {/* Custom Technical Schematic Vector & Balanced Ledger Motif */}
            <div className="my-5 p-4 rounded-md bg-parchment-50 border border-hairline font-mono text-[11px] space-y-3">
              <div className="flex items-center justify-between text-ink-600 pb-2 border-b border-hairline text-[10px] uppercase tracking-wider">
                <span className="font-bold flex items-center gap-1.5 font-sans">
                  <Scale className="w-3.5 h-3.5 text-forest-800" /> Multi-Row Balanced Trigger
                </span>
                <span className="text-forest-800 font-bold bg-sage-100 px-2 py-0.5 rounded border border-moss-300">
                  ∑ Debits == ∑ Credits
                </span>
              </div>

              <div className="flex items-center justify-center py-2">
                <LedgerMotif type="balance" size="md" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-surface border border-hairline">
                  <span className="block text-ink-500 font-sans">Source Debit</span>
                  <span className="font-bold text-copper-700 mt-0.5 block">Liabilities ↓</span>
                </div>
                <div className="p-2 rounded bg-surface border border-hairline">
                  <span className="block text-ink-500 font-sans">System Clearing</span>
                  <span className="font-bold text-ink-900 mt-0.5 block">INR-SYS-CLR</span>
                </div>
                <div className="p-2 rounded bg-surface border border-hairline">
                  <span className="block text-ink-500 font-sans">Dest Credit</span>
                  <span className="font-bold text-forest-800 mt-0.5 block">Liabilities ↑</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-between text-[11px] text-ink-600 font-sans">
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-forest-800" />
              <span>Closed-Ledger Conservation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-copper-700" />
              <span>Advisory ML</span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Form */}
        <div className="lg:col-span-6 bg-surface border-2 border-hairline rounded-lg p-6 sm:p-8 flex flex-col justify-between shadow-atelier">
          <div>
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-hairline">
              <div>
                <h2 className="text-base font-serif font-bold text-ink-950">Authenticate Session</h2>
                <p className="text-xs text-ink-500 mt-0.5 font-sans">Institutional ledger clearance</p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-moss-300 bg-sage-100 text-forest-800 font-bold">
                PostgreSQL 16
              </span>
            </div>

            {error && <ErrorBanner message={error} className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1.5 font-sans">
                  Account Identifier
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Enter registered username or email"
                    className="w-full bg-parchment-50 border border-hairline rounded pl-10 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-ink-700 uppercase tracking-wider font-sans">
                    Passphrase Credential
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-parchment-50 border border-hairline rounded pl-10 pr-10 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4 text-white" />}
                  className="w-full font-bold shadow-md"
                >
                  Sign In to Ledger
                </Button>
              </div>
            </form>

            {/* Persona Quick Selection */}
            <div className="mt-6 pt-4 border-t border-hairline">
              <span className="text-[10px] font-sans uppercase tracking-wider text-ink-500 block mb-2 font-bold">
                1-Click Demonstration Personas
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectDemoPersona('customer')}
                  className="p-2.5 text-left bg-parchment-50 hover:bg-sage-100 border border-hairline hover:border-moss-300 rounded transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-forest-800 flex items-center gap-1.5 font-sans">
                    <User className="w-3.5 h-3.5" /> Customer Client
                  </div>
                  <div className="text-[10px] text-ink-600 mt-0.5 font-mono">saksham_customer</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemoPersona('staff')}
                  className="p-2.5 text-left bg-parchment-50 hover:bg-clay-100 border border-hairline hover:border-clay-300 rounded transition-colors group cursor-pointer"
                >
                  <div className="font-bold text-copper-800 flex items-center gap-1.5 font-sans">
                    <Building2 className="w-3.5 h-3.5" /> Forensic Staff
                  </div>
                  <div className="text-[10px] text-ink-600 mt-0.5 font-mono">staff_admin</div>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-hairline text-center text-xs text-ink-600 font-sans">
            Need a new account?{' '}
            <Link to="/register" className="text-forest-800 font-bold hover:underline">
              Provision Customer Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
