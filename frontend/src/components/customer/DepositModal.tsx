import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { Account } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { getErrorMessage } from '../../api/client';
import { ArrowDownCircle, CheckCircle2, Scale } from 'lucide-react';
import { CurrencyDisplay } from '../common/CurrencyDisplay';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onDepositSuccess?: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  account,
  onDepositSuccess,
}) => {
  const [amount, setAmount] = useState<string>('50000.00');
  const [description, setDescription] = useState<string>('Simulated Opening Deposit');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setError(null);
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Deposit amount must be strictly greater than ₹0.00');
      return;
    }

    setIsLoading(true);
    try {
      await accountsApi.depositOpeningFunds(
        account.id,
        parsed.toFixed(2),
        description.trim() || undefined
      );
      setSuccess(true);
      onDepositSuccess?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  if (!account) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={success ? 'Deposit Post Confirmed' : 'Deposit Opening Funds'}
      description="Executes a balanced double-entry deposit against PostgreSQL internal clearing account (INR-SYS-CLEARING)."
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {success ? (
        <div className="space-y-4 text-center font-sans">
          <div className="p-6 rounded-md bg-mist-100 border-2 border-eucalyptus-300 text-forest-950 flex flex-col items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-forest-800" />
            <h4 className="text-sm font-serif font-bold text-forest-950">
              Funds Posted to Double-Entry Ledger
            </h4>
            <CurrencyDisplay amount={amount} size="2xl" colored className="font-bold text-2xl font-serif" />
          </div>
          <p className="text-xs text-forest-800 font-sans">
            Balanced double-entry postings committed between <code className="font-mono text-forest-950 font-bold">INR-SYS-CLEARING</code> and{' '}
            <span className="font-mono font-bold text-forest-950">{account.account_number}</span>.
          </p>
          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleDeposit} className="space-y-4 font-sans">
          <div className="p-3.5 rounded bg-mist-100 border-2 border-eucalyptus-300 text-xs text-forest-900 space-y-1.5 font-sans">
            <div className="flex justify-between">
              <span className="text-forest-700 uppercase text-[10px] tracking-wider font-mono font-bold">Target Account</span>
              <span className="font-mono font-bold text-forest-950">{account.account_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-forest-700 uppercase text-[10px] tracking-wider font-mono font-bold">Current Cached Balance</span>
              <CurrencyDisplay amount={account.cached_balance} size="sm" className="font-bold font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-forest-900 uppercase tracking-wider mb-1 font-mono">
              Deposit Amount (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-forest-600 font-mono text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000.00"
                className="w-full bg-white border border-eucalyptus-300 rounded pl-7 pr-3 py-2 text-xs font-mono text-forest-950 focus:outline-none focus:border-forest-800 focus:ring-1 focus:ring-forest-800 transition-colors font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-forest-900 uppercase tracking-wider mb-1 font-mono">
              Narrative Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Simulated Opening Deposit"
              className="w-full bg-white border border-eucalyptus-300 rounded px-3 py-2 text-xs text-forest-950 focus:outline-none focus:border-forest-800 focus:ring-1 focus:ring-forest-800 transition-colors font-sans"
            />
          </div>

          <div className="p-3 rounded bg-sage-200 border border-eucalyptus-400 text-[11px] text-forest-900 flex items-center gap-2 font-medium">
            <Scale className="w-3.5 h-3.5 text-forest-800 shrink-0" />
            <span>Strict Conservation: Funds enter customer liability by offsetting internal clearing.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-eucalyptus-200">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              leftIcon={<ArrowDownCircle className="w-4 h-4" />}
            >
              Post Deposit
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
