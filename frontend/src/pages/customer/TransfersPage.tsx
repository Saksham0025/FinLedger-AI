import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { TransferModal } from '../../components/customer/TransferModal';
import { DisputeModal } from '../../components/customer/DisputeModal';
import { Account, TransferRequest } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { transfersApi } from '../../api/transfers';
import { getErrorMessage } from '../../api/client';
import {
  ArrowRightLeft,
  Search,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Lock,
  Layers,
} from 'lucide-react';

export const TransfersPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

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
      {/* Editorial Folio Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-forest-800 bg-sage-100 px-2.5 py-0.5 rounded border border-moss-300">
              FOLIO // TRANSFER SETTLEMENT • SECTION § 03
            </span>
            <span className="text-xs text-ink-500 font-mono">
              PayeeGuard Pre-Confirmation Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950">
              Fund Transfers & PayeeGuard Verification
            </h1>
            <Badge variant="forest" size="sm" className="hidden sm:inline-flex">
              ATOMIC // ROW LOCKS
            </Badge>
          </div>

          <p className="text-xs text-ink-600 font-sans mt-1 max-w-xl">
            Atomic transfers executed under canonical ascending row-level locks with PayeeGuard beneficiary verification and scoped idempotency.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setTransferModalOpen(true)}
          leftIcon={<ArrowRightLeft className="w-4 h-4 text-white" />}
          disabled={accounts.length === 0}
          className="shadow-sm font-bold"
        >
          Initiate New Transfer
        </Button>
      </div>

      {/* Protocol & Invariants Bar */}
      <div className="p-4 rounded-lg bg-mist-100 border-2 border-eucalyptus-300 shadow-atelier flex items-start gap-3.5">
        <div className="p-2 rounded bg-sage-200 text-forest-900 border border-eucalyptus-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-forest-950 text-xs font-sans uppercase tracking-wider">
              Canonical Concurrency & Idempotency Safeguards
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sage-200 text-forest-900 border border-eucalyptus-300 font-bold">
              PostgreSQL 16+
            </span>
          </div>
          <p className="text-forest-800 text-xs leading-relaxed font-sans">
            Every transaction acquires row-level locks on participating accounts in canonical ascending primary key order
            (<code className="font-mono text-forest-950 bg-white px-1.5 py-0.5 rounded border border-eucalyptus-300 font-bold">ORDER BY id FOR UPDATE</code>),
            preventing deadlocks and race conditions. Double-entry postings assert zero balance disparity at commit.
          </p>
        </div>
      </div>

      {/* Transfer Receipt Verification */}
      <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg shadow-atelier overflow-hidden">
        <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-sage-200" />
              Transfer Receipt Verification
            </h3>
            <p className="text-xs text-sage-100 font-sans mt-0.5">
              Verify cryptographic ledger receipts by unique Transfer UUID
            </p>
          </div>
          <span className="text-[11px] font-sans font-medium text-sage-200 bg-forest-950 px-2 py-0.5 rounded border border-forest-800">
            Authoritative Audit Lookup
          </span>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearchReceipt} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-forest-700" />
                <input
                  type="text"
                  value={searchTransferId}
                  onChange={(e) => setSearchTransferId(e.target.value)}
                  placeholder="Enter Transfer ID (e.g. 7c3f8f11-2bfa-4c46-99cf-0504446b1425)"
                  className="w-full bg-white border border-eucalyptus-300 rounded pl-10 pr-3 py-2 text-xs font-mono text-forest-950 placeholder:text-forest-700/60 focus:outline-none focus:border-forest-800 focus:ring-1 focus:ring-forest-800 transition-colors"
                  required
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                isLoading={searchLoading}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              >
                Verify Receipt
              </Button>
            </div>

            {searchError && <ErrorBanner message={searchError} />}

            {searchedTransfer && (
              <div className="mt-4 p-5 rounded-lg bg-white border-2 border-eucalyptus-300 space-y-4 font-sans shadow-sm">
                <div className="flex items-center justify-between border-b border-eucalyptus-200 pb-3">
                  <span className="text-xs font-bold text-forest-950 flex items-center gap-2 font-mono">
                    <FileCheck2 className="w-4 h-4 text-forest-800" />
                    Receipt: {searchedTransfer.id}
                  </span>
                  <Badge
                    variant={searchedTransfer.status === 'POSTED' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {searchedTransfer.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                  <div className="p-3 bg-mist-50 border border-eucalyptus-300 rounded">
                    <span className="text-forest-700 block text-[10px] uppercase font-sans font-bold">Source Account</span>
                    <span className="text-forest-950 font-mono font-bold truncate block mt-0.5">{searchedTransfer.source_account_id}</span>
                  </div>
                  <div className="p-3 bg-mist-50 border border-eucalyptus-300 rounded">
                    <span className="text-forest-700 block text-[10px] uppercase font-sans font-bold">Destination Account</span>
                    <span className="text-forest-950 font-mono font-bold truncate block mt-0.5">{searchedTransfer.destination_account_id}</span>
                  </div>
                  <div className="p-3 bg-mist-50 border border-eucalyptus-300 rounded">
                    <span className="text-forest-700 block text-[10px] uppercase font-sans font-bold">Settled Amount</span>
                    <div className="mt-0.5">
                      <CurrencyDisplay amount={searchedTransfer.amount} size="md" colored className="font-bold font-mono tabular-nums" />
                    </div>
                  </div>
                  <div className="p-3 bg-mist-50 border border-eucalyptus-300 rounded">
                    <span className="text-forest-700 block text-[10px] uppercase font-sans font-bold">Committed Timestamp</span>
                    <div className="mt-0.5 text-forest-900 font-mono text-[11px]">
                      <DateDisplay date={searchedTransfer.posted_at || searchedTransfer.created_at} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-eucalyptus-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-sans">
                  <div className="flex items-center gap-1.5 truncate max-w-md text-forest-800 font-mono">
                    <Lock className="w-3.5 h-3.5 text-forest-800 shrink-0" />
                    <span>Idempotency Hash:</span>
                    <span className="text-forest-950 font-bold truncate">{searchedTransfer.idempotency_key}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setDisputeModalOpen(true)}
                    leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-copper-700" />}
                    className="text-xs"
                  >
                    File Recourse Dispute
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Double-Entry Educational Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-mist-100 border-2 border-eucalyptus-300 space-y-1.5 shadow-atelier hover:border-forest-700 transition-colors">
          <div className="flex items-center gap-2 text-forest-800 mb-1">
            <Layers className="w-4 h-4 text-forest-800" />
            <h4 className="font-serif font-bold text-sm text-forest-950">Balanced Postings</h4>
          </div>
          <p className="text-xs text-forest-800 leading-relaxed font-sans">
            Every transfer generates equal and offsetting debit and credit rows in the ledger, guaranteed by deferred constraint triggers.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-mist-100 border-2 border-eucalyptus-300 space-y-1.5 shadow-atelier hover:border-forest-700 transition-colors">
          <div className="flex items-center gap-2 text-forest-800 mb-1">
            <Lock className="w-4 h-4 text-forest-800" />
            <h4 className="font-serif font-bold text-sm text-forest-950">Strict Idempotency</h4>
          </div>
          <p className="text-xs text-forest-800 leading-relaxed font-sans">
            Retrying a transfer with the same client UUID returns the cached ledger receipt without duplicating transactions.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-mist-100 border-2 border-eucalyptus-300 space-y-1.5 shadow-atelier hover:border-forest-700 transition-colors">
          <div className="flex items-center gap-2 text-forest-800 mb-1">
            <ShieldCheck className="w-4 h-4 text-forest-800" />
            <h4 className="font-serif font-bold text-sm text-forest-950">PayeeGuard Validation</h4>
          </div>
          <p className="text-xs text-forest-800 leading-relaxed font-sans">
            Authoritative beneficiary account directory lookup verifies recipient identity and warns against first-time transfers before posting.
          </p>
        </div>
      </div>

      {/* Transfer Modal with PayeeGuard */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
      />

      {/* Customer Recourse Dispute Modal */}
      {searchedTransfer && (
        <DisputeModal
          isOpen={disputeModalOpen}
          onClose={() => setDisputeModalOpen(false)}
          transferId={searchedTransfer.id}
          transferAmount={searchedTransfer.amount}
        />
      )}
    </div>
  );
};
