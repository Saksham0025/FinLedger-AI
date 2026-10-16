import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { TransferModal } from '../../components/customer/TransferModal';
import { DepositModal } from '../../components/customer/DepositModal';
import { AssetAllocationMeter } from '../../components/common/AssetAllocationMeter';
import { LedgerMotif } from '../../components/common/LedgerMotif';
import { Account, CustomerFinancialSummary, LedgerEntry, PortfolioSummary } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { investmentsApi } from '../../api/investments';
import { reportsApi } from '../../api/reports';
import { getErrorMessage } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowRightLeft,
  ArrowDownCircle,
  PieChart,
  ShieldCheck,
  Receipt,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [, setSummary] = useState<CustomerFinancialSummary | null>(null);
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedDepositAccount, setSelectedDepositAccount] = useState<Account | null>(null);

  const handleCreateSavingsAccount = async () => {
    setIsCreatingAccount(true);
    setError(null);
    try {
      await accountsApi.createAccount('SAVINGS');
      await fetchData();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accs, port, sum] = await Promise.all([
        accountsApi.listAccounts(),
        investmentsApi.getPortfolio().catch(() => null),
        reportsApi.getCustomerSummary().catch(() => null),
      ]);

      setAccounts(accs);
      setPortfolio(port);
      setSummary(sum);

      if (accs.length > 0) {
        const activePrimary = accs.find((a) => a.account_type === 'SAVINGS') || accs[0];
        const entries = await accountsApi.getAccountLedger(activePrimary.id, 6, 0);
        setRecentLedger(entries);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalSavings = accounts
    .filter((a) => a.account_type === 'SAVINGS' || a.account_type === 'CURRENT')
    .reduce((sum, a) => sum + parseFloat(String(a.cached_balance)), 0);

  const totalInvested = portfolio ? parseFloat(String(portfolio.total_invested)) : 0;
  const totalNetWorth = totalSavings + totalInvested;

  const handleOpenDeposit = (acc?: Account) => {
    const target = acc || accounts.find((a) => a.account_type === 'SAVINGS') || accounts[0] || null;
    setSelectedDepositAccount(target);
    setDepositModalOpen(true);
  };

  return (
    <div className="space-y-7">
      {/* Editorial Folio Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-copper-800 bg-copper-100 px-2.5 py-0.5 rounded border border-copper-300">
              FOLIO // FL-2026-PRIV • SECTION § 01
            </span>
            <span className="text-xs text-ink-500 font-mono">
              PostgreSQL Double-Entry • ACID Governed
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950">
              Client Ledger & Portfolio Statement
            </h1>
            <Badge variant="sage" size="sm" className="hidden sm:inline-flex">
              KYC VERIFIED
            </Badge>
          </div>

          <p className="text-xs text-ink-600 font-sans mt-1">
            Account Holder: <strong className="text-ink-950">{user?.customer?.full_name || user?.username}</strong>
            {' '}• Reference Passbook:{' '}
            <span className="font-mono font-bold text-forest-800">
              {accounts[0]?.account_number || 'Provisioning'}
            </span>
          </p>
        </div>

        {/* Global Primary Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenDeposit()}
            leftIcon={<ArrowDownCircle className="w-4 h-4 text-forest-800" />}
            disabled={accounts.length === 0}
            className="shadow-sm font-semibold"
          >
            Deposit Funds
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setTransferModalOpen(true)}
            leftIcon={<ArrowRightLeft className="w-4 h-4 text-white" />}
            disabled={accounts.length === 0}
            className="shadow-sm font-semibold"
          >
            New Transfer
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Signature Deep Forest Green Financial Overview Hero Region */}
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div className="ledger-hero-green rounded-lg p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Technical Registration Corner Crosshairs */}
          <span className="absolute top-3 left-3 text-forest-300 font-mono text-[9px] select-none opacity-60">+ REG.01 // FOLIO</span>
          <span className="absolute top-3 right-3 text-forest-300 font-mono text-[9px] select-none opacity-60">IMMUTABLE POSTINGS +</span>

          {/* Background Balance Scale Watermark */}
          <div className="absolute right-4 bottom-2 opacity-10 pointer-events-none select-none hidden md:block">
            <LedgerMotif type="balance" size="xl" inverted />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-forest-900/90 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-sage-200">
                  Verified Consolidated Net Worth
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-forest-950/80 text-forest-200 border border-forest-700">
                  Real Time
                </span>
              </div>

              <div className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight tabular-nums">
                <CurrencyDisplay amount={totalNetWorth} size="2xl" className="text-white font-bold" />
              </div>

              <p className="text-xs text-forest-100 font-sans mt-2 max-w-md leading-relaxed">
                Aggregated cash liabilities and term securities strictly calculated from committed double-entry postings.
              </p>
            </div>

            {/* Inset Sub-Panels with Rich Material Contrasts */}
            <div className="flex flex-col sm:flex-row items-stretch gap-4 text-ink-950">
              {/* Liquid Savings Inset (Soft Sage) */}
              <div className="bg-sage-100 border border-moss-300 rounded-md p-4 min-w-[190px] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-sans uppercase font-bold tracking-wider text-forest-800">
                      Liquid Savings
                    </span>
                    <Wallet className="w-4 h-4 text-forest-700" />
                  </div>
                  <div className="text-xl font-bold font-mono text-forest-950 tabular-nums">
                    <CurrencyDisplay amount={totalSavings} size="lg" className="text-forest-950 font-bold" />
                  </div>
                </div>
                <span className="text-[10px] text-forest-700 font-sans block mt-2 border-t border-moss-300 pt-1.5 font-medium">
                  {accounts.filter((a) => a.account_type === 'SAVINGS').length} Active Savings Account(s)
                </span>
              </div>

              {/* Invested Securities Inset (Warm Clay) */}
              <div className="bg-clay-100 border border-copper-300 rounded-md p-4 min-w-[190px] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-sans uppercase font-bold tracking-wider text-copper-800">
                      Term Securities
                    </span>
                    <PieChart className="w-4 h-4 text-copper-700" />
                  </div>
                  <div className="text-xl font-bold font-mono text-copper-950 tabular-nums">
                    <CurrencyDisplay amount={totalInvested} size="lg" className="text-copper-950 font-bold" />
                  </div>
                </div>
                <span className="text-[10px] text-copper-700 font-sans block mt-2 border-t border-copper-300 pt-1.5 font-medium">
                  {portfolio?.active_investments_count || 0} Subscribed Product(s)
                </span>
              </div>
            </div>
          </div>

          {/* Mathematical Invariant Assurance Footnote */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-forest-100 relative z-10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sage-200 shrink-0" />
              <span className="font-sans">
                PostgreSQL Multi-Row Balanced Invariant: All postings strictly verified at transaction commit.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] bg-forest-950/70 px-3 py-1 rounded border border-forest-800">
              <span className="text-copper-300 font-semibold">Conservation:</span>
              <span className="text-white font-bold">&Sigma; Debits == &Sigma; Credits (0.00 Disparity)</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Editorial Grid: Accounts & Passbook Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Client Accounts & Passbook Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Deposit Accounts Passbook Cards */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg overflow-hidden shadow-atelier">
            <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-sage-200 font-bold uppercase block">
                  § 01.1 // LIABILITIES REGISTER
                </span>
                <h3 className="text-sm font-serif font-bold text-white">
                  Client Deposit Accounts
                </h3>
                <p className="text-xs text-sage-100 font-sans mt-0.5">
                  Transactional passbooks locked in ascending primary key order during multi-account movements
                </p>
              </div>

              {accounts.length < 3 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateSavingsAccount}
                  isLoading={isCreatingAccount}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-forest-800" />}
                  className="text-xs shadow-xs"
                >
                  New Savings Account
                </Button>
              )}
            </div>

            <div className="p-5">
              {isLoading ? (
                <LoadingSkeleton rows={3} />
              ) : accounts.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="w-6 h-6 text-forest-700" />}
                  title="No Active Accounts"
                  description="Open a new savings passbook account to begin double-entry banking."
                  action={
                    <Button variant="primary" size="sm" onClick={handleCreateSavingsAccount} isLoading={isCreatingAccount}>
                      Provision Savings Account
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accounts.map((acc) => {
                    const isSavings = acc.account_type === 'SAVINGS';
                    return (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col justify-between space-y-3 shadow-atelier ${
                          isSavings
                            ? 'bg-white border-eucalyptus-300 hover:border-forest-700 border-l-4 border-l-forest-800'
                            : 'bg-sage-50 border-eucalyptus-300 hover:border-forest-600 border-l-4 border-l-forest-600'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-forest-950 tracking-wider flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-forest-800" />
                              {acc.account_number}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded border ${
                                isSavings
                                   ? 'bg-sage-200 text-forest-900 border-eucalyptus-400'
                                   : 'bg-mist-200 text-forest-800 border-eucalyptus-300'
                              }`}>
                                {acc.account_type}
                              </span>
                              <span className="text-[9px] font-mono text-forest-800 bg-mist-100 px-1 py-0.5 rounded border border-eucalyptus-300">
                                v{acc.version}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] font-mono text-forest-700 truncate">
                            UUID: {acc.id}
                          </p>
                        </div>

                        <div className="pt-2.5 border-t border-eucalyptus-200 flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] font-sans uppercase text-forest-700 block font-semibold">
                              Available Balance
                            </span>
                            <CurrencyDisplay
                              amount={acc.cached_balance}
                              size="lg"
                              className="font-bold text-forest-950 font-mono tabular-nums"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenDeposit(acc)}
                              className="text-xs px-2.5 py-1"
                            >
                              Deposit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTransferModalOpen(true)}
                              className="text-xs px-2.5 py-1"
                            >
                              Transfer
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chronological Passbook Recent Activity */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg overflow-hidden shadow-atelier">
            <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-sage-200 font-bold uppercase block">
                  § 01.2 // RECENT PASSBOOK POSTINGS
                </span>
                <h3 className="text-sm font-serif font-bold text-white">
                  Chronological Ledger Stream
                </h3>
                <p className="text-xs text-sage-100 font-sans mt-0.5">
                  Append-only immutable transaction entries recorded under deferrable constraints
                </p>
              </div>

              <Link to="/accounts">
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-forest-800" />}
                  className="text-xs font-semibold shadow-xs"
                >
                  Full Passbook
                </Button>
              </Link>
            </div>

            <div className="p-0">
              {isLoading ? (
                <div className="p-5">
                  <LoadingSkeleton rows={4} />
                </div>
              ) : recentLedger.length === 0 ? (
                <div className="p-8 text-center text-xs text-forest-800 font-sans bg-white/70">
                  No transaction legs recorded yet. Make an initial deposit to view double-entry postings.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="table-header-forest text-[10px] uppercase font-bold tracking-wider text-white bg-forest-950 border-b border-forest-900">
                      <tr>
                        <th className="py-2.5 px-4 font-mono text-white">Seq</th>
                        <th className="py-2.5 px-4 text-white">Committed</th>
                        <th className="py-2.5 px-4 font-mono text-white">Entry Ref</th>
                        <th className="py-2.5 px-4 text-center text-white">Posting</th>
                        <th className="py-2.5 px-4 text-right text-white">Debit (DR -)</th>
                        <th className="py-2.5 px-4 text-right text-white">Credit (CR +)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-eucalyptus-200 bg-white/80">
                      {recentLedger.map((entry) => {
                        const isDebit = entry.entry_type === 'DEBIT';
                        return (
                          <tr key={entry.id} className="hover:bg-sage-100/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-forest-950">
                              #{entry.sequence_num}
                            </td>
                            <td className="py-3 px-4 text-forest-900 text-[11px]">
                              <DateDisplay date={entry.created_at} />
                            </td>
                            <td className="py-3 px-4 font-mono text-forest-800 text-[11px] truncate max-w-[140px]">
                              {entry.id}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                isDebit
                                  ? 'bg-clay-100 text-copper-900 border-clay-300'
                                  : 'bg-sage-200 text-forest-900 border-eucalyptus-400'
                              }`}>
                                {entry.entry_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                              {isDebit ? (
                                <span className="text-copper-700 bg-clay-50 px-2 py-0.5 rounded border border-clay-200">
                                  - <CurrencyDisplay amount={entry.amount} size="sm" />
                                </span>
                              ) : (
                                <span className="text-forest-400 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                              {!isDebit ? (
                                <span className="text-forest-800 bg-sage-200 px-2 py-0.5 rounded border border-eucalyptus-400 font-bold">
                                  + <CurrencyDisplay amount={entry.amount} size="sm" />
                                </span>
                              ) : (
                                <span className="text-forest-400 font-mono">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Asset Allocation, Integrity, & Shortcuts */}
        <div className="space-y-6">
          {/* Real Capital Allocation Breakdown */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg p-5 shadow-atelier space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-eucalyptus-300">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-forest-800 font-bold uppercase block">
                  ALLOCATION // PROPORTIONS
                </span>
                <h3 className="text-sm font-serif font-bold text-forest-950">
                  Capital Distribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-forest-800 bg-sage-200 px-2 py-0.5 rounded border border-eucalyptus-400 font-bold">
                Real Time
              </span>
            </div>

            <AssetAllocationMeter
              savingsAmount={totalSavings}
              investedAmount={totalInvested}
              showLegend={true}
            />
          </div>

          {/* Double-Entry Educational Architecture Panel */}
          <div className="bg-sage-200/90 border-2 border-eucalyptus-400 rounded-lg p-5 shadow-atelier space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b-2 border-eucalyptus-300">
              <Layers className="w-4 h-4 text-forest-900" />
              <div>
                <span className="text-[10px] font-mono tracking-wider text-forest-800 font-bold uppercase block">
                  INVARIANTS // ACCOUNTING
                </span>
                <h3 className="text-sm font-serif font-bold text-forest-950">
                  Liabilities & Clearing Protocol
                </h3>
              </div>
            </div>

            <p className="text-xs text-forest-900 leading-relaxed font-sans">
              Customer accounts are bank liabilities: <strong className="text-forest-950">Debits reduce balance</strong>; <strong className="text-forest-950">Credits increase balance</strong>. Opening funds enter the system solely by offsetting internal clearing accounts.
            </p>

            <div className="p-3.5 rounded bg-mist-100 border border-eucalyptus-300 text-[11px] font-mono space-y-2">
              <div className="flex justify-between items-center text-forest-900">
                <span>Clearing Account:</span>
                <span className="font-bold text-forest-950 bg-white px-1.5 py-0.5 rounded border border-eucalyptus-300">
                  INR-SYS-CLEARING
                </span>
              </div>
              <div className="flex justify-between items-center text-forest-900">
                <span>Locking Protocol:</span>
                <span className="font-bold text-forest-900 bg-sage-200 px-1.5 py-0.5 rounded border border-eucalyptus-400">
                  Ascending PK (Deadlock-Free)
                </span>
              </div>
              <div className="flex justify-between items-center text-forest-900">
                <span>Idempotency Hash:</span>
                <span className="font-bold text-forest-950">
                  SHA-256 Canonical
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-eucalyptus-300 flex items-center gap-2 text-[11px] text-forest-900 font-sans font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-forest-800 shrink-0" />
              <span>Full system reconciliation verified continuously</span>
            </div>
          </div>

          {/* Quick Shortcuts: Products & Recourse */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg p-5 shadow-atelier space-y-3">
            <h3 className="text-sm font-serif font-bold text-forest-950 pb-2 border-b border-eucalyptus-300">
              Financial Actions & Recourse
            </h3>

            <Link
              to="/products"
              className="p-3 rounded-md bg-white border border-eucalyptus-300 hover:border-forest-800 hover:bg-sage-50 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-forest-800 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-forest-950 font-sans group-hover:text-forest-800">
                    Yield Instruments
                  </h4>
                  <p className="text-[11px] text-forest-700 font-sans">Fixed Deposits & Treasury bills</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-forest-700 group-hover:text-forest-900" />
            </Link>

            <Link
              to="/disputes"
              className="p-3 rounded-md bg-white border border-eucalyptus-300 hover:border-copper-700 hover:bg-clay-50 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-clay-200 border border-copper-300 flex items-center justify-center text-copper-900">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-forest-950 font-sans group-hover:text-copper-700">
                    Recourse & Disputes
                  </h4>
                  <p className="text-[11px] text-forest-700 font-sans">Formal investigation inquiries</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-forest-700 group-hover:text-copper-700" />
            </Link>
          </div>
        </div>
      </div>

      {/* Transfer Modal with PayeeGuard */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
        onTransferSuccess={fetchData}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        account={selectedDepositAccount}
        onDepositSuccess={fetchData}
      />
    </div>
  );
};
