import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { accountsApi } from '../../api/accounts';
import { interbankApi } from '../../api/interbank';
import { getErrorMessage, isDefinitiveRejection } from '../../api/client';
import { generateUUID, parseAmountInput } from '../../utils/formatters';
import { Account, Bank, BeneficiaryLookup, InterbankStatus, InterbankTransfer, PaymentRail } from '../../types/api';

const RAILS: { rail: PaymentRail; title: string; detail: string }[] = [
  { rail: 'IMPS', title: 'IMPS', detail: 'Instant, 24x7. Up to ₹5,00,000 per payment.' },
  { rail: 'NEFT', title: 'NEFT', detail: 'Settles in the next half-hourly batch. No minimum.' },
  { rail: 'RTGS', title: 'RTGS', detail: 'Real-time, gross. For ₹2,00,000 and above.' },
];

export const STATUS_BADGE: Record<InterbankStatus, { label: string; variant: BadgeVariant }> = {
  PENDING_SETTLEMENT: { label: 'Awaiting batch', variant: 'warning' },
  SETTLED: { label: 'Credited', variant: 'success' },
  RETURNED: { label: 'Returned', variant: 'clay' },
  FAILED: { label: 'Failed', variant: 'danger' },
};

const inputClass =
  'w-full border border-eucalyptus-300 rounded px-3 py-2 text-sm bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-forest-600';

