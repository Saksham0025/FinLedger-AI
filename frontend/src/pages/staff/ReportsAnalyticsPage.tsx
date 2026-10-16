import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
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
      <PageHeader
        title="System Reporting & Analytics"
        description="Aggregated metrics derived directly from PostgreSQL analytical queries • Zero client-side estimation"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateProductOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Financial Product
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchReports} />}

      {/* Daily Volume Window Breakdown */}
      <Card
        title="14-Day Activity Breakdown"
        subtitle="Daily transfer volume and simulated investment subscriptions"
        variant="forensic"
      >
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : !dailyVolume || dailyVolume.records.length === 0 ? (
          <p className="p-6 text-center text-xs text-sage-400 font-mono">Zero volume records recorded in window.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-forensic-700">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-forensic-900 text-[10px] uppercase text-sage-300 border-b border-forensic-700 font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date (UTC)</th>
                  <th className="py-2.5 px-3 text-right">Transfer Count</th>
                  <th className="py-2.5 px-3 text-right">Transfer Volume</th>
                  <th className="py-2.5 px-3 text-right">Investment Count</th>
                  <th className="py-2.5 px-3 text-right">Investment Volume</th>
                  <th className="py-2.5 px-3 text-right font-bold text-white">Total Day Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forensic-750">
                {dailyVolume.records.map((rec) => (
                  <tr key={rec.date} className="hover:bg-forensic-800/70 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">{rec.date}</td>
                    <td className="py-2.5 px-3 text-right text-sage-400 tabular-nums">{rec.transfer_count}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <CurrencyDisplay amount={rec.transfer_volume} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right text-sage-400 tabular-nums">{rec.investment_count}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <CurrencyDisplay amount={rec.investment_volume} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
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
          variant="forensic"
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !balanceDist || balanceDist.tiers.length === 0 ? (
            <p className="p-6 text-center text-xs text-sage-400 font-mono">Zero distribution data available.</p>
          ) : (
            <div className="space-y-3 font-sans pt-1">
              {balanceDist.tiers.map((tier) => {
                const pct = parseFloat(String(tier.percentage_of_accounts));
                return (
                  <div key={tier.tier_name} className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">{tier.tier_name}</span>
                        <span className="text-[10px] text-sage-400 font-mono">{tier.range_label}</span>
                      </div>
                      <div className="text-right">
                        <CurrencyDisplay amount={tier.total_balance_volume} size="sm" />
                        <span className="text-[10px] text-sage-400 block font-mono tabular-nums">
                          {tier.account_count} account(s) ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-forensic-950 h-1.5 rounded-full overflow-hidden border border-forensic-700">
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
          variant="forensic"
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !productsSummary || productsSummary.products.length === 0 ? (
            <p className="p-6 text-center text-xs text-sage-400 font-mono">Zero product records found.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {productsSummary.products.map((prod) => (
                <div
                  key={prod.product_id}
                  className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white block">{prod.name}</span>
                      <span className="text-[10px] text-sage-400 font-mono">
                        {prod.code} • {prod.product_type} • {prod.term_months} Months
                      </span>
                    </div>
                    <Badge variant={prod.is_active ? 'evergreen' : 'neutral'} size="sm">
                      {prod.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-forensic-700 text-[11px] font-mono">
                    <div>
                      <span className="text-[10px] text-sage-400 block uppercase tracking-wider font-bold">Yield Rate</span>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {formatPercent(prod.annual_yield_rate)} p.a.
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-sage-400 block uppercase tracking-wider font-bold">Active Subs</span>
                      <span className="text-white font-semibold tabular-nums">{prod.active_subscriptions}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-sage-400 block uppercase tracking-wider font-bold">Invested Volume</span>
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
