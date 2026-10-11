/**
 * Strict TypeScript types mirroring FinLedger-AI FastAPI schemas.
 * Denominated strictly in INR. Zero floating point rounding assumptions.
 */

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string | null;
  pan_number: string | null;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  customer?: CustomerProfile | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Account {
  id: string;
  customer_id: string | null;
  account_number: string;
  account_type: 'SAVINGS' | 'CURRENT' | 'INTERNAL_CLEARING' | 'INVESTMENT';
  currency: 'INR';
  cached_balance: string | number; // Decimal string from backend
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: string | number;
  sequence_num: number;
  created_at: string;
}

export interface TransferRequest {
  id: string;
  idempotency_key: string;
  source_account_id: string;
  destination_account_id: string;
  amount: string | number;
  currency: 'INR';
  status: 'POSTED' | 'FAILED';
  failure_reason?: string | null;
  created_at: string;
  posted_at?: string | null;
}

export type ProductType = 'FIXED_DEPOSIT' | 'RECURRING_DEPOSIT' | 'MUTUAL_FUND' | 'TREASURY_BILL';

export interface FinancialProduct {
  id: string;
  name: string;
  code: string;
  product_type: ProductType;
  annual_yield_rate: string | number;
  min_amount: string | number;
  term_months: number;
  is_active: boolean;
}

export interface Investment {
  id: string;
  customer_id: string;
  account_id: string;
  product_id: string;
  invested_amount: string | number;
  current_value: string | number;
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  start_date: string;
  maturity_date: string;
  created_at: string;
  nominal_accrued_yield?: string | number | null;
  product?: FinancialProduct | null;
}

export interface PortfolioHoldingItem {
  investment_id: string;
  product_name: string;
  product_code: string;
  product_type: ProductType;
  annual_yield_rate: string | number;
  invested_amount: string | number;
  current_value: string | number;
  status: string;
  start_date: string;
  maturity_date: string;
  term_months: number;
  nominal_accrued_yield: string | number;
}

export interface PortfolioSummary {
  customer_id: string;
  total_invested: string | number;
  total_current_value: string | number;
  active_investments_count: number;
  available_savings_balance: string | number;
  total_net_worth: string | number;
  allocation_by_product_type: Record<string, string | number>;
  holdings?: PortfolioHoldingItem[];
}

export type FraudReviewStatus = 'PENDING' | 'CLEARED' | 'CONFIRMED_FRAUD' | 'ESCALATED';
export type FraudRiskDecision = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export interface FraudAlert {
  id: string;
  transfer_request_id: string;
  model_version: string;
  risk_score: string | number;
  decision: FraudRiskDecision;
  rule_flags: string[];
  feature_snapshot: Record<string, unknown>;
  explanation: string;
  review_status: FraudReviewStatus;
  reviewed_by_user_id?: string | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface DiscrepancyItem {
  account_id: string;
  account_number: string;
  cached_balance: string | number;
  derived_balance: string | number;
  discrepancy: string | number;
}

export interface ReconciliationReport {
  reconciled_at: string;
  total_accounts_checked: number;
  discrepancy_count: number;
  is_balanced: boolean;
  system_clearing_balance: string | number;
  total_customer_liabilities: string | number;
  global_net_ledger_delta: string | number;
  discrepancies: DiscrepancyItem[];
}

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  accounts_count: number;
  total_savings_balance: string | number;
  total_invested_balance: string | number;
  total_net_worth: string | number;
  total_transfers_sent_count: number;
  total_transfers_sent_volume: string | number;
  total_transfers_received_count: number;
  total_transfers_received_volume: string | number;
  active_investments_count: number;
}

export interface ProductSummaryItem {
  product_id: string;
  name: string;
  code: string;
  product_type: ProductType;
  annual_yield_rate: string | number;
  min_amount: string | number;
  term_months: number;
  is_active: boolean;
  total_subscriptions: number;
  active_subscriptions: number;
  total_invested_volume: string | number;
}

export interface ProductsSummaryReport {
  timestamp: string;
  products: ProductSummaryItem[];
  total_products_count: number;
  total_system_invested_volume: string | number;
}

export interface DailyVolumeItem {
  date: string;
  transfer_count: number;
  transfer_volume: string | number;
  investment_count: number;
  investment_volume: string | number;
  total_day_volume: string | number;
}

export interface DailyVolumeReport {
  window_days: number;
  records: DailyVolumeItem[];
  total_window_transfers_count: number;
  total_window_transfers_volume: string | number;
  total_window_investments_count: number;
  total_window_investments_volume: string | number;
}

export interface BalanceDistributionTier {
  tier_name: string;
  range_label: string;
  account_count: number;
  percentage_of_accounts: string | number;
  total_balance_volume: string | number;
}

export interface BalanceDistributionReport {
  timestamp: string;
  tiers: BalanceDistributionTier[];
  total_customer_accounts: number;
  total_customer_funds: string | number;
}
