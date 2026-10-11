import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { CreateProductModal } from '../../components/staff/CreateProductModal';
import {
  BalanceDistributionReport,
  DailyVolumeReport,
  ProductsSummaryReport,
} from '../../types/api';
import { reportsApi } from '../../api/reports';
import { getErrorMessage } from '../../api/client';
import { formatPercent } from '../../utils/formatters';
import { Plus } from 'lucide-react';

export const ReportsAnalyticsPage: React.FC = () => {
  const [dailyVolume, setDailyVolume] = useState<DailyVolumeReport | null>(null);
  const [balanceDist, setBalanceDist] = useState<BalanceDistributionReport | null>(null);
  const [productsSummary, setProductsSummary] = useState<ProductsSummaryReport | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vol, dist, prods] = await Promise.all([
        reportsApi.getDailyVolume(14),
        reportsApi.getBalanceDistribution(),
        reportsApi.getProductsSummary(),
      ]);
      setDailyVolume(vol);
      setBalanceDist(dist);
      setProductsSummary(prods);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleProductCreated = () => {
    fetchReports();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            System Reporting & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated metrics derived directly from PostgreSQL queries &bull; Zero client-side estimation
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateProductOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Financial Product
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchReports} />}

      {/* Daily Volume Window Breakdown */}
      <Card
        title="14-Day Activity Breakdown"
        subtitle="Daily transfer volume and simulated investment subscriptions"
      >
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !dailyVolume || dailyVolume.records.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">Zero volume records recorded in window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Date (UTC)</th>
                  <th className="pb-3 px-3 text-right">Transfer Count</th>
                  <th className="pb-3 px-3 text-right">Transfer Volume</th>
                  <th className="pb-3 px-3 text-right">Investment Count</th>
                  <th className="pb-3 px-3 text-right">Investment Volume</th>
                  <th className="pb-3 px-3 text-right font-bold text-slate-200">Total Day Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dailyVolume.records.map((rec) => (
                  <tr key={rec.date} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{rec.date}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{rec.transfer_count}</td>
                    <td className="py-2.5 px-3 text-right">
                      <CurrencyDisplay amount={rec.transfer_volume} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{rec.investment_count}</td>
                    <td className="py-2.5 px-3 text-right">
                      <CurrencyDisplay amount={rec.investment_volume} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <CurrencyDisplay amount={rec.total_day_volume} size="sm" colored />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bottom Grid: Balance Distribution Tiers & Product Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Distribution Tiers */}
        <Card
          title="Account Balance Distribution Tiers"
          subtitle={`Total Customer Funds: ${parseFloat(
            String(balanceDist?.total_customer_funds ?? 0)
          ).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`}
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !balanceDist || balanceDist.tiers.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">Zero distribution data available.</p>
          ) : (
            <div className="space-y-3 font-sans">
              {balanceDist.tiers.map((tier) => {
                const pct = parseFloat(String(tier.percentage_of_accounts));
                return (
                  <div key={tier.tier_name} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{tier.tier_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tier.range_label}</span>
                      </div>
                      <div className="text-right">
                        <CurrencyDisplay amount={tier.total_balance_volume} size="sm" />
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {tier.account_count} account(s) ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Product Catalogue Performance */}
        <Card
          title="Financial Products Performance"
          subtitle="Catalogue subscriptions and total invested volume per product"
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !productsSummary || productsSummary.products.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">Zero product records found.</p>
          ) : (
            <div className="space-y-3">
              {productsSummary.products.map((prod) => (
                <div
                  key={prod.product_id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-200 block">{prod.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {prod.code} &bull; {prod.product_type} &bull; {prod.term_months} Months
                      </span>
                    </div>
                    <Badge variant={prod.is_active ? 'success' : 'neutral'} size="sm">
                      {prod.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[11px] font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Yield Rate</span>
                      <span className="text-emerald-400 font-bold">
                        {formatPercent(prod.annual_yield_rate)} p.a.
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Active Subs</span>
                      <span className="text-slate-200 font-semibold">{prod.active_subscriptions}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Invested Volume</span>
                      <CurrencyDisplay amount={prod.total_invested_volume} size="sm" colored />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={createProductOpen}
        onClose={() => setCreateProductOpen(false)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
};
