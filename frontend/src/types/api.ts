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
  bank_id: string;
  bank_code: string;
  ifsc: string;
  account_number: string;
  account_type: 'SAVINGS' | 'CURRENT' | 'INTERNAL_CLEARING' | 'INVESTMENT' | 'SETTLEMENT';
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
  status: 'POSTED' | 'FAILED' | 'REVERSED';
  failure_reason?: string | null;
  created_at: string;
  posted_at?: string | null;
}

// Mirrors backend TransferHistoryItem: GET /api/v1/transfers
export interface TransferHistoryItem extends TransferRequest {
  source_account_number: string;
  destination_account_number: string;
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

// Mirrors backend DailyVolumeResponse (app/schemas/report.py)
export interface DailyVolumeReport {
  timestamp: string;
  daily_records: DailyVolumeItem[];
}


// Mirrors backend BalanceDistributionResponse (app/schemas/report.py)
export interface BalanceDistributionReport {
  timestamp: string;
  total_accounts: number;
  system_clearing_balance: string | number;
  total_customer_liabilities: string | number;
  tier_under_1k_count: number;
  tier_1k_to_10k_count: number;
  tier_10k_to_50k_count: number;
  tier_50k_to_100k_count: number;
  tier_above_100k_count: number;
}

// ==========================================
// INNOVATION A: LedgerGraph Types
// Mirrors backend SubgraphNode / SubgraphEdge / SubgraphResponse (app/schemas/graph.py)
export interface GraphNode {
  id: string;
  account_number: string;
  account_type: string;
  cached_balance: string;
  customer_name: string;
  status: string;
}

export interface GraphEdge {
  id: string; // transfer id
  source: string; // source account id
  target: string; // destination account id
  amount: string;
  currency: string;
  created_at: string;
  status: string;
}

export interface GraphSubgraphResponse {
  target_account_id?: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: Array<Record<string, unknown>>;
}

// Mirrors backend GraphFindingResponse (app/schemas/graph.py)
export interface GraphFindingResponse {
  id: string;
  pattern_type: string;
  detector_version: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  heuristic_score: string;
  primary_account_id: string;
  window_start: string;
  window_end: string;
  involved_transfer_ids: string[];
  involved_account_ids: string[];
  evidence: Record<string, unknown>;
  explanation: string;
  review_status: 'PENDING' | 'CLEARED' | 'CONFIRMED_FRAUD' | 'ESCALATED';
  reviewed_by_user_id?: string | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

// ==========================================
// INNOVATION B: PayeeGuard Types
// ==========================================
export interface PayeePreviewPayload {
  source_account_id: string;
  destination_account_id?: string;
  destination_account_number?: string;
  amount: string;
}

// Mirrors backend TransferPreviewResponse (app/schemas/transfer.py)
export interface PayeePreviewResponse {
  source_account_id: string;
  source_account_number: string;
  source_available_balance: string;
  destination_account_id: string;
  recipient_legal_name: string;
  masked_account_number: string;
  account_type: string;
  nickname?: string | null;
  is_first_time_recipient: boolean;
  prior_transfers_count: number;
  last_transferred_at?: string | null;
  amount: string;
  currency: string;
  validation_status: string;
  advisory_warnings: string[];
  verification_provider: string;
}

// ==========================================
// INNOVATION C: Evidence Dossier & Dispute Types
// ==========================================
export interface CaseEventResponse {
  id: string;
  actor_user_id: string;
  actor_role: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  metadata_snapshot?: Record<string, unknown>;
  created_at: string;
}

export interface DisputeResponse {
  id: string;
  customer_id: string;
  transfer_request_id: string;
  category: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'NEEDS_INFO' | 'RESOLVED' | 'REJECTED';
  assigned_staff_id?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  events: CaseEventResponse[];
  transfer_amount?: string | null;
  transfer_currency?: string | null;
}

// Must match backend DisputeCreateRequest.category pattern (app/schemas/dispute.py)
export type DisputeCategory = 'UNAUTHORIZED' | 'INCORRECT_AMOUNT' | 'NOT_RECEIVED' | 'SUSPECTED_FRAUD' | 'OTHER';

export interface CreateDisputePayload {
  transfer_request_id: string;
  category: DisputeCategory;
  description: string;
}

// Mirrors backend TimelineItem (app/schemas/fraud.py)
export interface ForensicTimelineItem {
  timestamp: string;
  category: 'FACT' | 'HEURISTIC_RULE' | 'STATISTICAL_MODEL' | 'GRAPH_TOPOLOGY' | 'INVESTIGATOR_ACTION';
  title: string;
  detail: string;
  evidence_ref?: string | null;
}

export interface DossierAccount {
  id: string;
  account_number: string;
  account_type: string;
  cached_balance: string;
  customer_legal_name: string;
  status: string;
}

// Mirrors backend ForensicDossierResponse (app/schemas/fraud.py)
export interface ForensicDossierResponse {
  alert: FraudAlert;
  transfer: TransferRequest;
  source_account: DossierAccount;
  destination_account: DossierAccount;
  ledger_transaction?: {
    id: string;
    transaction_type: string;
    description: string;
    created_at: string;
  } | null;
  ledger_entries: Array<{
    id: string;
    account_id: string;
    account_number: string;
    entry_type: 'DEBIT' | 'CREDIT';
    amount: string;
    sequence_num: number;
    created_at: string;
  }>;
  graph_findings: Array<{
    id: string;
    pattern_type: string;
    severity: string;
    heuristic_score: string;
    explanation: string;
    created_at: string;
  }>;
  investigation_notes: InvestigationNoteResponse[];
  audit_events: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  disputes: Array<{
    id: string;
    status: string;
    category: string;
    description: string;
    created_at: string;
  }>;
  timeline: ForensicTimelineItem[];
}

// Mirrors backend InvestigationNoteResponse (app/schemas/fraud.py)
export interface InvestigationNoteResponse {
  id: string;
  fraud_prediction_id: string;
  author_user_id: string;
  note_type: InvestigationNoteType;
  content: string;
  created_at: string;
}

// Must match backend InvestigationNoteCreateRequest.note_type pattern
export type InvestigationNoteType = 'OBSERVATION' | 'EVIDENCE' | 'CONCLUSION' | 'ESCALATION';

export interface CreateNotePayload {
  note_type: InvestigationNoteType;
  content: string;
}

// ==========================================
// INNOVATION D: Fraud Lab Benchmarking Types
// Mirrors backend ScenarioDefinition / DetectorMetrics / SimulationRunResponse (app/schemas/fraud_lab.py)
export interface FraudLabScenario {
  name: string;
  description: string;
  default_samples: number;
}

export interface DetectorMetrics {
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
  review_alerts_count: number;
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
}

export interface ScenarioBreakdownItem {
  count: number;
  is_fraud_scenario: boolean;
  rule_detection_rate: number;
  rf_detection_rate: number;
  graph_detection_rate: number;
  hybrid_detection_rate: number;
}

export interface FraudLabRunResult {
  scenario_name: string;
  seed: number;
  sample_size: number;
  fraud_prevalence: number;
  fraud_count: number;
  legitimate_count: number;
  execution_duration_ms: number;
  detectors: Record<string, DetectorMetrics>;
  scenario_breakdown: Record<string, ScenarioBreakdownItem>;
  ablation_finding: string;
  disclaimer: string;
}

// Mirrors GET /api/v1/fraud-lab/history
export interface FraudLabHistoryItem {
  id: string;
  scenario_name: string;
  seed: number;
  sample_size: number;
  metrics: Record<string, DetectorMetrics>;
  scenario_breakdown: Record<string, ScenarioBreakdownItem>;
  created_at: string;
}

// ==========================================
// INNOVATION E: AI Health & Governance Types
// Mirrors backend ModelHealthResponse (app/schemas/fraud.py)
export interface AIHealthResponse {
  active_model_version: string;
  algorithm: string;
  is_fallback: boolean;
  model_loaded: boolean;
  decision_threshold: number;
  artifact_fingerprint: string;
  feature_schema: string[];
  created_at?: string | null;
  train_samples?: number | null;
  test_samples?: number | null;
  evaluation_summary?: Record<string, unknown> | null;
  triage_metrics: {
    total_predictions: number;
    pending_review: number;
    cleared: number;
    confirmed_fraud: number;
    escalated: number;
    pending_percentage: number;
  };
  feature_drift_indicators: {
    distribution_status: string;
    recent_sample_size: number;
    recent_mean_amount_inr: number;
    reference_window: string;
    interpretation: string;
    [key: string]: unknown;
  };
  known_limitations: string[];
}


// ---------- Banks, inter-bank payments, passbooks ----------

export interface Bank {
  id: string;
  code: string;
  name: string;
  ifsc: string;
}

export type PaymentRail = 'NEFT' | 'RTGS' | 'IMPS';
export type InterbankStatus = 'PENDING_SETTLEMENT' | 'SETTLED' | 'RETURNED' | 'FAILED';

export interface InterbankTransfer {
  id: string;
  utr: string;
  rail: PaymentRail;
  status: InterbankStatus;
  remitter_account_id: string;
  remitter_bank_id: string;
  beneficiary_bank_id: string | null;
  beneficiary_ifsc: string;
  beneficiary_account_number: string;
  beneficiary_name: string;
  amount: string;
  memo: string | null;
  failure_reason: string | null;
  batch_id: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface BeneficiaryLookup {
  bank_name: string;
  ifsc: string;
  account_found: boolean;
  masked_name: string | null;
  reason: string | null;
}

export interface NeftBatchResult {
  batch_id: string;
  processed: number;
  settled_count: number;
  settled_amount: string;
  returned_count: number;
  returned_amount: string;
}

export interface PassbookEntry {
  entry_id: string;
  serial: number;
  transaction_id: string;
  posted_at: string;
  transaction_type: string;
  narration: string;
  debit: string | null;
  credit: string | null;
  balance: string;
}

export interface AccountPassbook {
  account_id: string;
  account_number: string;
  account_type: string;
  bank_code: string;
  bank_name: string;
  ifsc: string;
  holder_name: string | null;
  date_from: string | null;
  date_to: string | null;
  opening_balance: string;
  total_debits: string;
  total_credits: string;
  closing_balance: string;
  truncated: boolean;
  entries: PassbookEntry[];
}

export interface CustomerPassbook {
  customer_id: string;
  full_name: string;
  total_closing_balance: string;
  accounts: AccountPassbook[];
}

export interface BankBalanceSheet {
  bank_id: string;
  code: string;
  name: string;
  ifsc: string;
  customer_count: number;
  account_count: number;
  customer_deposits: string;
  investment_holdings: string;
  settlement_in_flight: string;
  posting_count: number;
  total_debits: string;
  total_credits: string;
  interbank_outward_settled: string;
  interbank_inward_settled: string;
  net_interbank_position: string;
}

export interface BankCustomerRow {
  customer_id: string;
  full_name: string;
  account_count: number;
  balance: string;
}

export interface BankDayBookEntry {
  entry_id: string;
  posted_at: string;
  account_number: string;
  account_type: string;
  holder_name: string | null;
  transaction_type: string;
  narration: string;
  debit: string | null;
  credit: string | null;
}
