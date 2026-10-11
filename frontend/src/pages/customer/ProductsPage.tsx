import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { InvestmentPurchaseModal } from '../../components/customer/InvestmentPurchaseModal';
import { Account, FinancialProduct, ProductType } from '../../types/api';
import { productsApi } from '../../api/products';
import { accountsApi } from '../../api/accounts';
import { formatPercent } from '../../utils/formatters';
import { getErrorMessage } from '../../api/client';
import { Sparkles, Clock } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<FinancialProduct[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<FinancialProduct | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prods, accs] = await Promise.all([
        productsApi.listProducts(
          selectedType === 'ALL' ? undefined : (selectedType as ProductType),
          true
        ),
        accountsApi.listAccounts(),
      ]);
      setProducts(prods);
      setAccounts(accs);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedType]);

  const categories = [
    { label: 'All Products', value: 'ALL' },
    { label: 'Fixed Deposits', value: 'FIXED_DEPOSIT' },
    { label: 'Recurring Deposits', value: 'RECURRING_DEPOSIT' },
    { label: 'Mutual Funds', value: 'MUTUAL_FUND' },
    { label: 'Treasury Bills', value: 'TREASURY_BILL' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Financial Products Catalogue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulated investment assets with automated yield accumulation &bull; Backed by PostgreSQL double-entry postings
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedType(cat.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedType === cat.value
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Products Grid */}
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-6 h-6" />}
          title="No Products Available"
          description="No financial products currently match the selected category filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((prod) => (
            <Card
              key={prod.id}
              glow="none"
              className="flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="info" size="sm">
                    {prod.product_type}
                  </Badge>
                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    {prod.code}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-100">{prod.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Automated principal lock-in with guaranteed simulated yield rate.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                      Annual Yield Rate
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-base">
                      {formatPercent(prod.annual_yield_rate)} p.a.
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                      Term Duration
                    </span>
                    <span className="font-mono text-slate-200 font-bold text-base flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {prod.term_months} Mo
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Minimum Subscription:</span>
                  <CurrencyDisplay amount={prod.min_amount} size="sm" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setSelectedProduct(prod);
                    setPurchaseModalOpen(true);
                  }}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Invest Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Investment Purchase Modal */}
      <InvestmentPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        product={selectedProduct}
        accounts={accounts}
      />
    </div>
  );
};