export const InterbankPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ownAccountIds, setOwnAccountIds] = useState<Set<string>>(new Set());
  const [banks, setBanks] = useState<Bank[]>([]);
  const [history, setHistory] = useState<InterbankTransfer[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [rail, setRail] = useState<PaymentRail>('IMPS');
  const [ifsc, setIfsc] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [lookup, setLookup] = useState<BeneficiaryLookup | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<InterbankTransfer | null>(null);
  // Kept across retries of the same payment so a network retry can never pay twice
  const [idempotencyKey, setIdempotencyKey] = useState(generateUUID);

  const load = async () => {
    try {
      const [accs, bks, hist] = await Promise.all([accountsApi.listAccounts(), interbankApi.listBanks(), interbankApi.list()]);
      const payable = accs
        .filter((a) => a.status === 'ACTIVE' && (a.account_type === 'SAVINGS' || a.account_type === 'CURRENT'))
        .sort((a, b) => Number(b.cached_balance) - Number(a.cached_balance));
      setAccounts(payable);
      setOwnAccountIds(new Set(accs.map((a) => a.id)));
      setBanks(bks);
      setHistory(hist);
      setSourceId((cur) => cur || payable[0]?.id || '');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const source = accounts.find((a) => a.id === sourceId);
  const otherBanks = useMemo(() => banks.filter((b) => b.id !== source?.bank_id), [banks, source]);

  const resetBeneficiaryCheck = () => setLookup(null);

  const verify = async () => {
    setError(null);
    try {
      setLookup(await interbankApi.lookupBeneficiary(ifsc.trim().toUpperCase(), accountNumber.trim()));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAmountInput(amount);
    if (!parsed) {
      setError('Enter a valid amount, up to 2 decimal places.');
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const t = await interbankApi.send(
        {
          source_account_id: sourceId,
          rail,
          beneficiary_ifsc: ifsc.trim().toUpperCase(),
          beneficiary_account_number: accountNumber.trim(),
          beneficiary_name: name.trim(),
          amount: parsed,
          memo: memo.trim() || null,
        },
        idempotencyKey
      );
      setReceipt(t);
      setIdempotencyKey(generateUUID());
      setAmount('');
      setMemo('');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      if (isDefinitiveRejection(err)) setIdempotencyKey(generateUUID());
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send to another bank"
        description="Pay any account at another bank using its IFSC. Your bank debits you and routes the money through the central bank's settlement accounts to the beneficiary's bank."
        action={
          <Button variant="ghost" size="sm" onClick={load} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      {receipt && (
        <div className="rounded-lg border border-forest-700 bg-sage-200 px-4 py-3 text-sm text-forest-950 flex flex-wrap items-center gap-3">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {receipt.rail} payment of <CurrencyDisplay amount={receipt.amount} size="sm" /> —{' '}
            <strong>{STATUS_BADGE[receipt.status].label}</strong>. UTR <span className="font-mono">{receipt.utr}</span>
            {receipt.failure_reason && ` (${receipt.failure_reason})`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card variant="paper" title="New payment" className="lg:col-span-3">
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Landmark className="w-6 h-6 text-forest-800" />}
              title="No eligible account"
              description="You need an active savings or current account to send money."
            />
          ) : (
            <form onSubmit={send} className="space-y-4">
              <label className="block text-xs text-ink-600 space-y-1">
                <span>Pay from</span>
                <select className={inputClass} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} ({a.bank_code}) — ₹{a.cached_balance}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="text-xs text-ink-600 mb-1">Payment method</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {RAILS.map((r) => (
                    <button
                      type="button"
                      key={r.rail}
                      aria-pressed={rail === r.rail}
                      onClick={() => setRail(r.rail)}
                      className={`text-left rounded border px-3 py-2 transition-colors cursor-pointer ${
                        rail === r.rail
                          ? 'bg-forest-800 text-white border-forest-950'
                          : 'bg-surface border-eucalyptus-300 hover:border-forest-700 text-ink-900'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{r.title}</span>
                      <span className={`block text-[11px] ${rail === r.rail ? 'text-sage-100' : 'text-ink-500'}`}>{r.detail}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>Beneficiary bank</span>
                  <select
                    className={inputClass}
                    value={banks.find((b) => b.ifsc === ifsc)?.ifsc ?? ''}
                    onChange={(e) => {
                      setIfsc(e.target.value);
                      resetBeneficiaryCheck();
                    }}
                  >
                    <option value="">Choose a bank…</option>
                    {otherBanks.map((b) => (
                      <option key={b.id} value={b.ifsc}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>IFSC</span>
                  <input
                    className={`${inputClass} font-mono uppercase`}
                    value={ifsc}
                    onChange={(e) => {
                      setIfsc(e.target.value.toUpperCase());
                      resetBeneficiaryCheck();
                    }}
                    pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                    title="11 characters: 4-letter bank code, 0, then 6 branch characters"
                    maxLength={11}
                    required
                  />
                </label>
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>Beneficiary account number</span>
                  <span className="flex gap-2">
                    <input
                      className={`${inputClass} font-mono`}
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        resetBeneficiaryCheck();
                      }}
                      minLength={3}
                      maxLength={32}
                      required
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={verify} disabled={!ifsc || accountNumber.length < 3}>
                      Verify
                    </Button>
                  </span>
                </label>
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>Beneficiary name</span>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required />
                </label>
              </div>

              {lookup && (
                <p className={`text-xs ${lookup.account_found ? 'text-forest-800' : 'text-rose-700'}`} role="status">
                  {lookup.account_found
                    ? `${lookup.bank_name}: account holder ${lookup.masked_name}`
                    : `${lookup.bank_name}: ${lookup.reason}. If you pay anyway the money will be returned to you.`}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>Amount (₹)</span>
                  <input className={`${inputClass} font-mono`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </label>
                <label className="block text-xs text-ink-600 space-y-1">
                  <span>Remarks (optional)</span>
                  <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={120} />
                </label>
              </div>

              <Button type="submit" variant="primary" isLoading={isSending} leftIcon={<Send className="w-4 h-4" />}>
                Send via {rail}
              </Button>
            </form>
          )}
        </Card>

        <Card variant="parchment" title="How it moves" className="lg:col-span-2">
          <ol className="list-decimal list-inside space-y-2 text-xs text-ink-800 leading-relaxed">
            <li>Your bank debits your account and parks the money in its settlement account with the central bank.</li>
            <li>The central bank moves it from your bank's settlement account to the beneficiary bank's — instantly for IMPS and RTGS, in the next batch for NEFT.</li>
            <li>The beneficiary bank credits the account matching the IFSC and account number.</li>
            <li>If that account doesn't exist or can't take credits, the payment is returned to you in full.</li>
          </ol>
          <p className="mt-3 text-[11px] text-ink-500">Every payment gets a 16-character UTR you can quote to either bank.</p>
        </Card>
      </div>

      <Card variant="paper" title="Inter-bank history" subtitle="Payments you sent and received">
        {history.length === 0 ? (
          <p className="text-sm text-ink-500">No inter-bank payments yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-500 border-b border-hairline">
                  <th className="font-medium py-2 px-4">Date</th>
                  <th className="font-medium py-2 px-4">UTR</th>
                  <th className="font-medium py-2 px-4">Method</th>
                  <th className="font-medium py-2 px-4">Beneficiary</th>
                  <th className="font-medium py-2 px-4 text-right">Amount</th>
                  <th className="font-medium py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-subtle">
                {history.map((t) => {
                  const received = !ownAccountIds.has(t.remitter_account_id);
                  return (
                    <tr key={t.id}>
                      <td className="py-2 px-4"><DateDisplay date={t.created_at} /></td>
                      <td className="py-2 px-4 font-mono text-xs">{t.utr}</td>
                      <td className="py-2 px-4">{t.rail}</td>
                      <td className="py-2 px-4">
                        {t.beneficiary_name}
                        <span className="block text-[11px] text-ink-500 font-mono">
                          {t.beneficiary_account_number} · {t.beneficiary_ifsc}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <CurrencyDisplay
                          amount={t.amount}
                          sign={t.status === 'FAILED' ? 'none' : received ? 'plus' : 'minus'}
                          colored={t.status !== 'FAILED'}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant={STATUS_BADGE[t.status].variant}>{STATUS_BADGE[t.status].label}</Badge>
                        {t.failure_reason && <span className="block text-[11px] text-ink-500">{t.failure_reason}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
