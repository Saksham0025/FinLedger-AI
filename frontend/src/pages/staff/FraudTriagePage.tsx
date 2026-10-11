import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { AlertTriageDrawer } from '../../components/staff/AlertTriageDrawer';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Advisory AI Fraud Triage Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Forensic investigation workbench powered by Random Forest & Transaction Rules
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={fetchAlerts}
          leftIcon={<RefreshCw className="w-4 h-4 text-slate-400" />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Advisory Mandate Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-slate-400 leading-relaxed text-[11px]">
          <strong className="text-slate-200">Advisory Subsystem Notice:</strong> Machine learning risk scores
          and rule predictions provide decision-support triage for compliance officers. The AI model never
          autonomously blocks transfers, alters balances, or freezes accounts. All review determinations are
          persisted to the immutable audit log.
        </p>
      </div>

      {/* Filters bar */}
      <div className="p-4 rounded-xl glass-panel flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'PENDING', 'CLEARED', 'CONFIRMED_FRAUD', 'ESCALATED'].map((st) => (
            <button
              key={st}
              onClick={() => setReviewStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                reviewStatusFilter === st
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Risk Level:</span>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Levels</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="MEDIUM_RISK">Medium Risk</option>
            <option value="LOW_RISK">Low Risk</option>
          </select>

          <span className="text-xs font-semibold text-slate-400">Min Score:</span>
          <select
            value={minRiskScore}
            onChange={(e) => setMinRiskScore(parseFloat(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
      <Card
        title={`Flagged Fraud Alerts Queue (${alerts.length})`}
        subtitle="Ranked by risk score descending and creation timestamp"
      >
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-6 h-6" />}
            title="Queue Empty"
            description="No fraud predictions match the selected review status and severity filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Risk Score</th>
                  <th className="pb-3 px-3">Decision</th>
                  <th className="pb-3 px-3">Review Status</th>
                  <th className="pb-3 px-3">Rule Triggers</th>
                  <th className="pb-3 px-3">Forensic Explanation</th>
                  <th className="pb-3 px-3">Timestamp</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {alerts.map((alert) => {
                  const score = parseFloat(String(alert.risk_score));
                  return (
                    <tr key={alert.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-100 text-sm">
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
                      <td className="py-3 px-3">
                        <Badge
                          variant={decisionVariants[alert.decision] || 'neutral'}
                          size="sm"
                        >
                          {alert.decision}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={statusVariants[alert.review_status] || 'neutral'}
                          size="sm"
                        >
                          {alert.review_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {alert.rule_flags.length > 0 ? (
                            alert.rule_flags.map((rf, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                              >
                                {rf}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300 truncate max-w-[220px]">
                        {alert.explanation}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        <DateDisplay date={alert.created_at} />
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setTriageDrawerOpen(true);
                          }}
                        >
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Forensic Triage Drawer / Modal */}
      <AlertTriageDrawer
        isOpen={triageDrawerOpen}
        onClose={() => setTriageDrawerOpen(false)}
        alert={selectedAlert}
        onReviewSuccess={handleReviewSuccess}
      />
    </div>
  );
};
