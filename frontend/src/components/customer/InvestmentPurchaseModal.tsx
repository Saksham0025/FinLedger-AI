import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { ErrorBanner } from '../common/ErrorBanner';
import { Badge } from '../common/Badge';
import { Account, FinancialProduct, Investment } from '../../types/api';
import { investmentsApi } from '../../api/investments';
import { formatPercent, generateUUID } from '../../utils/formatters';
import { getErrorMessage } from '../../api/client';
import { CheckCircle2, Sparkles, RefreshCw, Lock } from 'lucide-react';

interface InvestmentPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: FinancialProduct | null;
  accounts: Account[];
  onPurchaseSuccess?: () => void;
}

export const InvestmentPurchaseModal: React.FC<InvestmentPurchaseModalProps> = ({
  isOpen,
  onClose,
  product,
  accounts,
  onPurchaseSuccess,
}) => {
  const eligibleSources = accounts.filter(
    (a) => a.status === 'ACTIVE' && a.account_type === 'SAVINGS'
  );

  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Investment | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      if (eligibleSources.length > 0 && !sourceAccountId) {
        setSourceAccountId(eligibleSources[0].id);
      }
      setAmount(String(product.min_amount));
      setIdempotencyKey(generateUUID());
      setError(null);
      setResult(null);
    }
  }, [isOpen, product]);

  const selectedSource = accounts.find((a) => a.id === sourceAccountId);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError(null);
    const parsedAmount = parseFloat(amount);
    const minAmount = parseFloat(String(product.min_amount));

    if (isNaN(parsedAmount) || parsedAmount < minAmount) {
      setError(`Minimum investment amount is ₹${minAmount.toLocaleString('en-IN')}`);
      return;
    }

    if (!sourceAccountId) {
      setError('Please select a funding savings account');
      return;
    }

    if (selectedSource && parsedAmount > parseFloat(String(selectedSource.cached_balance))) {
      setError('Insufficient funds in selected savings account');
      return;
    }

    setIsLoading(true);
    try {
      const inv = await investmentsApi.purchaseInvestment(
        {
          product_id: product.id,
          source_account_id: sourceAccountId,
          amount: parsedAmount.toFixed(2),
        },
        idempotencyKey
      );
      setResult(inv);
      onPurchaseSuccess?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? 'Subscription Receipt' : `Subscribe to ${product.name}`}
      description={
        result
          ? 'Investment contract activated and double-entry ledger postings committed.'
          : 'Simulated financial asset subscription with automated yield tracking.'
      }
      maxWidth="lg"
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {result ? (
        <div className="space-y-4 font-mono">
          <div className="p-5 rounded-md bg-forest-50 border border-forest-200 text-forest-900 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-forest-700" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-forest-900 font-mono">
              Subscription Successfully Activated
            </h4>
            <div className="mt-1">
              <CurrencyDisplay amount={result.invested_amount} size="2xl" colored className="font-bold tabular-nums" />
            </div>
            <p className="text-xs text-forest-700 font-sans max-w-sm mt-0.5">
              Principal debited and mirrored into dedicated investment holding ledger.
            </p>
          </div>

          <div className="p-4 rounded-md bg-paper-50 border border-hairline space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-500 font-sans">Position ID</span>
              <span className="text-ink-900 font-semibold">{result.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500 font-sans">Instrument</span>
              <span className="text-ink-900 font-sans font-medium">{product.name} ({product.code})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500 font-sans">Guaranteed Yield</span>
              <span className="text-forest-700 font-bold tabular-nums">
                {formatPercent(product.annual_yield_rate)} p.a.
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500 font-sans">Status</span>
              <Badge variant="success" size="sm">
                {result.status}
              </Badge>
            </div>
          </div>

          <div className="pt-3 border-t border-hairline flex justify-end font-sans">
            <Button variant="primary" onClick={handleClose}>
              View in Portfolio
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePurchase} className="space-y-4 font-mono">
          <div className="p-4 rounded-md bg-paper-50 border border-hairline space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-ink-500 font-sans">Product Identifier</span>
              <span className="text-ink-900 font-semibold">{product.code}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500 font-sans">Category</span>
              <Badge variant="info" size="sm">
                {product.product_type}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500 font-sans">Annual Yield Rate</span>
              <span className="text-forest-700 font-bold tabular-nums">
                {formatPercent(product.annual_yield_rate)} p.a.
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500 font-sans">Term Duration</span>
              <span className="text-ink-900 font-semibold">{product.term_months} Months</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-mono">
              Source Funding Account (Savings)
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-paper-50 border border-hairline rounded px-3 py-2 text-xs font-mono text-ink-950 focus:outline-none focus:border-forest-600 focus:bg-surface"
              required
            >
              {eligibleSources.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_number} — Available:{' '}
                  {parseFloat(String(acc.cached_balance)).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </option>
              ))}
            </select>
            {selectedSource && (
              <div className="text-[11px] font-mono text-ink-500 mt-1.5 flex justify-between">
                <span>Account ID: {selectedSource.id}</span>
                <span className="flex items-center gap-1">
                  Available:{' '}
                  <CurrencyDisplay amount={selectedSource.cached_balance} size="sm" className="font-semibold text-ink-900" />
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1 font-mono">
              Investment Principal (Min: ₹{parseFloat(String(product.min_amount)).toLocaleString('en-IN')})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-ink-400 font-mono text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                min={parseFloat(String(product.min_amount))}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-paper-50 border border-hairline rounded pl-8 pr-3 py-2 text-xs font-mono text-ink-950 placeholder:text-ink-400 focus:outline-none focus:border-forest-600 focus:bg-surface transition-colors tabular-nums font-semibold"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-paper-50 border border-hairline text-[11px] text-ink-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-forest-700 shrink-0" />
              Idempotency Protected
            </span>
            <span className="font-mono text-ink-800 truncate max-w-[160px]">{idempotencyKey}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline font-sans">
            <Button variant="secondary" size="sm" type="button" onClick={handleClose}>
              Cancel
            </Button>
            {error && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handlePurchase}
                isLoading={isLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Subscribe Position
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
