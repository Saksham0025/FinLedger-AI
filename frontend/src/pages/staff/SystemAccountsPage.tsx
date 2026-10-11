import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { Account, LedgerEntry } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { getErrorMessage } from '../../api/client';
import { Search, RefreshCw, FileText } from 'lucide-react';

export const SystemAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectAccount, setInspectAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsApi.listAccounts(customerFilter.trim() || undefined);
      setAccounts(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleInspectLedger = async (acc: Account) => {
    setInspectAccount(acc);
    setIsLoadingLedger(true);
    try {
      const entries = await accountsApi.getAccountLedger(acc.id, 50, 0);
      setLedgerEntries(entries);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoadingLedger(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            System Accounts Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Universal relational database accounts browser &bull; Customer liabilities & clearing accounts
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={fetchAccounts}
          leftIcon={<RefreshCw className="w-4 h-4 text-slate-400" />}
        >
          Refresh Accounts
        </Button>
      </div>

      {/* Filter by Customer UUID */}
      <div className="p-4 rounded-xl glass-panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchAccounts();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Filter by Customer UUID (e.g. 5a4b3c2d-1234-5678-9abc-def012345678)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button variant="primary" type="submit" size="sm">
            Apply Filter
          </Button>
          {customerFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomerFilter('');
                accountsApi.listAccounts().then(setAccounts).catch(() => {});
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAccounts} />}

      {/* Accounts Table */}
      <Card
        title={`All Registered Accounts (${accounts.length})`}
        subtitle="PostgreSQL accounts table records with cached balance version"
      >
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No accounts found matching search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Account Number</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Customer Reference</th>
                  <th className="pb-3 px-3 text-right">Cached Balance</th>
                  <th className="pb-3 px-3 text-center">Version</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-100 block">
                        {acc.account_number}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px] block">
                        ID: {acc.id}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          acc.account_type === 'SAVINGS'
                            ? 'success'
                            : acc.account_type === 'INVESTMENT'
                            ? 'purple'
                            : acc.account_type === 'INTERNAL_CLEARING'
                            ? 'info'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {acc.account_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px] truncate max-w-[120px]">
                      {acc.customer_id || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay amount={acc.cached_balance} size="sm" colored />
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                      v{acc.version}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <Badge variant={acc.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {acc.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInspectLedger(acc)}
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                      >
                        Ledger
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ledger Inspection Modal */}
      {inspectAccount && (
        <Modal
          isOpen={!!inspectAccount}
          onClose={() => setInspectAccount(null)}
          title={`Ledger Postings: ${inspectAccount.account_number}`}
          description={`Double-entry postings recorded for Account UUID: ${inspectAccount.id}`}
          maxWidth="xl"
        >
          {isLoadingLedger ? (
            <LoadingSkeleton rows={4} />
          ) : ledgerEntries.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">
              Zero ledger entries recorded for this account.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                  <tr>
                    <th className="pb-2.5 px-2">Seq #</th>
                    <th className="pb-2.5 px-2">Leg</th>
                    <th className="pb-2.5 px-2">Transaction ID</th>
                    <th className="pb-2.5 px-2 text-right">Amount</th>
                    <th className="pb-2.5 px-2 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 px-2 text-slate-400 font-bold">
                        #{entry.sequence_num}
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant={entry.entry_type === 'CREDIT' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {entry.entry_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-slate-300 text-[11px] truncate max-w-[120px]">
                        {entry.transaction_id}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <CurrencyDisplay
                          amount={entry.amount}
                          sign={entry.entry_type === 'CREDIT' ? 'plus' : 'minus'}
                          colored
                          size="sm"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <DateDisplay date={entry.created_at} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
            <Button variant="primary" onClick={() => setInspectAccount(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
