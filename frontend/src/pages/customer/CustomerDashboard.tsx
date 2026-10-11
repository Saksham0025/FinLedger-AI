import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { TransferModal } from '../../components/customer/TransferModal';
import { DepositModal } from '../../components/customer/DepositModal';
import { Account, CustomerFinancialSummary, LedgerEntry, PortfolioSummary } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { investmentsApi } from '../../api/investments';
import { reportsApi } from '../../api/reports';
import { getErrorMessage } from '../../api/client';
import {
  Wallet,
  ArrowRightLeft,
  ArrowDownCircle,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Plus,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [summary, setSummary] = useState<CustomerFinancialSummary | null>(null);
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

      // Fetch recent ledger entries from first active account
      if (accs.length > 0) {
        const activePrimary = accs.find((a) => a.account_type === 'SAVINGS') || accs[0];
        const entries = await accountsApi.getAccountLedger(activePrimary.id, 5, 0);
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

  const totalInvested = portfolio
    ? parseFloat(String(portfolio.total_invested))
    : summary
    ? parseFloat(String(summary.total_invested_balance))
    : 0;

  const totalNetWorth = totalSavings + totalInvested;

  const handleOpenDeposit = (acc?: Account) => {
    const target = acc || accounts.find((a) => a.account_type === 'SAVINGS') || accounts[0] || null;
    setSelectedDepositAccount(target);
    setDepositModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome header & quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Welcome back, {user?.customer?.full_name || user?.username}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative double-entry ledger overview &bull; Denominated in INR (₹)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleOpenDeposit()}
            leftIcon={<ArrowDownCircle className="w-4 h-4 text-emerald-400" />}
            disabled={accounts.length === 0}
          >
            Deposit Funds
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setTransferModalOpen(true)}
            leftIcon={<ArrowRightLeft className="w-4 h-4" />}
            disabled={accounts.length === 0}
          >
            New Transfer
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* KPI Metric Cards */}
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow="emerald">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Net Worth</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <CurrencyDisplay amount={totalNetWorth} size="2xl" colored />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Liquid savings + investment holdings
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Available Savings</span>
              <Wallet className="w-4 h-4 text-cyan-400" />
            </div>
            <CurrencyDisplay amount={totalSavings} size="2xl" />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Across {accounts.filter((a) => a.account_type === 'SAVINGS').length} Savings account(s)
            </p>
          </Card>

          <Card glow="amber">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Invested Assets</span>
              <PieChart className="w-4 h-4 text-amber-400" />
            </div>
            <CurrencyDisplay amount={totalInvested} size="2xl" />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {portfolio?.active_investments_count || 0} active simulated position(s)
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Ledger Security</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="success" size="md">
                100% Balanced
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Deferrable PostgreSQL trigger enforced
            </p>
          </Card>
        </div>
      )}

      {/* Accounts List & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Accounts Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Active Deposit & Investment Accounts"
            subtitle="Authoritative PostgreSQL accounts with real-time balance caching"
          >
            {isLoading ? (
              <LoadingSkeleton rows={3} />
            ) : accounts.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-6 h-6 text-emerald-400" />}
                title="No Accounts Active"
                description="You do not have an active account yet. Open your primary INR Savings Account to begin banking."
                action={
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={isCreatingAccount}
                    onClick={handleCreateSavingsAccount}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Open Primary Savings Account
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {acc.account_number}
                        </span>
                        <Badge
                          variant={
                            acc.account_type === 'SAVINGS'
                              ? 'success'
                              : acc.account_type === 'INVESTMENT'
                              ? 'purple'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {acc.account_type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Account ID: {acc.id} &bull; Status: {acc.status}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                          Balance
                        </span>
                        <CurrencyDisplay amount={acc.cached_balance} size="lg" />
                      </div>

                      {acc.account_type === 'SAVINGS' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDeposit(acc)}
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                        >
                          Deposit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Double-Entry Ledger History */}
          <Card
            title="Recent Ledger Postings"
            subtitle="Immutable double-entry legs posted directly to PostgreSQL"
          >
            {isLoading ? (
              <LoadingSkeleton rows={3} />
            ) : recentLedger.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No Ledger History"
                description="Make your first deposit or transfer to generate double-entry ledger postings."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                    <tr>
                      <th className="pb-2.5">Seq #</th>
                      <th className="pb-2.5">Type</th>
                      <th className="pb-2.5">Transaction ID</th>
                      <th className="pb-2.5 text-right">Amount</th>
                      <th className="pb-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {recentLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 text-slate-400">#{entry.sequence_num}</td>
                        <td className="py-2.5">
                          <Badge
                            variant={entry.entry_type === 'CREDIT' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {entry.entry_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-slate-300 truncate max-w-[120px]">
                          {entry.transaction_id}
                        </td>
                        <td className="py-2.5 text-right">
                          <CurrencyDisplay
                            amount={entry.amount}
                            sign={entry.entry_type === 'CREDIT' ? 'plus' : 'minus'}
                            colored
                            size="sm"
                          />
                        </td>
                        <td className="py-2.5 text-right">
                          <DateDisplay date={entry.created_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Portfolio & Transfer summary */}
        <div className="space-y-6">
          <Card
            title="Asset Allocation"
            subtitle="Distribution by investment product type"
          >
            {portfolio && Object.keys(portfolio.allocation_by_product_type || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(portfolio.allocation_by_product_type).map(([ptype, val]) => {
                  const numVal = parseFloat(String(val));
                  const pct = totalInvested > 0 ? ((numVal / totalInvested) * 100).toFixed(1) : '0';
                  return (
                    <div key={ptype} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300">{ptype}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{pct}%</span>
                          <CurrencyDisplay amount={val} size="sm" />
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<PieChart className="w-5 h-5" />}
                title="Zero Active Investments"
                description="Explore simulated fixed deposits and mutual funds in the Financial Products catalogue."
              />
            )}
          </Card>

          {/* Transfer statistics summary */}
          <Card title="Activity Summary">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Transfers Sent</span>
                <span className="font-mono text-slate-200">
                  {summary?.total_transfers_sent_count ?? 0} (
                  <CurrencyDisplay amount={summary?.total_transfers_sent_volume ?? 0} size="sm" />)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Transfers Received</span>
                <span className="font-mono text-slate-200">
                  {summary?.total_transfers_received_count ?? 0} (
                  <CurrencyDisplay
                    amount={summary?.total_transfers_received_volume ?? 0}
                    size="sm"
                  />
                  )
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Active Investment Count</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {portfolio?.active_investments_count ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
        onTransferSuccess={fetchData}
      />

      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        account={selectedDepositAccount}
        onDepositSuccess={fetchData}
      />
    </div>
  );
};
