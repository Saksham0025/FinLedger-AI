import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { AlertTriageDrawer } from '../../components/staff/AlertTriageDrawer';
import { ForensicDossierDrawer } from '../../components/staff/ForensicDossierDrawer';
import { FraudAlert, FraudReviewStatus, FraudRiskDecision } from '../../types/api';
import { fraudApi } from '../../api/fraud';
import { getErrorMessage } from '../../api/client';
import { ShieldAlert, RefreshCw, Filter, Flame, Info } from 'lucide-react';

export const FraudTriagePage: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [minRiskScore, setMinRiskScore] = useState<number>(0.0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [triageDrawerOpen, setTriageDrawerOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fraudApi.listAlerts({
        review_status:
          reviewStatusFilter === 'ALL'
            ? undefined
            : (reviewStatusFilter as FraudReviewStatus),
        decision:
          decisionFilter === 'ALL'
            ? undefined
            : (decisionFilter as FraudRiskDecision),
        min_risk_score: minRiskScore > 0 ? minRiskScore : undefined,
        limit: 100,
      });
      setAlerts(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [reviewStatusFilter, decisionFilter, minRiskScore]);

  const decisionVariants: Record<string, BadgeVariant> = {
    HIGH_RISK: 'danger',
    MEDIUM_RISK: 'warning',
    LOW_RISK: 'success',
  };

  const statusVariants: Record<string, BadgeVariant> = {
    PENDING: 'warning',
    CLEARED: 'success',
    CONFIRMED_FRAUD: 'danger',
    ESCALATED: 'purple',
  };

  const handleReviewSuccess = (updatedAlert: FraudAlert) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
    );
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forensic-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-white">
              Advisory AI Fraud Triage Queue
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-900 text-sage-200 border border-forest-700 font-bold tracking-wider uppercase">
              Operational Triage
            </span>
          </div>
          <p className="text-xs text-sage-300 font-mono mt-1">
            Forensic investigation workbench powered by Random Forest & Transaction Rules
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchAlerts}
          leftIcon={<RefreshCw className="w-3.5 h-3.5 text-sage-300" />}
          className="font-semibold shadow-xs"
        >
          Refresh Queue
        </Button>
      </div>

      {/* Advisory Mandate Notice */}
      <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 text-xs text-sage-200 flex items-start gap-3 font-mono shadow-sm">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sage-300 leading-relaxed text-[11px]">
          <strong className="text-white">Advisory Subsystem Policy:</strong> Machine learning risk scores
          and rule predictions provide decision-support triage for compliance officers. The AI model never
          autonomously blocks transfers, alters balances, or freezes accounts. All review determinations are
          persisted to the immutable audit log.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sage-300 flex items-center gap-1 mr-1 uppercase text-[10px] font-bold">
            <Filter className="w-3 h-3 text-sage-400" /> Status:
          </span>
          {['ALL', 'PENDING', 'CLEARED', 'CONFIRMED_FRAUD', 'ESCALATED'].map((st) => (
            <button
              key={st}
              onClick={() => setReviewStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs transition-colors border font-mono ${
                reviewStatusFilter === st
                  ? 'bg-forest-800 border-forest-600 text-white font-bold shadow-xs'
                  : 'bg-forensic-900 border-forensic-700 text-sage-300 hover:text-white hover:bg-forensic-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sage-300 text-[10px] uppercase font-bold">Risk Level:</span>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="bg-forensic-900 border border-forensic-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-forest-500 font-mono"
          >
            <option value="ALL">All Levels</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="MEDIUM_RISK">Medium Risk</option>
            <option value="LOW_RISK">Low Risk</option>
          </select>

          <span className="text-sage-300 text-[10px] uppercase font-bold">Min Score:</span>
          <select
            value={minRiskScore}
            onChange={(e) => setMinRiskScore(parseFloat(e.target.value))}
            className="bg-forensic-900 border border-forensic-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-forest-500 font-mono"
          >
            <option value="0.0">All (0%+)</option>
            <option value="0.3">30%+</option>
            <option value="0.5">50%+</option>
            <option value="0.7">70%+</option>
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAlerts} />}

      {/* Alerts Table */}
      <div className="bg-forensic-850 border border-forensic-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-forensic-800 border-b border-forensic-700">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono">
            Flagged Incidents Queue ({alerts.length})
          </h3>
          <p className="text-[11px] text-sage-300 font-mono mt-0.5">
            Ranked by risk score descending and event created_at timestamp
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : alerts.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="w-6 h-6 text-sage-400" />}
              title="Queue Empty"
              description="No fraud predictions match the selected review status and severity filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-forensic-700">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-sage-300 bg-forensic-900 border-b border-forensic-700 tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Review Status</th>
                    <th className="py-2.5 px-3">Rule Triggers</th>
                    <th className="py-2.5 px-3">Forensic Explanation</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forensic-750">
                  {alerts.map((alert) => {
                    const score = parseFloat(String(alert.risk_score));
                    return (
                      <tr key={alert.id} className="hover:bg-forensic-800/70 transition-colors">
                        <td className="py-2.5 px-3 tabular-nums">
                          <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                            <Flame
                              className={`w-3.5 h-3.5 ${
                                score > 0.7
                                  ? 'text-rose-400'
                                  : score > 0.4
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            />
                            <span>{(score * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={decisionVariants[alert.decision] || 'neutral'}
                            size="sm"
                          >
                            {alert.decision}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={statusVariants[alert.review_status] || 'neutral'}
                            size="sm"
                          >
                            {alert.review_status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {alert.rule_flags.length > 0 ? (
                              alert.rule_flags.map((rf, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-forensic-900 text-sage-200 border border-forensic-700"
                                >
                                  {rf}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-sage-400 font-mono">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-sage-200 truncate max-w-[220px]">
                          {alert.explanation}
                        </td>
                        <td className="py-2.5 px-3 text-sage-300 text-[11px]">
                          <DateDisplay date={alert.created_at} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setDossierOpen(true);
                            }}
                            className="text-xs font-semibold"
                          >
                            Forensic Dossier
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Forensic Triage Drawer / Modal */}
      <AlertTriageDrawer
        isOpen={triageDrawerOpen}
        onClose={() => setTriageDrawerOpen(false)}
        alert={selectedAlert}
        onReviewSuccess={handleReviewSuccess}
      />

      {/* Unified Forensic Investigation Dossier Drawer */}
      <ForensicDossierDrawer
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
        alertId={selectedAlert?.id || null}
        onAlertReviewed={() => {
          fetchAlerts();
        }}
      />
    </div>
  );
};
