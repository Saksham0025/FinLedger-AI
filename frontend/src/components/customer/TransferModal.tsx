import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { ErrorBanner } from '../common/ErrorBanner';
import { Badge } from '../common/Badge';
import { Account, TransferRequest, PayeePreviewResponse } from '../../types/api';
import { transfersApi } from '../../api/transfers';
import { generateUUID } from '../../utils/formatters';
import { getErrorMessage } from '../../api/client';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Lock,
  UserCheck,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransferSuccess?: () => void;
}

type TransferStep = 1 | 2 | 3;

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onTransferSuccess,
}) => {
  const eligibleSources = accounts.filter(
    (a) => a.status === 'ACTIVE' && a.account_type !== 'INTERNAL_CLEARING' && a.account_type !== 'INVESTMENT'
  );

  const [step, setStep] = useState<TransferStep>(1);
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferRequest | null>(null);
  const [previewData, setPreviewData] = useState<PayeePreviewResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (eligibleSources.length > 0 && !sourceAccountId) {
        setSourceAccountId(eligibleSources[0].id);
      }
      setIdempotencyKey(generateUUID());
      setStep(1);
      setError(null);
      setReceipt(null);
      setPreviewData(null);
    }
  }, [isOpen]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId) || eligibleSources[0];

  // Step 1 Validation -> Fetch PayeeGuard Preview -> Step 2
  const handleProceedToReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be strictly greater than ₹0.00.');
      return;
    }

    const dest = destinationAccountId.trim();
    if (!dest) {
      setError('Please provide a destination account UUID or reference.');
      return;
    }

    const activeSourceId = sourceAccountId || selectedSource?.id;
    if (activeSourceId === dest) {
      setError('Source and destination accounts must be distinct.');
      return;
    }

    if (selectedSource && parsedAmount > parseFloat(String(selectedSource.cached_balance))) {
      setError(
        `Insufficient funds: Available balance is ₹${parseFloat(String(selectedSource.cached_balance)).toLocaleString('en-IN')}, requested ₹${parsedAmount.toLocaleString('en-IN')}.`
      );
      return;
    }

    setIsPreviewLoading(true);
    try {
      const preview = await transfersApi.previewTransfer({
        source_account_id: activeSourceId,
        destination_account_id: dest,
        amount: parsedAmount.toFixed(2),
      });
      setPreviewData(preview);
      setStep(2);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Step 2 Execution -> Step 3 (Receipt)
  const handleExecuteTransfer = async () => {
    setIsLoading(true);
    setError(null);

    const activeSourceId = sourceAccountId || selectedSource?.id;
    try {
      const result = await transfersApi.createTransfer(
        {
          source_account_id: activeSourceId,
          destination_account_id: destinationAccountId.trim(),
          amount: parseFloat(amount).toFixed(2),
          currency: 'INR',
          memo: memo.trim() || undefined,
        },
        idempotencyKey
      );

      setReceipt(result);
      setStep(3);
      onTransferSuccess?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForNewTransfer = () => {
    setIdempotencyKey(generateUUID());
    setAmount('');
    setMemo('');
    setDestinationAccountId('');
    setStep(1);
    setError(null);
    setReceipt(null);
    setPreviewData(null);
  };

  const handleViewPassbook = () => {
    onClose();
    if (typeof window !== 'undefined') {
      window.location.href = '/accounts';
    }
  };

  const stepTitles = {
    1: 'Step 01 // Initiation & Transfer Details',
    2: 'Step 02 // Review & Settlement Authorization',
    3: 'Step 03 // Official Settlement Voucher',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stepTitles[step]}
      description="Atomic financial transfer executed under PostgreSQL row locks with scoped idempotency."
      maxWidth="lg"
    >
      {/* Deliberate Progression Indicator */}
      <div className="mb-5 pb-3 border-b border-hairline font-mono text-[10px]">
        <div className="flex items-center justify-between text-ink-500 mb-2">
          <span className={`flex items-center gap-1.5 ${step >= 1 ? 'font-bold text-forest-800' : ''}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step >= 1 ? 'bg-forest-800 text-white font-bold' : 'bg-parchment-300 text-ink-600'}`}>
              1
            </span>
            01 RECIPIENT & DETAILS
          </span>
          <span className="text-hairline font-bold">→</span>
          <span className={`flex items-center gap-1.5 ${step >= 2 ? 'font-bold text-forest-800' : ''}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step >= 2 ? 'bg-forest-800 text-white font-bold' : 'bg-parchment-300 text-ink-600'}`}>
              2
            </span>
            02 PRE-COMMIT REVIEW
          </span>
          <span className="text-hairline font-bold">→</span>
          <span className={`flex items-center gap-1.5 ${step >= 3 ? 'font-bold text-forest-800' : ''}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${step >= 3 ? 'bg-forest-800 text-white font-bold' : 'bg-parchment-300 text-ink-600'}`}>
              3
            </span>
            03 SETTLEMENT RECEIPT
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full bg-parchment-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-forest-800 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} className="mb-4" />}

      {/* STEP 1: Beneficiary, Amount & Details Form */}
      {step === 1 && (
        <form onSubmit={handleProceedToReview} noValidate className="space-y-4 font-sans text-xs">
          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-mono">
              Source Funding Passbook
            </label>
            <select
              value={sourceAccountId || selectedSource?.id || ''}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-surface border border-hairline rounded px-3 py-2 text-xs font-mono text-ink-950 focus:outline-none focus:border-forest-800"
            >
              {eligibleSources.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_number} ({acc.account_type}) — Available: ₹
                  {parseFloat(String(acc.cached_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
            {selectedSource && (
              <p className="text-[11px] font-mono text-ink-500 mt-1">
                Account UUID: {selectedSource.id}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-mono">
              Destination Account ID (UUID)
            </label>
            <input
              type="text"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              placeholder="e.g. 12345678-1234-5678-1234-567812345678"
              className="w-full bg-surface border border-hairline rounded px-3 py-2 text-xs font-mono text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 transition-colors"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              Recipient identity will be verified against core ledger records before commitment.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-mono">
              Transfer Amount (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-ink-400 font-mono text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface border border-hairline rounded pl-7 pr-3 py-2 text-xs font-mono text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-800 transition-colors tabular-nums font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-sans">
              Memo / Narrative (Optional)
            </label>
            <input
              type="text"
              maxLength={255}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Consulting honorarium, commercial settlement"
              className="w-full bg-surface border border-hairline rounded px-3 py-2 text-xs text-ink-950 font-sans placeholder:text-ink-400 focus:outline-none focus:border-forest-800 transition-colors"
            />
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-end gap-3 font-sans">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isPreviewLoading}
              rightIcon={<ArrowRight className="w-4 h-4 text-white" />}
            >
              Review Transfer
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: PayeeGuard Pre-Transfer Verification & Final Confirmation */}
      {step === 2 && previewData && (
        <div className="space-y-4 font-sans text-xs">
          {/* Deep Forest Signature Verification Panel */}
          <div className="p-4 rounded-lg bg-forest-900 text-white space-y-3.5 border border-forest-950 shadow-hero">
            <div className="flex items-center justify-between border-b border-forest-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                  PayeeGuard Verification
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-forest-950 text-emerald-300 border border-forest-700 font-bold">
                {previewData.validation_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-forest-200 block text-[10px] uppercase font-sans">
                  Authoritative Legal Beneficiary
                </span>
                <span className="font-bold text-white text-sm font-sans flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  {previewData.recipient_legal_name}
                </span>
              </div>
              <div>
                <span className="text-forest-200 block text-[10px] uppercase font-sans">
                  Masked Account Reference
                </span>
                <span className="text-white font-mono text-xs mt-0.5 block font-bold">
                  {previewData.masked_account_number}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-forest-800/80">
              {previewData.is_first_time_recipient ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase bg-amber-500/20 text-amber-200 border border-amber-400/40">
                  First-Time Recipient
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase bg-forest-950 text-forest-200 border border-forest-700">
                  Established Beneficiary ({previewData.total_historical_transfers ?? 0} prior transfers)
                </span>
              )}
              <span className="text-forest-200 text-[10px] font-sans">
                Verified against core ledger directory
              </span>
            </div>

            {/* Advisory Warnings (if any) */}
            {previewData.advisory_warnings && previewData.advisory_warnings.length > 0 && (
              <div className="p-3 rounded bg-amber-950/70 border border-amber-500/60 text-amber-100 text-xs space-y-1">
                <span className="font-bold text-[10px] block uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Advisory Alert:
                </span>
                {previewData.advisory_warnings.map((warn, i) => (
                  <p key={i} className="text-[11px] text-amber-200 leading-tight">
                    • {warn}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Amount & Account Alignment Line */}
          <div className="p-4 rounded-md bg-mist-100 border-2 border-eucalyptus-300 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-forest-700 font-mono font-medium">Source Account</span>
              <span className="font-mono font-bold text-forest-950">{selectedSource?.account_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-forest-700 font-mono font-medium">Authorized Amount</span>
              <CurrencyDisplay amount={amount} size="md" colored className="font-bold font-mono tabular-nums text-sm" />
            </div>
            {memo && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-forest-700 font-sans font-medium">Transaction Memo</span>
                <span className="text-forest-950 font-medium">{memo}</span>
              </div>
            )}
            <div className="border-t border-eucalyptus-200 pt-2 flex justify-between items-center text-[10px] text-forest-700 font-mono">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-forest-800" /> Idempotency Key:
              </span>
              <span className="truncate max-w-[220px] text-forest-950 font-bold">{idempotencyKey}</span>
            </div>
          </div>

          <div className="p-3 rounded bg-sage-200 border border-eucalyptus-400 text-[11px] text-forest-900 flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-forest-800 shrink-0" />
            <span>
              Transactional Invariant: Accounts locked in ascending PK order. Balance updated atomically with ledger posting legs.
            </span>
          </div>

          <div className="pt-3 border-t border-eucalyptus-300 flex items-center justify-between gap-3 font-sans">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setStep(1)}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              disabled={isLoading}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              {error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExecuteTransfer}
                  isLoading={isLoading}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteTransfer}
                isLoading={isLoading}
                className="font-bold shadow-sm"
              >
                Confirm & Post Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Server Settlement Voucher Receipt */}
      {step === 3 && receipt && (
        <div className="space-y-4 font-sans text-xs">
          {/* Official Passbook Voucher Frame */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-forest-900 via-forest-800 to-forest-900 border-2 border-forest-950 text-white flex flex-col items-center gap-2.5 text-center shadow-hero relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-forest-950 border border-forest-700 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-sage-200 font-bold block">
                OFFICIAL SETTLEMENT VOUCHER
              </span>
              <h4 className="text-lg font-serif font-bold text-white">
                Transfer Committed & Balanced
              </h4>
            </div>

            <div className="mt-1">
              <CurrencyDisplay amount={receipt.amount} size="2xl" className="font-serif font-bold text-2xl text-white" />
            </div>

            <p className="text-xs text-sage-100 max-w-sm mt-0.5">
              Balanced double-entry posting committed immutably under PostgreSQL deferred constraint trigger.
            </p>
          </div>

          {/* Receipt Data Table */}
          <div className="p-4 rounded-md bg-mist-100 border-2 border-eucalyptus-300 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-forest-700 font-mono text-[11px] font-medium">Voucher Reference</span>
              <span className="text-forest-950 font-bold font-mono">{receipt.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-forest-700 font-mono text-[11px] font-medium">Settlement Status</span>
              <Badge variant="forest" size="sm">
                {receipt.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-forest-700 font-mono text-[11px] font-medium">Committed At</span>
              <span className="text-forest-900 font-mono text-[11px]">
                {receipt.posted_at ? new Date(receipt.posted_at).toLocaleString('en-IN') : 'Now'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-eucalyptus-200 pt-2 text-[10px] text-forest-700 font-mono">
              <span>Audit Action</span>
              <span className="font-bold text-forest-900">TRANSFER_POSTED</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-hairline font-sans">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewPassbook}
              leftIcon={<BookOpen className="w-3.5 h-3.5 text-forest-800" />}
            >
              View in Passbook Ledger
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleResetForNewTransfer}>
                New Transfer
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
