import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Investment, PortfolioSummary } from '../../types/api';
import { investmentsApi } from '../../api/investments';
import { getErrorMessage } from '../../api/client';
import { PieChart, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';

export const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [port, invs] = await Promise.all([
        investmentsApi.getPortfolio(),
        investmentsApi.listInvestments(),
      ]);
      setPortfolio(port);
      setInvestments(invs);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInvested = portfolio ? parseFloat(String(portfolio.total_invested)) : 0;
  const totalValue = portfolio ? parseFloat(String(portfolio.total_current_value)) : 0;
  const totalYield = Math.max(0, totalValue - totalInvested);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Portfolio & Holdings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active simulated asset positions &bull; Automated nominal accrued yield calculation
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* KPI Cards */}
      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card glow="amber">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Invested Principal</span>
              <PieChart className="w-4 h-4 text-amber-400" />
            </div>
            <CurrencyDisplay amount={totalInvested} size="2xl" colored />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Debited from Savings into Investment Account
            </p>
          </Card>

          <Card glow="emerald">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Current Portfolio Valuation</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <CurrencyDisplay amount={totalValue} size="2xl" colored />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Principal + accrued yields
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Positions</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-3xl font-extrabold text-slate-100 font-mono">
              {portfolio?.active_investments_count ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Simulated holdings in good standing
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Accrued Yield</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <CurrencyDisplay amount={totalYield} size="2xl" colored sign="plus" />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Nominal daily accrued yield
            </p>
          </Card>
        </div>
      )}

      {/* Asset Allocation Breakdown */}
      {portfolio && Object.keys(portfolio.allocation_by_product_type || {}).length > 0 && (
        <Card
          title="Asset Allocation by Category"
          subtitle="Portfolio capital distribution"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(portfolio.allocation_by_product_type).map(([ptype, val]) => {
              const numVal = parseFloat(String(val));
              const pct = totalInvested > 0 ? ((numVal / totalInvested) * 100).toFixed(1) : '0';
              return (
                <div key={ptype} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{ptype}</span>
                    <span className="font-mono text-emerald-400 font-semibold text-xs">{pct}%</span>
                  </div>
                  <CurrencyDisplay amount={val} size="md" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Holdings List */}
      <Card
        title="Active Holdings Register"
        subtitle="Detailed register of customer investment contracts"
      >
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : investments.length === 0 ? (
          <EmptyState
            icon={<PieChart className="w-6 h-6" />}
            title="No Active Holdings"
            description="Subscribe to fixed deposits or mutual funds from the Financial Products catalogue."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Position Reference</th>
                  <th className="pb-3 px-3">Product Name</th>
                  <th className="pb-3 px-3 text-right">Invested Principal</th>
                  <th className="pb-3 px-3 text-right">Current Value</th>
                  <th className="pb-3 px-3 text-right">Nominal Yield</th>
                  <th className="pb-3 px-3 text-right">Start Date</th>
                  <th className="pb-3 px-3 text-right">Maturity Date</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {investments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {inv.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block font-sans">
                        {inv.product?.name || 'Investment'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {inv.product?.code} &bull; {inv.product?.product_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay amount={inv.invested_amount} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay amount={inv.current_value} size="sm" colored />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <CurrencyDisplay
                        amount={inv.nominal_accrued_yield ?? 0}
                        size="sm"
                        sign="plus"
                        colored
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <DateDisplay date={inv.start_date} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <DateDisplay date={inv.maturity_date} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={inv.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {inv.status}
                      </Badge>
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
