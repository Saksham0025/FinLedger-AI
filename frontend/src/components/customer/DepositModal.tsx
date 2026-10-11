import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { Account } from '../../types/api';
import { accountsApi } from '../../api/accounts';
import { getErrorMessage } from '../../api/client';
import { ArrowDownCircle, CheckCircle2 } from 'lucide-react';
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
      title={success ? 'Deposit Completed' : 'Deposit Opening Funds'}
      description="Simulate funds deposit against PostgreSQL internal clearing account (INR-SYS-CLEARING)."
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {success ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h4 className="text-sm font-bold text-emerald-200">
              Funds Credited Successfully
            </h4>
            <CurrencyDisplay amount={amount} size="2xl" colored />
          </div>
          <p className="text-xs text-slate-400">
            Balanced double-entry postings created between INR-SYS-CLEARING and{' '}
            <span className="font-mono text-slate-200">{account.account_number}</span>.
          </p>
          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Account</span>
              <span className="font-mono text-slate-200">{account.account_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Balance</span>
              <CurrencyDisplay amount={account.cached_balance} size="sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Deposit Amount (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Narrative / Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Simulated Opening Deposit"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              leftIcon={<ArrowDownCircle className="w-4 h-4" />}
            >
              Deposit Funds
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
