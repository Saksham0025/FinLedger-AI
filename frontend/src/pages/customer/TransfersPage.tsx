import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { TransferModal } from '../../components/customer/TransferModal';
import { Account, TransferRequest } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { transfersApi } from '../../api/transfers';
import { getErrorMessage } from '../../api/client';
import {
  ArrowRightLeft,
  Search,
  ShieldCheck,
} from 'lucide-react';

export const TransfersPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const [searchTransferId, setSearchTransferId] = useState('');
  const [searchedTransfer, setSearchedTransfer] = useState<TransferRequest | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    accountsApi.listAccounts().then(setAccounts).catch(() => {});
  }, []);

  const handleSearchReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTransferId.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchedTransfer(null);

    try {
      const res = await transfersApi.getTransfer(searchTransferId.trim());
      setSearchedTransfer(res);
    } catch (err: unknown) {
      setSearchError(getErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Money Transfers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Atomic transfers executed under canonical row locks with UUIDv4 client idempotency
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setTransferModalOpen(true)}
          leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          disabled={accounts.length === 0}
        >
          Send Money
        </Button>
      </div>

      {/* Info banner on invariants */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-200">
            Database Invariants & Concurrency Safety
          </h4>
          <p className="text-slate-400 leading-relaxed">
            Every transfer acquires row-level locks on participating accounts in canonical
            ascending primary key order (<code className="text-emerald-400 font-mono">min_id, max_id</code>),
            preventing race conditions and deadlocks. Double-entry postings assert zero balance disparity at commit.
          </p>
        </div>
      </div>

      {/* Transfer Lookup by ID */}
      <Card
        title="Transaction Receipt Verification"
        subtitle="Lookup transfer receipt by unique Transfer UUID"
      >
        <form onSubmit={handleSearchReceipt} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTransferId}
                onChange={(e) => setSearchTransferId(e.target.value)}
                placeholder="Enter Transfer ID (e.g. 7c3f8f11-2bfa-4c46-99cf-0504446b1425)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <Button
              variant="secondary"
              type="submit"
              isLoading={searchLoading}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Verify Receipt
            </Button>
          </div>

          {searchError && <ErrorBanner message={searchError} />}

          {searchedTransfer && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="font-mono text-xs font-semibold text-slate-300">
                  Transfer Reference: {searchedTransfer.id}
                </span>
                <Badge
                  variant={searchedTransfer.status === 'POSTED' ? 'success' : 'danger'}
                  size="sm"
                >
                  {searchedTransfer.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Source Account</span>
                  <span className="font-mono text-slate-200">{searchedTransfer.source_account_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Destination Account</span>
                  <span className="font-mono text-slate-200">
                    {searchedTransfer.destination_account_id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Transferred Amount</span>
                  <CurrencyDisplay amount={searchedTransfer.amount} size="lg" colored />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Committed Timestamp</span>
                  <DateDisplay date={searchedTransfer.posted_at || searchedTransfer.created_at} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Idempotency Key:</span>
                <span className="truncate max-w-[280px]">{searchedTransfer.idempotency_key}</span>
              </div>
            </div>
          )}
        </form>
      </Card>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
      />
    </div>
  );
};
