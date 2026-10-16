import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { DepositModal } from '../../components/customer/DepositModal';
import { LedgerMotif } from '../../components/common/LedgerMotif';
import { Account, LedgerEntry } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { getErrorMessage } from '../../api/client';
import {
  Wallet,
  ArrowDownCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Scale,
  Plus,
  ShieldCheck,
  BookOpen,
  Info,
  CheckCircle2,
} from 'lucide-react';

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

  // Compute page-level debit & credit sums strictly for visible entries
  const pageDebits = ledgerEntries
    .filter((e) => e.entry_type === 'DEBIT')
    .reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

  const pageCredits = ledgerEntries
    .filter((e) => e.entry_type === 'CREDIT')
    .reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);

  return (
    <div className="space-y-7">
      {/* Editorial Folio Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-forest-800 bg-sage-100 px-2.5 py-0.5 rounded border border-moss-300">
              FOLIO // PASSBOOK REGISTRY • SECTION § 02
            </span>
            <span className="text-xs text-ink-500 font-mono">
              Relational Passbook Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950">
              Accounts & Double-Entry Passbook
            </h1>
            <Badge variant="forest" size="sm" className="hidden sm:inline-flex">
              ACID ENFORCED
            </Badge>
            <LedgerMotif type="passbook" size="sm" className="opacity-70 hidden md:block" />
          </div>

          <p className="text-xs text-ink-600 font-sans mt-1 max-w-xl">
            PostgreSQL relational source of truth with multi-row balanced postings asserted by deferred constraint triggers at transaction commit.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedAccount && selectedAccount.account_type === 'SAVINGS' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDepositAccount(selectedAccount);
                setDepositModalOpen(true);
              }}
              leftIcon={<ArrowDownCircle className="w-4 h-4 text-forest-800" />}
              className="shadow-sm font-semibold"
            >
              Deposit Funds
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            isLoading={isCreatingAccount}
            onClick={() => handleCreateAccount('CURRENT')}
            leftIcon={<Plus className="w-4 h-4 text-white" />}
            className="shadow-sm font-semibold"
          >
            Open Current Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAccounts();
              if (selectedAccountId) fetchLedger(selectedAccountId, page);
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-ink-700" />}
            className="shadow-sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAccounts} />}

      {/* Account Selection Passbook Cards */}
      {isLoadingAccounts ? (
        <LoadingSkeleton rows={2} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-6 h-6 text-forest-800" />}
          title="No Accounts Active"
          description="You currently do not have an active deposit account. Open your primary INR Savings Account to begin banking."
          action={
            <Button
              variant="primary"
              size="md"
              isLoading={isCreatingAccount}
              onClick={() => handleCreateAccount('SAVINGS')}
              leftIcon={<Plus className="w-4 h-4 text-white" />}
            >
              Open Primary Savings Account
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans uppercase font-bold tracking-wider text-ink-700">
              Select Passbook Account ({accounts.length})
            </span>
            <span className="text-[11px] font-mono text-ink-500">
              Click account card to switch statement
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              const isSavings = acc.account_type === 'SAVINGS';
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccountId(acc.id);
                    setPage(0);
                  }}
                  className={`p-5 rounded-lg cursor-pointer transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'surface-selected-green bg-forest-800 text-white border-2 border-eucalyptus-300 ring-2 ring-forest-950 border-l-5 border-l-sage-200 shadow-hero'
                      : 'bg-mist-100 border-2 border-eucalyptus-300 hover:border-forest-700 hover:bg-sage-100 shadow-atelier'
                  }`}
                >
                  {/* Selected Indicator Stamp */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-forest-950 text-white text-[9px] font-mono px-2.5 py-0.5 rounded-bl font-bold uppercase tracking-widest flex items-center gap-1 shadow-xs border-b border-l border-forest-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE PASSBOOK
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-forest-900 text-white border-forest-700'
                          : isSavings
                          ? 'bg-sage-200 text-forest-900 border-eucalyptus-400'
                          : 'bg-mist-200 text-forest-800 border-eucalyptus-300'
                      }`}>
                        {acc.account_type}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'text-sage-100 bg-forest-900/90 border-forest-700'
                          : 'text-forest-700 bg-white border-eucalyptus-300'
                      }`}>
                        OCC v{acc.version}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className={`font-mono text-base font-bold block tracking-wider flex items-center gap-1.5 ${
                        isSelected ? 'text-white' : 'text-forest-950'
                      }`}>
                        <BookOpen className={`w-4 h-4 ${isSelected ? 'text-sage-200' : 'text-forest-800'}`} />
                        {acc.account_number}
                      </span>
                      <p className={`text-[10px] font-mono truncate ${
                        isSelected ? 'text-sage-100' : 'text-forest-700'
                      }`}>
                        UUID: {acc.id}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-baseline justify-between ${
                    isSelected ? 'border-forest-700' : 'border-eucalyptus-200'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-sans uppercase tracking-wider font-semibold block ${
                        isSelected ? 'text-sage-100' : 'text-forest-700'
                      }`}>
                        Cached Balance
                      </span>
                      <CurrencyDisplay
                        amount={acc.cached_balance}
                        size="lg"
                        className={`font-serif font-bold tabular-nums ${
                          isSelected ? 'text-white font-bold' : 'text-forest-950 font-bold'
                        }`}
                      />
                    </div>

                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      isSelected
                        ? 'text-emerald-300 bg-forest-950 border-forest-700'
                        : 'text-forest-800 bg-sage-200 border-eucalyptus-300'
                    }`}>
                      STATUS: {acc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Digital Passbook Statement Table */}
      {selectedAccount && (
        <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg overflow-hidden shadow-atelier">
          {/* Statement Header */}
          <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-sage-200" />
                <h3 className="text-base font-serif font-bold text-white">
                  Passbook Statement: <span className="font-mono font-bold text-sage-100">{selectedAccount.account_number}</span>
                </h3>
                <span className="text-[10px] font-sans uppercase tracking-wider px-2 py-0.5 rounded bg-forest-950 text-sage-200 border border-forest-800 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Balanced Postings
                </span>
              </div>
              <p className="text-xs text-sage-100 font-sans mt-0.5">
                PostgreSQL Constraint Trigger: &Sigma; Debits &minus; &Sigma; Credits = 0 asserted at transaction commit
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs text-sage-100 font-mono font-medium bg-forest-950 px-2.5 py-1 rounded border border-forest-800">
                Page {page + 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoadingLedger}
                className="px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-forest-800" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={ledgerEntries.length < pageSize || isLoadingLedger}
                className="px-2.5"
              >
                <ChevronRight className="w-3.5 h-3.5 text-forest-800" />
              </Button>
            </div>
          </div>

          {isLoadingLedger ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-12 text-center bg-white/70">
              <div className="w-12 h-12 rounded-full bg-mist-100 border border-eucalyptus-300 flex items-center justify-center mx-auto mb-3 text-forest-700">
                <Scale className="w-6 h-6 text-forest-800" />
              </div>
              <h4 className="text-base font-serif font-bold text-forest-950">No Ledger Postings Recorded</h4>
              <p className="text-xs text-forest-700 max-w-sm mx-auto mt-1 font-sans">
                No debit or credit legs have posted to this account yet. Perform a deposit or receive a transfer to generate records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="table-header-forest text-[10px] uppercase font-bold tracking-wider text-white bg-forest-950 border-b border-forest-900">
                  <tr>
                    <th className="py-3 px-4 font-mono text-white"># Seq</th>
                    <th className="py-3 px-4 text-center text-white">Posting Leg</th>
                    <th className="py-3 px-4 font-mono text-white">Transaction Reference</th>
                    <th className="py-3 px-4 text-right text-white">Debit (Liabilities &darr;)</th>
                    <th className="py-3 px-4 text-right text-white">Credit (Liabilities &uarr;)</th>
                    <th className="py-3 px-4 text-right text-white">Committed Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-eucalyptus-200 bg-white/80">
                  {ledgerEntries.map((entry) => {
                    const isCredit = entry.entry_type === 'CREDIT';
                    return (
                      <tr key={entry.id} className="hover:bg-sage-100/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-forest-950 tabular-nums">
                          #{entry.sequence_num}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            isCredit
                              ? 'bg-sage-200 text-forest-900 border-eucalyptus-400 font-bold'
                              : 'bg-clay-100 text-copper-900 border-clay-300 font-bold'
                          }`}>
                            {entry.entry_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-forest-800 text-[11px] truncate max-w-[170px]">
                          {entry.transaction_id}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                          {!isCredit ? (
                            <span className="text-copper-700 bg-clay-50 px-2 py-0.5 rounded border border-clay-200 font-bold">
                              - <CurrencyDisplay amount={entry.amount} size="sm" />
                            </span>
                          ) : (
                            <span className="text-forest-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                          {isCredit ? (
                            <span className="text-forest-800 bg-sage-200 px-2 py-0.5 rounded border border-eucalyptus-400 font-bold">
                              + <CurrencyDisplay amount={entry.amount} size="sm" />
                            </span>
                          ) : (
                            <span className="text-forest-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-forest-700 text-[11px] font-sans">
                          <DateDisplay date={entry.created_at} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Page Totals Summary Footer */}
                <tfoot className="bg-sage-200 border-t-2 border-eucalyptus-400 font-mono text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 font-bold text-forest-950 uppercase tracking-wider text-[10px]">
                      Visible Page Settlement Totals ({ledgerEntries.length} legs)
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-copper-800 tabular-nums">
                      - <CurrencyDisplay amount={pageDebits} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-forest-900 tabular-nums">
                      + <CurrencyDisplay amount={pageCredits} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-[10px] text-forest-700 font-sans">
                      Indian Standard Time (IST)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Statement Footer: Accounting Invariant Disclosure */}
          <div className="p-4 bg-mist-100 border-t border-eucalyptus-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-forest-900 font-sans">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-forest-800 shrink-0" />
              <span>
                Double-Entry Accounting Convention: Every financial action posts equal and offsetting debit and credit legs.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-forest-900 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-forest-800" />
              <span className="font-semibold text-forest-800">Liabilities Rule:</span>
              <span>Debits reduce balance; Credits increase balance.</span>
            </div>
          </div>
        </div>
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
