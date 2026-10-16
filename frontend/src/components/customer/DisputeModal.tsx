import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { disputesApi } from '../../api/disputes';
import { getErrorMessage } from '../../api/client';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string;
  transferAmount?: string | number;
  onDisputeCreated?: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  transferId,
  transferAmount,
  onDisputeCreated,
}) => {
  const [category, setCategory] = useState<'UNAUTHORIZED' | 'SUSPICIOUS_PAYEE' | 'AMOUNT_DISCREPANCY' | 'PROCESSING_DELAY' | 'OTHER'>('UNAUTHORIZED');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of the transaction issue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await disputesApi.createDispute({
        transfer_request_id: transferId,
        category,
        description: description.trim(),
      });
      setIsSuccess(true);
      onDisputeCreated?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setDescription('');
    setCategory('UNAUTHORIZED');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={isSuccess ? 'Recourse Inquiry Filed' : 'File Transaction Dispute'}
      description="Internal FinLedger-AI customer recourse and forensic investigation inquiry."
      maxWidth="md"
    >
      {error && <ErrorBanner message={error} className="mb-4" />}

      {isSuccess ? (
        <div className="space-y-4 text-center py-2 font-sans">
          <div className="p-5 rounded-lg bg-sage-50 border border-moss-300 text-forest-950 flex flex-col items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-forest-800" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-forest-950 font-serif">
              Inquiry Case Opened
            </h4>
            <p className="text-xs text-forest-800 max-w-sm font-sans">
              Your inquiry has been logged into the append-only audit trail and assigned to the fraud investigation team for evidentiary review.
            </p>
          </div>
          <div className="flex justify-end pt-2 font-sans">
            <Button variant="primary" size="sm" onClick={handleReset}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="p-3.5 rounded-md bg-parchment-50 border border-hairline text-xs flex items-center justify-between">
            <span className="text-ink-600 font-sans">Transfer Reference</span>
            <span className="text-ink-950 font-mono font-bold truncate max-w-[220px]">
              {transferId} {transferAmount ? `(₹${parseFloat(String(transferAmount)).toLocaleString('en-IN')})` : ''}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-900 uppercase tracking-wider mb-1 font-sans">
              Dispute Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-parchment-50 border border-hairline rounded px-3 py-2 text-xs text-ink-950 focus:outline-none focus:border-forest-800 focus:bg-white font-sans"
            >
              <option value="UNAUTHORIZED">Unauthorized Transaction</option>
              <option value="SUSPICIOUS_PAYEE">Suspicious / Impersonated Beneficiary</option>
              <option value="AMOUNT_DISCREPANCY">Incorrect Debit Amount</option>
              <option value="PROCESSING_DELAY">Processing Error / Double Debit</option>
              <option value="OTHER">Other Clarification</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-900 uppercase tracking-wider mb-1 font-sans">
              Incident Description & Evidence Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the circumstances (e.g., location, unrecognized payee, uninitiated OTP, or discrepancy)..."
              className="w-full bg-parchment-50 border border-hairline rounded px-3 py-2 text-xs text-ink-950 font-sans placeholder:text-ink-400 focus:outline-none focus:border-forest-800 focus:bg-white resize-none transition-colors"
              required
            />
          </div>

          <div className="p-3.5 rounded-md bg-parchment-50 border border-hairline text-[11px] text-ink-600 space-y-1 font-sans">
            <div className="flex items-center gap-1.5 text-copper-700 font-bold uppercase font-sans text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5 text-copper-700" />
              <span>Immutable Ledger & Recourse Policy</span>
            </div>
            <p className="text-ink-600 text-[11px] leading-relaxed">
              Filing a dispute initiates forensic triage. In accordance with double-entry accounting standards, balances cannot be modified arbitrarily without an authorized, balanced reversal transaction.
            </p>
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2.5 font-sans">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoading} className="font-bold">
              Submit Recourse Inquiry
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
