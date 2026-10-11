import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
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
  TrendingUp,
  FileText,
  Users,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Staff & Risk Operations Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System-wide transactional oversight &bull; Advisory AI fraud triage &bull; Relational reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/staff/fraud">
            <Button
              variant="danger"
              size="md"
              leftIcon={<ShieldAlert className="w-4 h-4" />}
            >
              Fraud Alert Triage ({pendingAlerts.length})
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* KPI Cards */}
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow="rose">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Unreviewed Alerts</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-3xl font-extrabold text-rose-300 font-mono">
              {pendingAlerts.length}
            </span>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Advisory alerts pending staff triage
            </p>
          </Card>

          <Card glow="emerald">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">14-Day Transfer Volume</span>
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <CurrencyDisplay
              amount={dailyVolume?.total_window_transfers_volume ?? 0}
              size="2xl"
              colored
            />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {dailyVolume?.total_window_transfers_count ?? 0} posted transfers
            </p>
          </Card>

          <Card glow="amber">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">14-Day Investment Volume</span>
              <PieChart className="w-4 h-4 text-amber-400" />
            </div>
            <CurrencyDisplay
              amount={dailyVolume?.total_window_investments_volume ?? 0}
              size="2xl"
            />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {dailyVolume?.total_window_investments_count ?? 0} subscriptions
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Reconciliation Audit</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1">
              <Badge
                variant={reconciliation?.is_balanced ? 'success' : 'danger'}
                size="md"
              >
                {reconciliation?.is_balanced ? 'System Balanced (0 Delta)' : 'Discrepancy Detected'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {reconciliation?.total_accounts_checked ?? 0} accounts audited
            </p>
          </Card>
        </div>
      )}

      {/* Staff Queues & Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Alert Queue */}
        <Card
          title="Advisory AI Fraud Triage Queue"
          subtitle="Top unreviewed alerts scored by Random Forest & Heuristic rules"
          action={
            <Link to="/staff/fraud">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All
              </Button>
            </Link>
          }
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : pendingAlerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Zero pending fraud alerts. All transactions cleared or escalated.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
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
                      <span className="font-mono text-xs font-bold text-slate-200">
                        Risk Score: {(parseFloat(String(alert.risk_score)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm">
                      {alert.explanation}
                    </p>
                  </div>

                  <Link to="/staff/fraud">
                    <Button variant="secondary" size="sm">
                      Investigate
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Operations Links */}
        <Card title="Forensic & Compliance Modules">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/staff/accounts"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3"
            >
              <Users className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Accounts Explorer</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Universal customer accounts & balances inspection.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/audit"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3"
            >
              <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Audit Trail Log</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Immutable append-only logs with JSON metadata viewer.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/reconciliation"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3"
            >
              <Scale className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Reconciliation Audit</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Run system-wide double-entry ledger balance audit.
                </p>
              </div>
            </Link>

            <Link
              to="/staff/reports"
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3"
            >
              <TrendingUp className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Analytics & Reports</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Daily volumes, balance tiers, and product performance.
                </p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
