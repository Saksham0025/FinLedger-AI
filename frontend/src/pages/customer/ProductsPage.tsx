import React, { useState, useEffect } from 'react';
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
import { Sparkles, Clock, ShieldCheck, ArrowRight, Landmark, Layers } from 'lucide-react';

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
    { label: 'All Instruments', value: 'ALL' },
    { label: 'Fixed Deposits', value: 'FIXED_DEPOSIT' },
    { label: 'Recurring Deposits', value: 'RECURRING_DEPOSIT' },
    { label: 'Mutual Funds', value: 'MUTUAL_FUND' },
    { label: 'Treasury Bills', value: 'TREASURY_BILL' },
  ];

  const getProductTheme = (type: string) => {
    switch (type) {
      case 'FIXED_DEPOSIT':
        return {
          badgeVariant: 'forest' as const,
          accentBorder: 'border-l-4 border-l-forest-800 hover:border-forest-700',
          yieldColor: 'text-forest-800',
          bgHeader: 'bg-sage-100/70',
          subLabel: 'Capital guaranteed term contract with daily double-entry accrued yield',
        };
      case 'TREASURY_BILL':
        return {
          badgeVariant: 'gold' as const,
          accentBorder: 'border-l-4 border-l-amber-700 hover:border-amber-600',
          yieldColor: 'text-amber-800',
          bgHeader: 'bg-gold-100/70',
          subLabel: 'Sovereign zero-coupon treasury asset issued at discount and redeemed at par',
        };
      case 'MUTUAL_FUND':
        return {
          badgeVariant: 'copper' as const,
          accentBorder: 'border-l-4 border-l-copper-700 hover:border-copper-600',
          yieldColor: 'text-copper-800',
          bgHeader: 'bg-clay-100/70',
          subLabel: 'Diversified benchmark holdings managed under systemic financial risk rules',
        };
      default:
        return {
          badgeVariant: 'sage' as const,
          accentBorder: 'border-l-4 border-l-forest-700 hover:border-forest-600',
          yieldColor: 'text-forest-800',
          bgHeader: 'bg-paper-100',
          subLabel: 'Systematic double-entry interest compounding backed by PostgreSQL transactions',
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Folio Header with Distinct Vertical Spacing (Zero Overlap) */}
      <div className="pb-5 border-b border-hairline space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-forest-900 bg-sage-200/90 px-2.5 py-1 rounded border border-moss-300 shadow-xs">
            FOLIO // WEALTH CATALOGUE • SECTION § 04
          </span>
          <span className="text-xs text-ink-600 font-mono font-medium">
            Institutional Asset Management & Yield Accruals
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950 leading-tight">
              Financial Products & Fixed-Yield Catalogue
            </h1>
            <Badge variant="forest" size="sm">
              DOUBLE-ENTRY ACCRUAL
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-600 bg-paper-100 px-3 py-1.5 rounded border border-hairline">
            <Layers className="w-3.5 h-3.5 text-forest-800" />
            <span>{products.length} Regulated Instruments</span>
          </div>
        </div>

        <p className="text-xs text-ink-600 font-sans max-w-2xl leading-relaxed">
          Regulated institutional investment assets with automated interest accumulation, backed by PostgreSQL double-entry postings and deferred constraint triggers.
        </p>
      </div>

      {/* Filter Category Segmented Control with Guaranteed Active State Visibility */}
      <div className="space-y-2">
        <span className="text-[11px] font-sans uppercase font-bold tracking-wider text-forest-800 block">
          Filter by Asset Classification:
        </span>
        <div className="bg-mist-100 p-2 rounded-lg border-2 border-eucalyptus-300 flex items-center gap-2 overflow-x-auto shadow-inner">
          {categories.map((cat) => {
            const isActive = selectedType === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedType(cat.value)}
                className={`px-4 py-2 rounded-md text-xs font-sans transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-forest-800 text-white font-bold border-2 border-forest-950 shadow-md ring-2 ring-forest-900/50'
                    : 'bg-white text-forest-900 hover:text-forest-950 hover:bg-sage-100 border border-eucalyptus-300 font-semibold shadow-xs'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Products Grid with Distinct Surface Hierarchy and Left Accent Rails */}
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-6 h-6 text-forest-700" />}
          title="No Instruments Available"
          description="No financial products currently match the selected classification filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => {
            const theme = getProductTheme(prod.product_type);
            return (
              <div
                key={prod.id}
                className={`bg-mist-100 border-2 border-eucalyptus-300 ${theme.accentBorder} rounded-lg flex flex-col justify-between transition-all shadow-atelier hover:shadow-atelier-md overflow-hidden hover:border-forest-700`}
              >
                {/* Contrasting Forest Header Strip */}
                <div className="flex items-center justify-between gap-2 border-b-2 border-forest-950 px-5 py-3.5 bg-forest-900 text-white">
                  <Badge variant="forest" size="sm">
                    {prod.product_type}
                  </Badge>
                  <span className="font-mono text-xs text-white font-bold bg-forest-950 px-2.5 py-0.5 rounded border border-forest-800 shadow-xs">
                    {prod.code}
                  </span>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl font-bold text-forest-950 leading-snug">{prod.name}</h3>
                    <p className="text-xs text-forest-800 font-sans leading-relaxed">
                      {theme.subLabel}
                    </p>
                  </div>

                  {/* High-Contrast Yield & Term Inset Card */}
                  <div className="p-4 rounded-md bg-white border border-eucalyptus-300 grid grid-cols-2 gap-4 text-xs shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase text-forest-700 block font-sans font-bold">
                        Annual Return Yield
                      </span>
                      <span className="text-forest-800 font-bold text-2xl tabular-nums font-serif block mt-0.5">
                        {formatPercent(prod.annual_yield_rate)}
                      </span>
                      <span className="text-[10px] text-forest-600 font-mono block">per annum fixed</span>
                    </div>

                    <div className="border-l border-eucalyptus-200 pl-4">
                      <span className="text-[10px] uppercase text-forest-700 block font-sans font-bold">
                        Term Duration
                      </span>
                      <span className="text-forest-950 font-bold text-xl flex items-center gap-1.5 tabular-nums font-mono block mt-0.5">
                        <Clock className="w-4 h-4 text-forest-800" />
                        {prod.term_months} M
                      </span>
                      <span className="text-[10px] text-forest-600 font-mono block">Fixed lockup</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-t border-eucalyptus-200 font-sans">
                    <span className="text-forest-800 flex items-center gap-1 font-medium">
                      <Landmark className="w-3.5 h-3.5 text-forest-800" /> Min. Subscription:
                    </span>
                    <CurrencyDisplay amount={prod.min_amount} size="sm" className="font-bold text-forest-950 font-mono" />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full font-bold shadow-sm"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setPurchaseModalOpen(true);
                      }}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
                    >
                      Subscribe to Position
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Institutional Safeguard Notice */}
      <div className="p-5 rounded-lg bg-sage-200 border-2 border-eucalyptus-400 shadow-atelier flex items-start gap-3.5 font-sans text-xs text-forest-900">
        <ShieldCheck className="w-5 h-5 text-forest-800 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-forest-950 font-bold">Strict Balance Conservation:</strong> Subscribing to an investment instrument transfers money from your primary liability account into a dedicated holding ledger under canonical row locks. Zero unbacked yields or fabricated interest rates. All returns are posted through balanced double-entry accounting legs.
        </p>
      </div>

      {/* Investment Purchase Modal */}
      <InvestmentPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        product={selectedProduct}
        accounts={accounts}
        onPurchaseSuccess={fetchData}
      />
    </div>
  );
};
