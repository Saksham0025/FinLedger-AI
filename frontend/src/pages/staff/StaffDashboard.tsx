import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Link } from 'react-router-dom';
import { DailyVolumeReport, FraudAlert, ReconciliationReport } from '../../types/api';
import { reportsApi } from '../../api/reports';
import { fraudApi } from '../../api/fraud';
import { auditApi } from '../../api/audit';
import { getErrorMessage } from '../../api/client';
import {
  ShieldAlert,
  ArrowRightLeft,
  PieChart,
  Scale,
  ArrowRight,
  FileText,
  Users,
  GitBranch,
  FlaskConical,
  Activity,
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const [dailyVolume, setDailyVolume] = useState<DailyVolumeReport | null>(null);
  const [pendingAlerts, setPendingAlerts] = useState<FraudAlert[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vol, alerts, recon] = await Promise.all([
        reportsApi.getDailyVolume(14).catch(() => null),
        fraudApi.listAlerts({ review_status: 'PENDING', limit: 10 }).catch(() => []),
        auditApi.getReconciliation().catch(() => null),
      ]);
      setDailyVolume(vol);
      setPendingAlerts(alerts);
      setReconciliation(recon);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-forensic-700">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-white">
              Forensic Operations Command Center
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forest-900 text-sage-200 border border-forest-700 font-bold tracking-wider uppercase">
              Staff Clearance
            </span>
          </div>
          <p className="text-xs text-sage-300 font-mono mt-1">
            System-wide transaction oversight • Multi-model fraud triage • Real-time double-entry audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/staff/fraud">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
              className="font-semibold shadow-xs"
            >
              Alert Triage ({pendingAlerts.length})
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* KPI Metric Strip */}
      {isLoading ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-4 shadow-sm hover:border-forest-600 transition-colors">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sage-300 mb-1 flex items-center justify-between font-bold">
              <span>Unreviewed Alerts</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400 tabular-nums">
              {pendingAlerts.length}
            </div>
            <p className="text-[10px] text-sage-400 font-mono mt-1">Pending staff determination</p>
          </div>

          <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-4 shadow-sm hover:border-forest-600 transition-colors">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sage-300 mb-1 flex items-center justify-between font-bold">
              <span>14-Day Transfer Volume</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              <CurrencyDisplay amount={dailyVolume?.total_window_transfers_volume ?? 0} size="2xl" colored />
            </div>
            <p className="text-[10px] text-sage-400 font-mono mt-1">
              {dailyVolume?.total_window_transfers_count ?? 0} posted transfers
            </p>
          </div>

          <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-4 shadow-sm hover:border-forest-600 transition-colors">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sage-300 mb-1 flex items-center justify-between font-bold">
              <span>Investment Subscriptions</span>
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              <CurrencyDisplay amount={dailyVolume?.total_window_investments_volume ?? 0} size="2xl" />
            </div>
            <p className="text-[10px] text-sage-400 font-mono mt-1">
              {dailyVolume?.total_window_investments_count ?? 0} active contracts
            </p>
          </div>

          <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-4 shadow-sm hover:border-forest-600 transition-colors">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sage-300 mb-1 flex items-center justify-between font-bold">
              <span>Reconciliation Status</span>
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <Badge
                variant={reconciliation?.is_balanced ? 'evergreen' : 'danger'}
                size="sm"
              >
                {reconciliation?.is_balanced ? '0 Disparity (Balanced)' : 'Discrepancy Detected'}
              </Badge>
            </div>
            <p className="text-[10px] text-sage-400 font-mono mt-1.5">
              {reconciliation?.total_accounts_checked ?? 0} accounts audited
            </p>
          </div>
        </div>
      )}

      {/* Staff Operational Workbenches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Alert Queue */}
        <div className="bg-forensic-850 border border-forensic-700 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-forensic-800 border-b border-forensic-700 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono">
                Advisory AI Alert Triage Queue
              </h3>
              <p className="text-[11px] text-sage-300 font-mono mt-0.5">
                Top unreviewed incidents scored by Random Forest & Heuristics
              </p>
            </div>
            <Link to="/staff/fraud">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="text-xs text-sage-200 hover:text-white hover:bg-forensic-750">
                Full Queue
              </Button>
            </Link>
          </div>

          <div className="p-4 sm:p-5">
            {isLoading ? (
              <LoadingSkeleton rows={4} />
            ) : pendingAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-sage-300 font-mono">
                Zero pending fraud alerts. All transactions cleared or escalated.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 flex items-center justify-between gap-3 font-mono shadow-xs hover:border-forest-600 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            alert.decision === 'HIGH_RISK'
                              ? 'danger'
                              : alert.decision === 'MEDIUM_RISK'
                              ? 'warning'
                              : 'success'
                          }
                          size="sm"
                        >
                          {alert.decision}
                        </Badge>
                        <span className="text-xs font-bold text-white">
                          Score: {(parseFloat(String(alert.risk_score)) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-sage-300 truncate max-w-sm font-sans">
                        {alert.explanation}
                      </p>
                    </div>

                    <Link to="/staff/fraud">
                      <Button variant="secondary" size="sm" className="text-xs font-semibold">
                        Investigate
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Primary Innovation Workbenches */}
        <div className="bg-forensic-850 border border-forensic-700 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-forensic-800 border-b border-forensic-700">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono">
              Advanced Forensic Workbenches
            </h3>
            <p className="text-[11px] text-sage-300 font-mono mt-0.5">
              Direct access to graph analysis, isolated simulations, and model governance
            </p>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono">
            <Link
              to="/staff/graph"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <GitBranch className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">LedgerGraph Explorer</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Temporal money-flow network & cycle detection.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/fraud-lab"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Fraud Lab Benchmarks</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Isolated synthetic multi-model comparisons.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/ai-health"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">AI Health & Drift</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Runtime model SHA-256 fingerprint & PSI drift.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/reconciliation"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Ledger Reconciliation</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Automated mathematical double-entry audit.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/accounts"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <Users className="w-4 h-4 text-sage-300 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Accounts Explorer</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Universal customer ledger passbooks inspection.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/audit"
              className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 hover:border-forest-500 hover:bg-forensic-800 transition-all flex items-start gap-3 shadow-xs group"
            >
              <FileText className="w-4 h-4 text-sage-300 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Audit Trail Stream</h4>
                <p className="text-[10px] text-sage-300 mt-0.5 font-sans">
                  Immutable chronological audit logs with JSON.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
