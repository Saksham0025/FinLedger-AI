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
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Advisory Risk Score</span>
            <div className="flex items-center gap-1.5 font-mono text-base font-bold text-slate-100">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{riskPercent}%</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">({riskScoreNum.toFixed(4)})</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Model Decision</span>
            <Badge variant={decisionVariant[alert.decision] || 'neutral'} size="sm">
              {alert.decision}
            </Badge>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Review Status</span>
            <Badge variant={reviewStatusVariant[alert.review_status]} size="sm">
              {alert.review_status}
            </Badge>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Model Version</span>
            <span className="font-mono text-slate-300 font-semibold text-xs">
              {alert.model_version}
            </span>
          </div>
        </div>

        {/* Explanation & Rule Flags */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Automated Forensic Explanation
            </h4>
            <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              {alert.explanation || 'Standard transaction pattern without rule triggers.'}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                <span className="text-xs text-slate-500 font-mono">No heuristic rule violations</span>
              )}
            </div>
          </div>

          {/* Feature snapshot collapsible/inspector */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Feature Vector Snapshot
            </h4>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-36">
              {JSON.stringify(alert.feature_snapshot, null, 2)}
            </pre>
          </div>
        </div>

        {/* Triage Decision Form */}
        <form onSubmit={handleReviewSubmit} noValidate className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Submit Staff Triage Decision
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setReviewStatus('CLEARED')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'CLEARED'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              CLEARED
            </button>
            <button
              type="button"
              onClick={() => setReviewStatus('CONFIRMED_FRAUD')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'CONFIRMED_FRAUD'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              CONFIRMED_FRAUD
            </button>
            <button
              type="button"
              onClick={() => setReviewStatus('ESCALATED')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                reviewStatus === 'ESCALATED'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              ESCALATED
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Forensic Review Notes (Mandatory)
            </label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="State reason for clearing or escalating this transaction..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading}>
              Commit Review Decision
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
