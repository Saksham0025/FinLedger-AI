import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge, BadgeVariant } from '../common/Badge';
import { ErrorBanner } from '../common/ErrorBanner';
import { FraudAlert, FraudReviewStatus } from '../../types/api';
import { fraudApi } from '../../api/fraud';
import { getErrorMessage } from '../../api/client';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Flame,
  FileCheck2,
} from 'lucide-react';

interface AlertTriageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alert: FraudAlert | null;
  onReviewSuccess?: (updatedAlert: FraudAlert) => void;
}

export const AlertTriageDrawer: React.FC<AlertTriageDrawerProps> = ({
  isOpen,
  onClose,
  alert,
  onReviewSuccess,
}) => {
  const [reviewStatus, setReviewStatus] = useState<'CLEARED' | 'CONFIRMED_FRAUD' | 'ESCALATED'>('CLEARED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!alert) return null;

  const riskScoreNum = parseFloat(String(alert.risk_score));
  const riskPercent = (riskScoreNum * 100).toFixed(1);

  const decisionVariant: Record<string, BadgeVariant> = {
    HIGH_RISK: 'danger',
    MEDIUM_RISK: 'warning',
    LOW_RISK: 'success',
  };

  const reviewStatusVariant: Record<FraudReviewStatus, BadgeVariant> = {
    PENDING: 'warning',
    CLEARED: 'success',
    CONFIRMED_FRAUD: 'danger',
    ESCALATED: 'purple',
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) {
      setError('Staff review notes are mandatory for forensic auditability.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updated = await fraudApi.reviewAlert(alert.id, {
        review_status: reviewStatus,
        review_notes: reviewNotes.trim(),
      });
      onReviewSuccess?.(updated);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advisory Fraud Forensic Investigation"
      description={`Transfer Request ID: ${alert.transfer_request_id}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {error && <ErrorBanner message={error} />}

        {/* Top risk summary box */}
        <div className="p-4 rounded-xl bg-forensic-900 border border-forensic-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shadow-xs">
          <div>
            <span className="text-sage-400 block mb-1 font-bold">Advisory Risk Score</span>
            <div className="flex items-center gap-1.5 font-mono text-base font-bold text-white">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{riskPercent}%</span>
            </div>
            <span className="text-[10px] text-sage-400 font-mono">({riskScoreNum.toFixed(4)})</span>
          </div>

          <div>
            <span className="text-sage-400 block mb-1 font-bold">Model Decision</span>
            <Badge variant={decisionVariant[alert.decision] || 'neutral'} size="sm">
              {alert.decision}
            </Badge>
          </div>

          <div>
            <span className="text-sage-400 block mb-1 font-bold">Review Status</span>
            <Badge variant={reviewStatusVariant[alert.review_status]} size="sm">
              {alert.review_status}
            </Badge>
          </div>

          <div>
            <span className="text-sage-400 block mb-1 font-bold">Model Version</span>
            <span className="font-mono text-white font-semibold text-xs">
              {alert.model_version}
            </span>
          </div>
        </div>

        {/* Explanation & Rule Flags */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5 font-mono">
              Automated Forensic Explanation
            </h4>
            <p className="text-xs text-sage-200 bg-forensic-900 p-3.5 rounded-xl border border-forensic-700 leading-relaxed font-sans shadow-xs">
              {alert.explanation || 'Standard transaction pattern without rule triggers.'}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5 font-mono">
              Heuristic Rule Triggers
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {alert.rule_flags.length > 0 ? (
                alert.rule_flags.map((flag, idx) => (
                  <Badge key={idx} variant="warning" size="sm">
                    {flag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-sage-400 font-mono">No heuristic rule violations</span>
              )}
            </div>
          </div>

          {/* Feature snapshot collapsible/inspector */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5 font-mono">
              Feature Vector Snapshot
            </h4>
            <pre className="p-3.5 rounded-xl bg-forensic-950 border border-forensic-700 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-36">
              {JSON.stringify(alert.feature_snapshot, null, 2)}
            </pre>
          </div>
        </div>

        {/* Triage Decision Form */}
        <form onSubmit={handleReviewSubmit} noValidate className="border-t border-forensic-700 pt-4 space-y-3 font-mono">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Submit Staff Triage Decision
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setReviewStatus('CLEARED')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'CLEARED'
                  ? 'bg-forest-800 border-forest-600 text-white shadow-xs'
                  : 'bg-forensic-900 border-forensic-700 text-sage-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              CLEARED
            </button>
            <button
              type="button"
              onClick={() => setReviewStatus('CONFIRMED_FRAUD')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'CONFIRMED_FRAUD'
                  ? 'bg-rose-950 border-rose-600 text-rose-200 shadow-xs'
                  : 'bg-forensic-900 border-forensic-700 text-sage-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              CONFIRMED_FRAUD
            </button>
            <button
              type="button"
              onClick={() => setReviewStatus('ESCALATED')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'ESCALATED'
                  ? 'bg-purple-950 border-purple-600 text-purple-200 shadow-xs'
                  : 'bg-forensic-900 border-forensic-700 text-sage-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              ESCALATED
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
              Forensic Review Notes (Mandatory)
            </label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="State reason for clearing or escalating this transaction..."
              className="w-full bg-forensic-900 border border-forensic-700 rounded-xl p-3 text-xs text-white placeholder:text-sage-400/60 focus:outline-none focus:border-forest-500 font-sans"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 font-sans">
            <Button variant="secondary" type="button" onClick={onClose} className="font-semibold">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading} className="font-semibold shadow-xs">
              Commit Review Decision
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
