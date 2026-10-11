import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { ErrorBanner } from '../common/ErrorBanner';
import { Badge } from '../common/Badge';
import { Account, TransferRequest } from '../../types/api';
import { transfersApi } from '../../api/transfers';
import { generateUUID } from '../../utils/formatters';
import { getErrorMessage } from '../../api/client';
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransferSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onTransferSuccess,
}) => {
  const eligibleSources = accounts.filter(
    (a) => a.status === 'ACTIVE' && a.account_type !== 'INTERNAL_CLEARING' && a.account_type !== 'INVESTMENT'
  );

  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferRequest | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (eligibleSources.length > 0 && !sourceAccountId) {
        setSourceAccountId(eligibleSources[0].id);
      }
      // Generate one intentional idempotency key on fresh open
      setIdempotencyKey(generateUUID());
      setStep('form');
      setError(null);
      setReceipt(null);
    }
  }, [isOpen]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be strictly greater than ₹0.00');
      return;
    }

    if (!sourceAccountId) {
      setError('Please select a valid source account');
      return;
    }

    if (!destinationAccountId.trim()) {
      setError('Please enter destination account UUID');
      return;
    }

    if (sourceAccountId === destinationAccountId.trim()) {
      setError('Source and destination accounts must be distinct');
      return;
    }

    if (selectedSource && parsedAmount > parseFloat(String(selectedSource.cached_balance))) {
      setError('Insufficient funds: Amount exceeds available account balance');
      return;
    }

    setStep('review');
  };

  const handleExecuteTransfer = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Send transfer with the assigned idempotency key
      const result = await transfersApi.createTransfer(
        {
          source_account_id: sourceAccountId,
          destination_account_id: destinationAccountId.trim(),
          amount: parseFloat(amount).toFixed(2),
          currency: 'INR',
          memo: memo.trim() || undefined,
        },
        idempotencyKey
      );

      setReceipt(result);
      setStep('success');
      onTransferSuccess?.();
    } catch (err: unknown) {
      // Keep same idempotencyKey so user can retry safely
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
    setStep('form');
    setError(null);
    setReceipt(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'success'
          ? 'Transfer Completed'
          : step === 'review'
          ? 'Confirm Transfer'
          : 'New Money Transfer'
      }
      description={
        step === 'success'
          ? 'Transaction recorded in PostgreSQL double-entry ledger.'
          : step === 'review'
          ? 'Review transaction details before posting.'
          : 'Transfer funds atomically between accounts.'
      }
      maxWidth="lg"
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {step === 'form' && (
        <form onSubmit={handleProceedToReview} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Source Funding Account
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {eligibleSources.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_number} ({acc.account_type}) — Available:{' '}
                  {parseFloat(String(acc.cached_balance)).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </option>
              ))}
            </select>
            {selectedSource && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Account ID: {selectedSource.id}</span>
                <span>
                  Available Balance:{' '}
                  <CurrencyDisplay amount={selectedSource.cached_balance} size="sm" />
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Destination Account ID (UUID)
            </label>
            <input
              type="text"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              placeholder="e.g. 12345678-1234-5678-1234-567812345678"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Amount (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Memo / Narrative (Optional)
            </label>
            <input
              type="text"
              maxLength={255}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Monthly rent, utility payment"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Review Transfer
            </Button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Source Account</span>
              <span className="font-mono text-slate-200">{selectedSource?.account_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Destination Account ID</span>
              <span className="font-mono text-slate-200 truncate max-w-[200px]">
                {destinationAccountId}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Transfer Amount</span>
              <CurrencyDisplay amount={amount} size="md" colored />
            </div>
            {memo && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Memo</span>
                <span className="text-slate-200">{memo}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Idempotency Key
              </span>
              <span className="truncate max-w-[180px]">{idempotencyKey}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep('form')}
              disabled={isLoading}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              {error && (
                <Button
                  variant="outline"
                  onClick={handleExecuteTransfer}
                  isLoading={isLoading}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry with Same Key
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleExecuteTransfer}
                isLoading={isLoading}
              >
                Confirm & Post Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && receipt && (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h4 className="text-base font-bold text-emerald-200">Payment Successfully Posted</h4>
            <CurrencyDisplay amount={receipt.amount} size="2xl" colored />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Transfer Reference</span>
              <span className="font-mono text-slate-200">{receipt.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <Badge variant="success" size="sm">
                {receipt.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Posted At</span>
              <span className="font-mono text-slate-300">
                {receipt.posted_at ? new Date(receipt.posted_at).toLocaleString('en-IN') : 'Now'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleResetForNewTransfer}>
              Send Another
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
