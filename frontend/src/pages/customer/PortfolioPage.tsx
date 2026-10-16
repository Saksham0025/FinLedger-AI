import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/common/Button';
import { Investment, PortfolioSummary } from '../../types/api';
import { investmentsApi } from '../../api/investments';
import { getErrorMessage } from '../../api/client';
import { Link } from 'react-router-dom';
import { PieChart, Layers, Sparkles, ShieldCheck, ArrowRight, BookOpen, Award } from 'lucide-react';

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
    <div className="space-y-8">
      {/* Editorial Folio Header */}
      <div className="pb-5 border-b border-hairline space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-forest-900 bg-sage-200/90 px-2.5 py-1 rounded border border-moss-300 shadow-xs">
            FOLIO // HOLDINGS REGISTRY • SECTION § 05
          </span>
          <span className="text-xs text-ink-600 font-mono font-medium">
            Accrued Yield Ledger & Securities Portfolio
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950 leading-tight">
              Investment Portfolio & Securities Holdings
            </h1>
            <Badge variant="forest" size="sm">
              PORTFOLIO AUDITED
            </Badge>
          </div>

          <Link to="/products">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-white" />}
              className="shadow-sm font-semibold"
            >
              Explore Catalogue
            </Button>
          </Link>
        </div>

        <p className="text-xs text-ink-600 font-sans max-w-2xl leading-relaxed">
          Active positions with automated daily accrued yield accumulation, audited against PostgreSQL double-entry ledgers with zero unbacked money creation.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Portfolio Financial Overview Card (Level 2 with Level 3 Insets) */}
      {isLoading ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg shadow-atelier overflow-hidden">
          <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-sage-200 block">
                § 05.1 // CONSOLIDATED VALUATION
              </span>
              <h2 className="text-base font-serif font-bold text-white">
                Portfolio Valuation & Accrued Yield Summary
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-sage-100 bg-forest-950 px-3 py-1 rounded border border-forest-800 shadow-xs">
              {portfolio?.active_investments_count ?? 0} Active Contract(s)
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-sans">
            <div className="p-4 rounded-md bg-white border border-eucalyptus-300 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-forest-700 block">
                Total Invested Principal
              </span>
              <div className="text-2xl font-bold font-serif tracking-tight text-forest-950 tabular-nums">
                <CurrencyDisplay amount={totalInvested} size="2xl" colored />
              </div>
              <p className="text-[11px] text-forest-600 font-sans border-t border-eucalyptus-200 pt-1">Debited from primary savings</p>
            </div>

            <div className="p-4 rounded-md bg-sage-200 border border-eucalyptus-400 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-forest-900 block">
                Current Asset Valuation
              </span>
              <div className="text-2xl font-bold font-serif tracking-tight text-forest-950 tabular-nums">
                <CurrencyDisplay amount={totalValue} size="2xl" colored />
              </div>
              <p className="text-[11px] text-forest-800 font-sans border-t border-eucalyptus-300 pt-1">Principal + accumulated interest</p>
            </div>

            <div className="p-4 rounded-md bg-white border border-eucalyptus-300 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-forest-700 block">
                Net Accrued Yield
              </span>
              <div className="text-2xl font-bold font-serif tracking-tight text-forest-900 tabular-nums">
                <CurrencyDisplay amount={totalYield} size="2xl" colored sign="plus" />
              </div>
              <p className="text-[11px] text-forest-600 font-sans border-t border-eucalyptus-200 pt-1">Nominal daily compounding</p>
            </div>

            <div className="p-4 rounded-md bg-white border border-eucalyptus-300 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-forest-700 block">
                Holding Accounts
              </span>
              <div className="text-2xl font-bold font-serif tracking-tight text-forest-950">
                {portfolio?.active_investments_count ?? 0}
              </div>
              <p className="text-[11px] text-forest-600 font-sans border-t border-eucalyptus-200 pt-1">Dedicated asset contracts</p>
            </div>
          </div>
        </div>
      )}

      {/* Asset Allocation Breakdown */}
      {portfolio && Object.keys(portfolio.allocation_by_product_type || {}).length > 0 && (
        <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg p-6 shadow-atelier space-y-4">
          <div className="flex items-center justify-between border-b-2 border-eucalyptus-300 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-950 font-sans flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest-800" />
              Capital Distribution by Asset Class
            </h3>
            <span className="text-xs font-sans text-forest-700 font-medium">Asset-Liability Conservation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(portfolio.allocation_by_product_type).map(([type, amount]) => {
              const parsed = parseFloat(String(amount));
              const pct = totalInvested > 0 ? (parsed / totalInvested) * 100 : 0;
              return (
                <div key={type} className="p-4 rounded-md bg-white border border-eucalyptus-300 space-y-2.5 shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-forest-950 font-sans">{type}</span>
                    <span className="text-[10px] font-mono text-forest-900 font-bold bg-sage-200 px-2 py-0.5 rounded border border-eucalyptus-400">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <CurrencyDisplay amount={parsed} size="md" className="font-serif font-bold text-forest-950" />
                  <div className="w-full bg-mist-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-forest-800 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Holdings Passbook Register */}
      <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-lg overflow-hidden shadow-atelier">
        <div className="px-6 py-4 bg-forest-900 border-b-2 border-forest-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-sage-200 block">
              § 05.2 // CONTRACT REGISTER
            </span>
            <h3 className="text-base font-serif font-bold text-white">
              Active Holdings Register
            </h3>
            <p className="text-xs text-sage-100 font-sans mt-0.5">
              Individual securities contracts with locked principal and automated interest schedules
            </p>
          </div>
          <span className="text-xs text-sage-100 font-mono font-bold bg-forest-950 px-3 py-1 rounded border border-forest-800">
            {investments.length} Active Position(s)
          </span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton rows={4} />
          </div>
        ) : investments.length === 0 ? (
          /* Well-Composed, Balanced Empty State */
          <div className="p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
              <div className="space-y-4 text-center md:text-left">
                <div className="w-12 h-12 rounded-full bg-sage-200 border border-eucalyptus-400 flex items-center justify-center text-forest-800 mx-auto md:mx-0 shadow-xs">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-serif font-bold text-forest-950">No Subscribed Holdings Yet</h4>
                  <p className="text-xs text-forest-800 mt-1.5 leading-relaxed font-sans">
                    You do not currently hold any fixed term deposits, recurring deposit accounts, or treasury bills. Explore our curated catalogue of regulated financial instruments to earn daily accrued yield.
                  </p>
                </div>
                <div>
                  <Link to="/products">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4 text-white" />}>
                      Explore Products Catalogue
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Informational Guidance Panel */}
              <div className="p-5 rounded-lg bg-white border border-eucalyptus-300 space-y-3 font-sans text-xs text-forest-900 shadow-sm">
                <div className="flex items-center gap-2 text-forest-800 font-bold uppercase text-[10px] font-mono border-b border-eucalyptus-200 pb-2">
                  <Award className="w-4 h-4" /> Double-Entry Investment Architecture
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p><strong className="text-forest-950">Direct Account Debit:</strong> Principal is atomically transferred from your savings account to a dedicated investment holding account.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p><strong className="text-forest-950">Systematic Accrual:</strong> Interest compounds mathematically with auditable precision across each contract tenure.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p><strong className="text-forest-950">Maturity Settlement:</strong> Upon maturity, principal plus accumulated interest is returned directly to your primary passbook.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="table-header-forest text-[10px] uppercase font-bold tracking-wider text-white bg-forest-950 border-b border-forest-900">
                <tr>
                  <th className="py-3 px-4 text-white">Instrument</th>
                  <th className="py-3 px-4 font-mono text-white">Contract Ref</th>
                  <th className="py-3 px-4 text-center text-white">Status</th>
                  <th className="py-3 px-4 text-right text-white">Principal</th>
                  <th className="py-3 px-4 text-right text-white">Accrued Yield</th>
                  <th className="py-3 px-4 text-right text-white">Current Valuation</th>
                  <th className="py-3 px-4 text-right text-white">Maturity Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-eucalyptus-200 bg-white/80">
                {investments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-sage-100/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-forest-950">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-forest-800 shrink-0" />
                        <div>
                          <span className="font-bold block">{inv.product?.name || 'Fixed Term Deposit'}</span>
                          <span className="text-[10px] font-mono text-forest-600">{inv.product?.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-forest-800 text-[11px] truncate max-w-[130px]">
                      {inv.id}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={inv.status === 'ACTIVE' ? 'forest' : 'neutral'} size="sm">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-forest-950">
                      <CurrencyDisplay amount={inv.invested_amount} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-forest-800">
                      + <CurrencyDisplay amount={inv.nominal_accrued_yield || '0.00'} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-forest-900 bg-sage-100/60">
                      <CurrencyDisplay amount={inv.current_value} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right text-forest-700 text-[11px] font-sans">
                      <DateDisplay date={inv.maturity_date} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-mist-100 border-t-2 border-eucalyptus-300 flex items-center gap-2 text-xs text-forest-900 font-sans">
          <ShieldCheck className="w-4 h-4 text-forest-800 shrink-0" />
          <span>
            Investment positions are recorded as asset liability obligations in PostgreSQL and reconciled against the general ledger.
          </span>
        </div>
      </div>
    </div>
  );
};
