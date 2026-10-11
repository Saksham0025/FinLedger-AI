import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { DepositModal } from '../../components/customer/DepositModal';
import { Account, LedgerEntry } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { getErrorMessage } from '../../api/client';
import { Wallet, ArrowDownCircle, RefreshCw, ChevronLeft, ChevronRight, Scale, Plus } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAccount, setDepositAccount] = useState<Account | null>(null);

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    setError(null);
    try {
      const data = await accountsApi.listAccounts();
      setAccounts(data);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleCreateAccount = async (accountType: 'SAVINGS' | 'CURRENT' = 'SAVINGS') => {
    setIsCreatingAccount(true);
    setError(null);
    try {
      const newAcc = await accountsApi.createAccount(accountType);
      await fetchAccounts();
      setSelectedAccountId(newAcc.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const fetchLedger = async (accId: string, pageNum: number) => {
    if (!accId) return;
    setIsLoadingLedger(true);
    setError(null);
    try {
      const entries = await accountsApi.getAccountLedger(accId, pageSize, pageNum * pageSize);
      setLedgerEntries(entries);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger(selectedAccountId, page);
    }
  }, [selectedAccountId, page]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Accounts & Double-Entry Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time PostgreSQL balances & immutable append-only ledger transaction history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedAccount && selectedAccount.account_type === 'SAVINGS' && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setDepositAccount(selectedAccount);
                setDepositModalOpen(true);
              }}
              leftIcon={<ArrowDownCircle className="w-4 h-4 text-emerald-400" />}
            >
              Deposit Funds
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            isLoading={isCreatingAccount}
            onClick={() => handleCreateAccount('CURRENT')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Open Current Account
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              fetchAccounts();
              if (selectedAccountId) fetchLedger(selectedAccountId, page);
            }}
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-400" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAccounts} />}

      {/* Account Selector Cards */}
      {isLoadingAccounts ? (
        <LoadingSkeleton rows={2} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-6 h-6 text-emerald-400" />}
          title="No Accounts Active"
          description="You currently do not have an active deposit account. Open your primary INR Savings Account to begin banking."
          action={
            <Button
              variant="primary"
              size="md"
              isLoading={isCreatingAccount}
              onClick={() => handleCreateAccount('SAVINGS')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Open Primary Savings Account
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            return (
              <div
                key={acc.id}
                onClick={() => {
                  setSelectedAccountId(acc.id);
                  setPage(0);
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
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
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    v{acc.version}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-sm font-bold text-slate-100 block">
                    {acc.account_number}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono truncate">ID: {acc.id}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Cached Balance
                  </span>
                  <CurrencyDisplay amount={acc.cached_balance} size="lg" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ledger Entries drilldown table */}
      {selectedAccount && (
        <Card
          title={`Double-Entry Ledger History: ${selectedAccount.account_number}`}
          subtitle="PostgreSQL immutable ledger legs (Trigger DEFERRABLE INITIALLY DEFERRED enforced)"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoadingLedger}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={ledgerEntries.length < pageSize || isLoadingLedger}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          }
        >
          {isLoadingLedger ? (
            <LoadingSkeleton rows={5} />
          ) : ledgerEntries.length === 0 ? (
            <EmptyState
              icon={<Scale className="w-6 h-6" />}
              title="No Ledger Records"
              description="No debit or credit entries posted to this account yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                  <tr>
                    <th className="pb-3 px-3">Sequence</th>
                    <th className="pb-3 px-3">Entry Leg</th>
                    <th className="pb-3 px-3">Transaction Reference</th>
                    <th className="pb-3 px-3 text-right">Posting Amount</th>
                    <th className="pb-3 px-3 text-right">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 text-slate-400 font-bold">
                        #{entry.sequence_num}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={entry.entry_type === 'CREDIT' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {entry.entry_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                        {entry.transaction_id}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <CurrencyDisplay
                          amount={entry.amount}
                          sign={entry.entry_type === 'CREDIT' ? 'plus' : 'minus'}
                          colored
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <DateDisplay date={entry.created_at} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        account={depositAccount}
        onDepositSuccess={() => {
          fetchAccounts();
          if (selectedAccountId) fetchLedger(selectedAccountId, page);
        }}
      />
    </div>
  );
};
