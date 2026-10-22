import React, { useEffect, useState } from 'react';
import { Landmark, PlayCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PassbookTable } from '../../components/common/PassbookTable';
import { interbankApi, statementsApi } from '../../api/interbank';
import { getErrorMessage } from '../../api/client';
import { formatINR } from '../../utils/formatters';
import { STATUS_BADGE } from '../customer/InterbankPage';
import {
  BankBalanceSheet,
  BankCustomerRow,
  BankDayBookEntry,
  CustomerPassbook,
  InterbankTransfer,
  NeftBatchResult,
} from '../../types/api';

type Tab = 'daybook' | 'customers';

const th = 'font-medium py-2 px-3';
const td = 'py-2 px-3';

export const BanksLedgerPage: React.FC = () => {
  const [sheets, setSheets] = useState<BankBalanceSheet[]>([]);
  const [bankId, setBankId] = useState('');
  const [tab, setTab] = useState<Tab>('daybook');
  const [dayBook, setDayBook] = useState<BankDayBookEntry[]>([]);
  const [customers, setCustomers] = useState<BankCustomerRow[]>([]);
  const [passbook, setPassbook] = useState<CustomerPassbook | null>(null);
  const [payments, setPayments] = useState<InterbankTransfer[]>([]);
  const [batch, setBatch] = useState<NeftBatchResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([statementsApi.bankBalanceSheets(), interbankApi.list(undefined, 100)]);
      setSheets(s);
      setPayments(p);
      setBankId((cur) => cur || s[0]?.bank_id || '');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!bankId) return;
    setPassbook(null);
    Promise.all([statementsApi.bankDayBook(bankId), statementsApi.bankCustomers(bankId)])
      .then(([d, c]) => {
        setDayBook(d);
        setCustomers(c);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [bankId, batch]);

  const runBatch = async () => {
    setIsRunning(true);
    setError(null);
    try {
      setBatch(await interbankApi.runNeftBatch());
      await loadOverview();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsRunning(false);
    }
  };

  const openCustomer = async (customerId: string) => {
    setError(null);
    try {
      setPassbook(await statementsApi.customerPassbook(customerId));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const bank = sheets.find((s) => s.bank_id === bankId);
  const pendingNeft = payments.filter((p) => p.status === 'PENDING_SETTLEMENT' && p.rail === 'NEFT');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banks & clearing"
        description="Bank-wise balance sheets derived from the ledger, each bank's day book and customers, and the NEFT clearing desk."
        action={
          <Button variant="primary" size="sm" onClick={loadOverview} isLoading={isLoading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadOverview} />}

      <Card variant="forensic" title="Balance sheet by bank" subtitle="Deposits are what each bank owes its customers; in-flight is outward money parked in its settlement account.">
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-slate-400 border-b border-forensic-700">
                  <th className={th}>Bank</th>
                  <th className={`${th} text-right`}>Customers</th>
                  <th className={`${th} text-right`}>Accounts</th>
                  <th className={`${th} text-right`}>Customer deposits</th>
                  <th className={`${th} text-right`}>Investments</th>
                  <th className={`${th} text-right`}>In flight</th>
                  <th className={`${th} text-right`}>Inter-bank in</th>
                  <th className={`${th} text-right`}>Inter-bank out</th>
                  <th className={`${th} text-right`}>Net position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forensic-700">
                {sheets.map((s) => (
                  <tr
                    key={s.bank_id}
                    onClick={() => setBankId(s.bank_id)}
                    className={`cursor-pointer ${s.bank_id === bankId ? 'bg-forensic-800' : 'hover:bg-forensic-800/60'}`}
                  >
                    <td className={td}>
                      <span className="text-slate-100 font-sans font-semibold">{s.name}</span>
                      <span className="block text-slate-400">{s.ifsc}</span>
                    </td>
                    <td className={`${td} text-right`}>{s.customer_count}</td>
                    <td className={`${td} text-right`}>{s.account_count}</td>
                    <td className={`${td} text-right`}>{formatINR(s.customer_deposits)}</td>
                    <td className={`${td} text-right`}>{formatINR(s.investment_holdings)}</td>
                    <td className={`${td} text-right text-amber-300`}>{formatINR(s.settlement_in_flight)}</td>
                    <td className={`${td} text-right text-emerald-300`}>{formatINR(s.interbank_inward_settled)}</td>
                    <td className={`${td} text-right text-rose-300`}>{formatINR(s.interbank_outward_settled)}</td>
                    <td className={`${td} text-right`}>
                      <CurrencyDisplay amount={s.net_interbank_position} sign="auto" colored size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        variant="forensic"
        title="NEFT clearing desk"
        subtitle={`${pendingNeft.length} NEFT payment(s) awaiting the next batch. IMPS and RTGS settle in real time.`}
        action={
          <Button variant="evergreen" size="sm" onClick={runBatch} isLoading={isRunning} leftIcon={<PlayCircle className="w-4 h-4" />}>
            Run NEFT batch
          </Button>
        }
      >
        {batch && (
          <p className="mb-3 text-xs font-mono text-sage-200">
            {batch.batch_id}: {batch.settled_count} settled ({formatINR(batch.settled_amount)}), {batch.returned_count} returned (
            {formatINR(batch.returned_amount)})
          </p>
        )}
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-slate-400 border-b border-forensic-700">
                <th className={th}>Initiated</th>
                <th className={th}>UTR</th>
                <th className={th}>Rail</th>
                <th className={th}>To</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forensic-700">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className={td}><DateDisplay date={p.created_at} /></td>
                  <td className={td}>{p.utr}</td>
                  <td className={td}>{p.rail}</td>
                  <td className={td}>{p.beneficiary_account_number} · {p.beneficiary_ifsc}</td>
                  <td className={`${td} text-right`}>{formatINR(p.amount)}</td>
                  <td className={td}>
                    <Badge variant={STATUS_BADGE[p.status].variant}>{STATUS_BADGE[p.status].label}</Badge>
                    {p.batch_id && <span className="block text-slate-500">{p.batch_id}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {bank && (
        <Card
          variant="forensic"
          title={
            <span className="flex items-center gap-2 text-white text-sm font-semibold">
              <Landmark className="w-4 h-4 text-emerald-400" /> {bank.name} · {bank.ifsc}
            </span>
          }
          subtitle={`${bank.posting_count} postings · Dr ${formatINR(bank.total_debits)} · Cr ${formatINR(bank.total_credits)}`}
          action={
            <div className="flex gap-1">
              {(['daybook', 'customers'] as Tab[]).map((t) => (
                <Button key={t} size="sm" variant={tab === t ? 'evergreen' : 'ghost'} onClick={() => setTab(t)} aria-pressed={tab === t}>
                  {t === 'daybook' ? 'Day book' : 'Customers'}
                </Button>
              ))}
            </div>
          }
        >
          {tab === 'daybook' ? (
            <div className="overflow-x-auto max-h-[28rem]">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-forensic-700">
                    <th className={th}>Date</th>
                    <th className={th}>Account</th>
                    <th className={th}>Holder</th>
                    <th className={th}>Particulars</th>
                    <th className={`${th} text-right`}>Debit</th>
                    <th className={`${th} text-right`}>Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forensic-700">
                  {dayBook.map((r) => (
                    <tr key={r.entry_id}>
                      <td className={`${td} whitespace-nowrap`}><DateDisplay date={r.posted_at} /></td>
                      <td className={td}>{r.account_number}</td>
                      <td className={`${td} font-sans`}>{r.holder_name ?? (r.account_type === 'SETTLEMENT' ? 'Settlement a/c' : '—')}</td>
                      <td className={`${td} font-sans [overflow-wrap:anywhere] min-w-[14rem]`}>{r.narration}</td>
                      <td className={`${td} text-right text-rose-300`}>{r.debit ? formatINR(r.debit) : ''}</td>
                      <td className={`${td} text-right text-emerald-300`}>{r.credit ? formatINR(r.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dayBook.length === 0 && <p className="text-xs text-slate-400 py-3">No postings at this bank yet.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {customers.length === 0 && <p className="text-xs text-slate-400">No customers at this bank yet.</p>}
                {customers.map((c) => (
                  <button
                    key={c.customer_id}
                    type="button"
                    onClick={() => openCustomer(c.customer_id)}
                    aria-pressed={passbook?.customer_id === c.customer_id}
                    className={`text-left rounded border px-3 py-2 text-xs cursor-pointer ${
                      passbook?.customer_id === c.customer_id
                        ? 'border-emerald-400 bg-forensic-800'
                        : 'border-forensic-700 hover:border-emerald-500/60'
                    }`}
                  >
                    <span className="block font-semibold text-slate-100">{c.full_name}</span>
                    <span className="text-slate-400 font-mono">
                      {c.account_count} a/c · {formatINR(c.balance)}
                    </span>
                  </button>
                ))}
              </div>
              {passbook && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Customer-wise passbook for <strong>{passbook.full_name}</strong> across all banks — combined balance{' '}
                    {formatINR(passbook.total_closing_balance)}
                  </p>
                  {passbook.accounts.map((b) => (
                    <PassbookTable key={b.account_id} book={b} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
