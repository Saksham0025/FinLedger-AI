# Multi-bank Ledger, Inter-bank Payments and Passbooks

## How inter-bank transfers work in India (research summary)

- **Banks settle through the central bank.** Each bank keeps a current (settlement)
  account with the RBI. A payment from Bank A to Bank B debits the customer at A,
  moves funds from A's settlement account to B's, and B credits its customer.
- **Routing uses IFSC.** An 11-character code: 4-letter bank code, a reserved `0`, then a
  6-character branch code (e.g. `SBIN0002345`). NEFT and RTGS use it to route messages.
- **Three rails:**
  | Rail | Settlement | Limits used here |
  |------|-----------|------------------|
  | IMPS | Instant, 24x7 | up to ₹5,00,000 |
  | NEFT | Deferred net settlement in half-hourly batches | no RBI minimum or maximum |
  | RTGS | Real-time gross settlement, 24x7 since Dec 2020 | minimum ₹2,00,000 |
- **Returns.** If the beneficiary bank cannot credit (no such account, frozen, closed), it
  must return the money. For NEFT the RBI rule is within 2 hours of the batch settling (B+2).
- **UTR.** Each payment carries a Unique Transaction Reference quoted by both banks.
- **Beneficiary name lookup.** Banks offer a name check before an NEFT/RTGS payment.

Sources: [ICICI Bank NEFT/RTGS/IMPS limits & timings](https://www.icici.bank.in/personal-banking/online-services/funds-transfer/neft-rtgs),
[Indian Financial System Code (Wikipedia)](https://en.wikipedia.org/wiki/Indian_Financial_System_Code),
[RBI NEFT circular (B+2 returns)](https://website.rbi.org.in/documents/87730/39710850/NEFTR050210.pdf),
[SBI RTGS/NEFT FAQ](https://sbi.bank.in/en/web/faq-s/faq-rtgs-neft).

## How FinLedger-AI models it

Migration `f3a7c2d91e40` adds:

- `banks`: FinLedger Bank (`FLAI0000001`, the home bank every existing account was
  backfilled to), Indus Valley Bank (`IVBK0000101`), Deccan Commercial Bank
  (`DCBK0000201`) and Ganga Cooperative Bank (`GCBK0000301`). These are fictional banks with one branch each.
- `accounts.bank_id`, and a `SETTLEMENT` account type: `INR-SET-<code>`, one per bank
  (partial unique index), seeded by `scripts/init_db.py --seed-only`.
- `interbank_transfers`: the payment instruction, its UTR, rail and lifecycle
  `PENDING_SETTLEMENT → SETTLED | RETURNED`, or `FAILED` before money moves.
- `ledger_entries.posting_seq`: an identity serial. It gives the passbook a serial number
  and a deterministic order, because `now()` is fixed for the whole of a database transaction.

Every step is a balanced double-entry posting committed atomically:

| Step | Ledger type | Legs |
|------|-------------|------|
| Initiate | `INTERBANK_OUTWARD` | Dr remitter customer, Cr remitter-bank settlement |
| Settle | `INTERBANK_SETTLEMENT` | Dr remitter settlement, Cr beneficiary settlement, Dr beneficiary settlement, Cr beneficiary customer |
| Return | `INTERBANK_RETURN` | Dr remitter settlement, Cr remitter customer |

IMPS and RTGS settle immediately after initiation. NEFT waits for
`POST /interbank/neft/settle-batch` (staff), which simulates the half-hourly batch.
A bank's settlement balance therefore equals its outward payments still in flight.
Locks are taken in canonical order, and the instruction row is locked `FOR UPDATE`
before settlement, so concurrent batch runs cannot settle a payment twice. Idempotency
(`Idempotency-Key`), failure persistence in an independent transaction, and audit logs
follow the same rules as intra-bank transfers.

## Endpoints

| Method & path | Who | Purpose |
|---|---|---|
| `GET /api/v1/banks` | any user | Bank directory with IFSC |
| `GET /api/v1/interbank/beneficiary?ifsc=&account_number=` | customer | Name lookup (masked, e.g. `R***l S****a`) |
| `POST /api/v1/interbank/transfers` | customer | Send over NEFT / RTGS / IMPS |
| `GET /api/v1/interbank/transfers` | customer: own sent and received; staff: all | History |
| `POST /api/v1/interbank/neft/settle-batch` | staff | Run one NEFT batch |
| `GET /api/v1/statements/accounts/{id}/passbook` | owner, staff | Passbook with running balance |
| `GET /api/v1/statements/customer[?customer_id=]` | customer: own; staff: any | Customer-wise passbook across banks |
| `GET /api/v1/statements/banks` | staff | Balance sheet per bank |
| `GET /api/v1/statements/banks/{id}/customers` | staff | Customers of a bank |
| `GET /api/v1/statements/banks/{id}/transactions` | staff | Bank day book |

Passbook figures come from the ledger, not from `cached_balance`: a SQL window
`SUM(...) OVER (ORDER BY posting_seq)` over the account's full history, filtered to the period.

UI: customer **Passbook** and **Other banks** pages, a bank picker on **Accounts**, and the
staff **Banks & clearing** page (balance sheets, NEFT desk, day book, customer drill-down).

## Known limitations

- NEFT items in a batch settle gross, one transaction each. Real NEFT nets per bank pair.
- There is one branch per bank, so the IFSC lives on `banks`.
- Bank balance sheets cover customer deposits, investments and settlement positions only.
  Bank equity and reserves are not modelled.
- Inter-bank payments are not yet sent through the advisory fraud scorer, which takes `TransferRequest` rows.
- Each statement is capped at 2,000 rows. The response flags truncation; narrow the period.
