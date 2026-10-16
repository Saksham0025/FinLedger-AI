import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { getErrorMessage } from '../api/client';
import { User, Mail, Lock, CheckCircle2, ArrowRight, Scale, CreditCard, Phone } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [panNumber, setPanNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim())) {
      setError('PAN number must match 10-character Indian format (e.g. ABCDE1234F)');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-ink-900 flex flex-col justify-center items-center px-4 py-8 sm:py-16 font-sans">
      <div className="w-full max-w-2xl bg-surface border border-hairline rounded-md p-6 sm:p-8 shadow-atelier">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded bg-forest-800 text-paper-50 font-serif font-bold text-xs flex items-center justify-center border border-forest-900">
                FL
              </div>
              <span className="font-serif font-bold text-base text-ink-950">
                FinLedger Atelier
              </span>
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink-950">
              Provision Customer Account
            </h1>
            <p className="text-xs text-ink-500 font-sans mt-0.5">
              Registers verified KYC identity and creates an initial INR Primary Savings Account
            </p>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-hairline bg-paper-50 text-ink-600">
            KYC Protocol
          </span>
        </div>

        {error && <ErrorBanner message={error} className="mb-4" />}

        {success ? (
          <div className="p-8 text-center space-y-3 bg-forest-50 border border-forest-200 rounded-md">
            <CheckCircle2 className="w-10 h-10 text-forest-800 mx-auto" />
            <h3 className="text-base font-serif font-bold text-forest-900">
              Customer Account Provisioned
            </h3>
            <p className="text-xs text-forest-700 font-sans max-w-md mx-auto">
              Your identity has been registered and an INR savings liability account created. Redirecting to authentication terminal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-sans transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. aarav_sharma"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aarav@example.com"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  Passphrase (Min. 8 Chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1 font-mono">
                  PAN Number (Optional, 10 Chars)
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full bg-paper-50 border border-hairline rounded pl-9 pr-3 py-2 text-xs sm:text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white font-mono uppercase transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Invariant Disclosure */}
            <div className="p-3 bg-paper-50 border border-hairline-subtle rounded text-[11px] text-ink-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-forest-800 text-[10px] uppercase font-mono tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                <span>Initial Balance Notice</span>
              </div>
              <p className="leading-relaxed">
                Opening balances are deposited against internal system clearing accounts (<code className="font-mono text-ink-800">INR-SYS-CLEARING</code>). Money is never manufactured arbitrarily.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full mt-2 font-medium"
            >
              Complete Account Provisioning
            </Button>
          </form>
        )}

        <div className="mt-6 pt-3 border-t border-hairline text-center text-xs text-ink-500">
          Already registered?{' '}
          <Link to="/login" className="text-forest-800 font-semibold hover:underline">
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
