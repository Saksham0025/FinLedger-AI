import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ReconciliationReport } from '../../types/api';
import { auditApi } from '../../api/audit';
import { getErrorMessage } from '../../api/client';
import { Scale, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ReconciliationPage: React.FC = () => {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditApi.getReconciliation();
      setReport(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runReconciliation();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            System Ledger Reconciliation Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System-wide automated audit asserting cached_balance == sum(credits) - sum(debits)
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={runReconciliation}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Run Live Audit
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={runReconciliation} />}

      {/* Reconciliation Invariant Explanation */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-slate-200">
            Closed-Ledger Conservation Law
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            In a double-entry banking ledger, money cannot be created or destroyed. The sum of all customer
            liabilities plus the internal clearing account (<code className="text-emerald-400 font-mono">INR-SYS-CLEARING</code>)
            must strictly equal zero (<code className="text-emerald-400 font-mono">Global Net Ledger Delta == INR 0.00</code>).
          </p>
        </div>
      </div>

      {/* KPI Audit Summary Cards */}
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : report ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow={report.is_balanced ? 'emerald' : 'rose'}>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Audit Integrity</span>
              {report.is_balanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="mt-1">
              <Badge variant={report.is_balanced ? 'success' : 'danger'} size="md">
                {report.is_balanced ? 'Zero Discrepancies' : `${report.discrepancy_count} Mismatch(es)`}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Audited: <DateDisplay date={report.reconciled_at} />
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Audited Accounts</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-3xl font-extrabold text-slate-100 font-mono">
              {report.total_accounts_checked}
            </span>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              All active customer & clearing accounts
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">System Clearing Balance</span>
              <Scale className="w-4 h-4 text-slate-400" />
            </div>
            <CurrencyDisplay amount={report.system_clearing_balance} size="2xl" colored />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              INR-SYS-CLEARING internal ledger balance
            </p>
          </Card>

          <Card glow="emerald">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Global Net Ledger Delta</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <CurrencyDisplay amount={report.global_net_ledger_delta} size="2xl" colored />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Customer Liabilities: <CurrencyDisplay amount={report.total_customer_liabilities} size="sm" />
            </p>
          </Card>
        </div>
      ) : null}

      {/* Discrepancies Table / Clean State */}
      <Card
        title="Discrepancy Investigation Register"
        subtitle="Accounts where cached balance deviates from sum of posted ledger entries"
      >
        {isLoading ? (
          <LoadingSkeleton rows={3} />
        ) : !report || report.discrepancies.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
            title="All Accounts Reconciled Perfectly"
            description="Every account cached_balance matches its derived posted ledger sum exactly. Zero discrepancies."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-rose-400 border-b border-rose-500/30 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Account Number</th>
                  <th className="pb-3 px-3">Account ID</th>
                  <th className="pb-3 px-3 text-right">Cached Balance</th>
                  <th className="pb-3 px-3 text-right">Derived Ledger Sum</th>
                  <th className="pb-3 px-3 text-right">Discrepancy Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {report.discrepancies.map((item) => (
                  <tr key={item.account_id} className="hover:bg-rose-500/5">
                    <td className="py-3 px-3 font-bold text-slate-100">{item.account_number}</td>
                    <td className="py-3 px-3 text-slate-400">{item.account_id}</td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay amount={item.cached_balance} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay amount={item.derived_balance} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right text-rose-400 font-bold">
                      <CurrencyDisplay amount={item.discrepancy} size="sm" colored sign="auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
