# FinLedger-AI — College Demonstration & Examination Guide

**Project:** FinLedger-AI: An Auditable Financial Transaction System with AI-Assisted Fraud Detection  
**Purpose:** Step-by-Step Practical Demonstration Protocol for Academic Reviewers & Evaluators  
**Execution Environment:** Windows 11 / Local PostgreSQL 16+ / FastAPI / React 19  

---

## Prerequisites & Pre-Demo Verification

Before beginning the demonstration, verify that the application services are active and healthy:

1. **Backend Server Status**:
   ```powershell
   curl http://127.0.0.1:8000/health
   # Expected: {"status":"healthy","service":"FinLedger-AI","environment":"development"}
   ```
2. **Frontend UI Status**:
   Open browser at [http://localhost:5173](http://localhost:5173).
3. **Database Ledger Integrity Verification**:
   ```powershell
   cd backend
   ..\.venv\Scripts\python.exe scripts/reconcile_ledger.py
   # Expected: Discrepancy Count: 0, Global Net Ledger Delta: INR 0.00
   ```

---

## 10-Step Interactive Demonstration Script

### Step 1: Customer Registration, Authentication & Automatic Account Provisioning
- **Concept Demonstrated**: Secure customer onboarding with zero-balance liability account provisioning.
- **Action (UI / API)**:
  - In browser at `http://localhost:5173`, click **"Register as New Customer"**.
  - Fill details: Full Name: `Aarav Mehta`, Username: `aarav_mehta`, Email: `aarav@example.com`, Phone: `+919876543210`, Password: `Password123!`.
  - Click **Register**. The system authenticates and redirects to the **Customer Dashboard**.
- **Expected Observation**:
  - The dashboard displays a primary **SAVINGS** account (e.g. `INR-SAV-XXXXXX-0001`).
  - Authoritative cached balance is strictly **₹0.00**.
  - Demonstrates that funds are never fabricated during account creation.

---

### Step 2: Simulated Opening Deposit via Clearing Account
- **Concept Demonstrated**: Strict Double-Entry Ledger Invariant ($\sum \text{Debits} == \sum \text{Credits}$). Money is never manufactured via an arbitrary `UPDATE`; it is deposited against system clearing account `INR-SYS-CLEARING`.
- **Action (UI / API)**:
  - In the Customer Dashboard, click **"Deposit Funds"**.
  - Enter Amount: `₹50,000.00`, Narrative: `Initial verified salary deposit`.
  - Click **Confirm Deposit**.
- **Expected Observation**:
  - Dashboard balance updates atomically to **₹50,000.00**.
  - In **Recent Transactions**, inspect the double-entry legs:
    - Leg 1: `CREDIT` ₹50,000.00 on customer account (liability increase).
    - Leg 2: `DEBIT` ₹50,000.00 on system clearing account (`INR-SYS-CLEARING`).
  - PostgreSQL deferrable constraint trigger `trg_verify_ledger_balance` verified zero net delta at transaction commit.

---

### Step 3: Peer-to-Peer Transfer Execution & Receipt Inspection
- **Concept Demonstrated**: Atomic transfer execution between distinct customer accounts with balanced double-entry ledger legs and immediate receipt issuance.
- **Action (UI / API)**:
  - Click **"New Transfer"**.
  - Destination Account Number: Enter a valid demo account (e.g. `INR-SAV-DEMO-0002` or second demo account).
  - Amount: `₹15,000.00`.
  - Currency: `INR` (enforced by schema check constraint).
  - Narrative: `Consulting fee payment`. Click **Submit Transfer**.
- **Expected Observation**:
  - Transfer commits with status `POSTED`.
  - Customer cached balance immediately decrements: ₹50,000.00 $\to$ **₹35,000.00**.
  - Digital receipt displays: Transfer UUID, Idempotency Key, Source Account, Destination Account, Timestamp, and `POSTED` status.

---

### Step 4: Idempotent Replay Verification (Network Retry Simulation)
- **Concept Demonstrated**: Safe client retransmission. Network drops or user double-clicks must not cause double-spending.
- **Action (API / Terminal)**:
  - Submit the identical transfer request payload using the exact same `Idempotency-Key` header:
  ```powershell
  # Using the curl command with identical UUID and payload
  curl -X POST http://127.0.0.1:8000/api/v1/transfers `
    -H "Authorization: Bearer <CUSTOMER_TOKEN>" `
    -H "Idempotency-Key: <PREVIOUS_KEY>" `
    -H "Content-Type: application/json" `
    -d '{\"source_account_id\":\"<SRC_ID>\",\"destination_account_id\":\"<DST_ID>\",\"amount\":15000.00,\"currency\":\"INR\"}'
  ```
- **Expected Observation**:
  - The API returns **HTTP 200 OK** (not 201 Created) containing the cached transfer receipt.
  - Customer balance remains strictly **₹35,000.00** (zero additional money debited).
  - Confirms idempotency table lookup `(source_user_id, idempotency_key)` prevented duplicate execution.

---

### Step 5: Competing Withdrawals & Overdraft Prevention
- **Concept Demonstrated**: Relational check constraints (`cached_balance >= 0.00`) and deterministic row locking (`SELECT ... ORDER BY id FOR UPDATE`) preventing negative balances and race conditions.
- **Action (UI / Terminal)**:
  - Attempt an excessive transfer of `₹999,999.00` from the account holding ₹35,000.00:
- **Expected Observation**:
  - Transaction is rejected with **HTTP 400 Bad Request**: `"Insufficient funds: available balance is 35000.00 INR, transfer amount is 999999.00 INR"`.
  - Financial transaction is completely rolled back (zero funds deducted, zero ledger legs created).
  - Independent audit transaction persists failure record `TRANSFER_FAILED` for non-repudiation.
  - Account balance remains strictly **₹35,000.00**.

---

### Step 6: Triggering a Synthetic Suspicious Fraud Scenario
- **Concept Demonstrated**: Transparent AI-assisted fraud detection. Machine learning model evaluates transaction features and generates advisory risk scores with feature attribution explanations.
- **Action**:
  - Execute a high-velocity or structuring transaction scenario (e.g. amount `₹49,500.00` structured just below the ₹50,000 reporting threshold during late hours).
- **Expected Observation**:
  - Financial transfer posts normally (AI is advisory only; it does not block the customer autonomously).
  - ML inference pipeline computes risk score (e.g. `0.8520`) and triggers `RULE_STRUCTURING`.
  - Advisory fraud record is created in `fraud_predictions` with `review_status = 'PENDING'`.

---

### Step 7: Staff Investigation, Forensic Notes & Audited Resolution
- **Concept Demonstrated**: Separation of duties and strict human-in-the-loop review governance. Staff decisions require mandatory notes and produce immutable audit logs.
- **Action**:
  - Sign in as compliance staff: Username `priya_investigator`, Password `Password123!`.
  - Navigate to **Fraud Alerts Triage Queue** (`/fraud/alerts`).
  - Select the pending alert. Inspect:
    - Risk Score, Decision (`HIGH_RISK`), Model Version (`rf-v1.0.0`).
    - Explainability breakdown and feature snapshot.
  - Click **Review Alert**. Select Status: `CONFIRMED_FRAUD`.
  - Enter mandatory investigation notes: `Identified classic structuring pattern below ₹50,000 threshold. Confirmed for escalation.`
  - Click **Commit Review Decision**.
- **Expected Observation**:
  - Review status updates to `CONFIRMED_FRAUD`.
  - Review notes and reviewer ID are persisted.
  - Audit trail records event `FRAUD_ALERT_REVIEW` with timestamp and forensic attribution.

---

### Step 8: Ledger Immutability Verification (Trigger Defense Demonstration)
- **Concept Demonstrated**: PostgreSQL database triggers protect committed financial data. Even database administrators cannot execute raw SQL `UPDATE` or `DELETE` on posted entries.
- **Action (SQL Command via psql / Python)**:
  ```powershell
  cd backend
  ..\.venv\Scripts\python.exe -c "
  from app.core.config import settings
  from sqlalchemy import create_engine, text
  engine = create_engine(settings.sync_database_url)
  with engine.connect() as conn:
      try:
          conn.execute(text('UPDATE ledger_entries SET amount = 9999.00 WHERE sequence_num = 1;'))
          conn.commit()
          print('VULNERABILITY: Ledger was modified!')
      except Exception as err:
          print('PROTECTED:', err)
  "
  ```
- **Expected Observation**:
  - PostgreSQL raises exception: `PostgreSQL trigger trg_immutable_ledger_entries: Modification of committed ledger entries is strictly prohibited.`
  - Proves physical append-only enforcement at the DBMS engine layer.

---

### Step 9: System Balance Reconciliation Audit
- **Concept Demonstrated**: Complete mathematical reconciliation asserting that cached balances equal derived sums of all posted debits and credits across all accounts.
- **Action**:
  - In Staff Portal, navigate to **System Reconciliation** page, or execute:
  ```powershell
  cd backend
  ..\.venv\Scripts\python.exe scripts/reconcile_ledger.py
  ```
- **Expected Observation**:
  - Total Accounts Checked: Audits all customer and clearing accounts.
  - System Clearing Balance: Exactly matches total customer liabilities with opposite sign.
  - Global Net Ledger Delta: **INR 0.00**.
  - Discrepancy Count: **0**.
  - System status: `BALANCED`.

---

### Step 10: DBMS Performance & Query Plan Demonstration (Phase 7 Optimization)
- **Concept Demonstrated**: Relational query optimization using `EXPLAIN (ANALYZE, BUFFERS)`. Demonstrates how composite indexes eliminate full-table sequential scans.
- **Action**:
  - Execute the compliance transaction search query plan:
  ```powershell
  cd backend
  ..\.venv\Scripts\python.exe scripts/benchmark_dbms.py --db-name finledger_bench --run
  ```
- **Expected Observation**:
  - **Workload 2B (Staff Search)**: Uses `Index Scan using idx_transfers_status_created` executing in **~0.10 ms** (106 buffer blocks), compared to baseline Sequential Scan of **10.92 ms** (2,208 buffer blocks) — **105x faster**.
  - **Workload 1 (Ledger History)**: Uses `Index Scan using idx_ledger_entries_account_created_seq` executing in **~0.08 ms** with zero quicksort sort overhead.
  - **Workload 2A (Regression Explanation)**: Explain honestly that `LIMIT 50` cost discounting causes PostgreSQL to favor index scan over BitmapOr, scanning 3,105 rows to filter 3,055 non-matching entries.

---

## Safe Reset & Clean Recovery Instructions

If you wish to reset test records after the demonstration **without affecting your persistent data**:
- **Test Database Clean Reset**:
  ```powershell
  cd backend
  ..\.venv\Scripts\pytest.exe -v
  # pytest fixtures use automatic transactional rollbacks and isolated test schemas.
  ```
- **Benchmark Database Refresh**:
  ```powershell
  cd backend
  ..\.venv\Scripts\python.exe scripts/benchmark_dbms.py --db-name finledger_bench --populate --transfers 25000 --seed 42
  ```
- **CRITICAL SAFETY BOUNDARY**:
  Never execute `TRUNCATE` or `DROP DATABASE` on `finledger`. All demonstrations run safely against seeded customer profiles and standard API calls.
