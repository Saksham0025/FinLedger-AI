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
import { CheckCircle2, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

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
      title={result ? 'Subscription Confirmed' : `Invest in ${product.name}`}
      description={
        result
          ? 'Investment position opened and double-entry ledger legs posted.'
          : 'Simulated financial asset subscription with automated yield tracking.'
      }
      maxWidth="lg"
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {result ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h4 className="text-base font-bold text-emerald-200">
              Subscription Successfully Activated
            </h4>
            <CurrencyDisplay amount={result.invested_amount} size="2xl" colored />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Position ID</span>
              <span className="font-mono text-slate-200">{result.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Product</span>
              <span className="font-semibold text-slate-200">{product.name} ({product.code})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yield Rate</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatPercent(product.annual_yield_rate)} p.a.
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <Badge variant="success" size="sm">
                {result.status}
              </Badge>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              View in Portfolio
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePurchase} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Product Code</span>
              <span className="font-mono text-slate-200 font-semibold">{product.code}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Category</span>
              <Badge variant="info" size="sm">
                {product.product_type}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Annual Yield Rate</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatPercent(product.annual_yield_rate)} p.a.
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Term Duration</span>
              <span className="font-mono text-slate-200">{product.term_months} Months</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Source Funding Account (Savings)
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <p className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Account ID: {selectedSource.id}</span>
                <span>
                  Available:{' '}
                  <CurrencyDisplay amount={selectedSource.cached_balance} size="sm" />
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Investment Amount (Min: ₹{parseFloat(String(product.min_amount)).toLocaleString('en-IN')})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min={parseFloat(String(product.min_amount))}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              Idempotency Protected
            </span>
            <span className="font-mono text-amber-400 truncate max-w-[150px]">{idempotencyKey}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            {error && (
              <Button
                variant="outline"
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
              type="submit"
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Subscribe Position
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
