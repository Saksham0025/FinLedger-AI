import React, { useEffect, useState } from 'react';
import { Printer, BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { PassbookTable, dateInputToIso } from '../../components/common/PassbookTable';
import { accountsApi } from '../../api/accounts';
import { statementsApi } from '../../api/interbank';
import { getErrorMessage } from '../../api/client';
import { Account, AccountPassbook, CustomerPassbook } from '../../types/api';

const ALL = 'ALL';
const inputClass =
  'border border-eucalyptus-300 rounded px-2 py-1.5 text-sm bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-forest-600';

export const PassbookPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [books, setBooks] = useState<AccountPassbook[]>([]);
  const [customer, setCustomer] = useState<CustomerPassbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountsApi
      .listAccounts()
      .then(setAccounts)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const period = { date_from: dateInputToIso(from), date_to: dateInputToIso(to, true) };
    try {
      if (selected === ALL) {
        const c = await statementsApi.customerPassbook(undefined, period);
        setCustomer(c);
        setBooks(c.accounts);
      } else {
        setCustomer(null);
        setBooks([await statementsApi.accountPassbook(selected, period)]);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Passbook"
        description="Every posting with its running balance, recomputed from the ledger. Choose one account or see all your accounts across banks."
        action={
          <Button variant="secondary" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-xs text-ink-600 flex flex-col gap-1">
          Account
          <select className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value={ALL}>All my accounts (customer-wise)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number} · {a.bank_code} · {a.account_type.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-600 flex flex-col gap-1">
          From
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs text-ink-600 flex flex-col gap-1">
          To
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {customer && (
        <div className="flex items-center justify-between rounded-lg bg-forest-800 text-white px-5 py-4">
          <span>
            <span className="block text-xs text-sage-100">{customer.full_name}</span>
            <span className="text-sm">
              {customer.accounts.length} account{customer.accounts.length === 1 ? '' : 's'} across{' '}
              {new Set(customer.accounts.map((a) => a.bank_code)).size} bank(s)
            </span>
          </span>
          <span className="text-right">
            <span className="block text-xs text-sage-100">Combined closing balance</span>
            <CurrencyDisplay amount={customer.total_closing_balance} size="xl" className="text-white" />
          </span>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-forest-800" />}
          title="No accounts yet"
          description="Open an account to start your passbook."
        />
      ) : (
        <div className="space-y-6">
          {books.map((b) => (
            <PassbookTable key={b.account_id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
};
