"""Multi-bank support and inter-bank (NEFT/RTGS/IMPS) transfers.

Revision ID: f3a7c2d91e40
Revises: e5f2a8c1b307
Create Date: 2026-10-23 12:00:00.000000

Adds:
1. banks reference table, seeded with the home bank (which every existing account is
   backfilled to) and three counterparty banks.
2. accounts.bank_id (NOT NULL, defaults to the home bank) and the SETTLEMENT account type:
   each bank's current account with the central bank, one per bank.
3. INTERBANK_OUTWARD / INTERBANK_SETTLEMENT / INTERBANK_RETURN ledger transaction types.
4. interbank_transfers: the payment instruction, its UTR and settlement lifecycle.
5. ledger_entries.posting_seq: identity serial giving postings a deterministic order for
   passbook running balances. ADD COLUMN fills existing rows without firing the
   row-level immutability triggers.

Settlement accounts are rows in `accounts`, seeded by `scripts/init_db.py --seed-only`
like INR-SYS-CLEARING.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f3a7c2d91e40"
down_revision: Union[str, None] = "e5f2a8c1b307"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

HOME_BANK_ID = "00000000-0000-4000-8000-000000000001"

SEED_BANKS = [
    (HOME_BANK_ID, "FLAI", "FinLedger Bank", "FLAI0000001"),
    ("00000000-0000-4000-8000-000000000002", "IVBK", "Indus Valley Bank", "IVBK0000101"),
    ("00000000-0000-4000-8000-000000000003", "DCBK", "Deccan Commercial Bank", "DCBK0000201"),
    ("00000000-0000-4000-8000-000000000004", "GCBK", "Ganga Cooperative Bank", "GCBK0000301"),
]

OLD_TXN_TYPES = "'CUSTOMER_TRANSFER', 'INITIAL_DEPOSIT', 'CORRECTION_REVERSAL', 'INVESTMENT_PURCHASE'"
NEW_TXN_TYPES = OLD_TXN_TYPES + ", 'INTERBANK_OUTWARD', 'INTERBANK_SETTLEMENT', 'INTERBANK_RETURN'"
OLD_ACC_TYPES = "'SAVINGS', 'CURRENT', 'INTERNAL_CLEARING', 'INVESTMENT'"
NEW_ACC_TYPES = OLD_ACC_TYPES + ", 'SETTLEMENT'"


def upgrade() -> None:
    banks = op.create_table(
        "banks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(4), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("ifsc", sa.String(11), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("code ~ '^[A-Z]{4}$'", name="chk_banks_code_format"),
        sa.CheckConstraint(
            "ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$' AND left(ifsc, 4) = code", name="chk_banks_ifsc_format"
        ),
    )
    op.bulk_insert(banks, [{"id": i, "code": c, "name": n, "ifsc": f} for i, c, n, f in SEED_BANKS])

    # server_default backfills every existing row to the home bank in one step
    op.add_column(
        "accounts",
        sa.Column(
            "bank_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("banks.id", ondelete="RESTRICT"),
            nullable=False,
            server_default=sa.text(f"'{HOME_BANK_ID}'::uuid"),
        ),
    )
    op.create_index("ix_accounts_bank_id", "accounts", ["bank_id"])
    op.create_index(
        "uq_accounts_one_settlement_per_bank",
        "accounts",
        ["bank_id"],
        unique=True,
        postgresql_where=sa.text("account_type = 'SETTLEMENT'"),
    )
    op.drop_constraint("chk_accounts_type_valid", "accounts", type_="check")
    op.create_check_constraint("chk_accounts_type_valid", "accounts", f"account_type IN ({NEW_ACC_TYPES})")

    op.drop_constraint("chk_ledger_txn_type_valid", "ledger_transactions", type_="check")
    op.create_check_constraint(
        "chk_ledger_txn_type_valid", "ledger_transactions", f"transaction_type IN ({NEW_TXN_TYPES})"
    )

    op.add_column(
        "ledger_entries",
        sa.Column("posting_seq", sa.BigInteger(), sa.Identity(always=True), nullable=False),
    )
    op.create_unique_constraint("ledger_entries_posting_seq_key", "ledger_entries", ["posting_seq"])

    op.create_table(
        "interbank_transfers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("utr", sa.String(16), nullable=False, unique=True),
        sa.Column("rail", sa.String(4), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("source_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("remitter_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("remitter_bank_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("banks.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("beneficiary_bank_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("banks.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("beneficiary_ifsc", sa.String(11), nullable=False),
        sa.Column("beneficiary_account_number", sa.String(32), nullable=False),
        sa.Column("beneficiary_name", sa.String(100), nullable=False),
        sa.Column("beneficiary_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("memo", sa.String(255), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("batch_id", sa.String(32), nullable=True),
        sa.Column("outward_txn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("settlement_txn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("source_user_id", "idempotency_key", name="uq_interbank_user_idempotency"),
        sa.CheckConstraint("rail IN ('NEFT', 'RTGS', 'IMPS')", name="chk_interbank_rail_valid"),
        sa.CheckConstraint(
            "status IN ('PENDING_SETTLEMENT', 'SETTLED', 'RETURNED', 'FAILED')", name="chk_interbank_status_valid"
        ),
        sa.CheckConstraint("amount > 0.00", name="chk_interbank_amount_positive"),
        sa.CheckConstraint("beneficiary_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'", name="chk_interbank_ifsc_format"),
        sa.CheckConstraint("status = 'FAILED' OR outward_txn_id IS NOT NULL", name="chk_interbank_outward_posted"),
        sa.CheckConstraint(
            "status NOT IN ('SETTLED', 'RETURNED') OR (settlement_txn_id IS NOT NULL AND settled_at IS NOT NULL)",
            name="chk_interbank_settlement_posted",
        ),
    )
    op.create_index("ix_interbank_transfers_source_user_id", "interbank_transfers", ["source_user_id"])
    op.create_index("ix_interbank_transfers_remitter_account_id", "interbank_transfers", ["remitter_account_id"])
    op.create_index("ix_interbank_transfers_beneficiary_account_id", "interbank_transfers", ["beneficiary_account_id"])
    op.create_index("idx_interbank_status_rail_created", "interbank_transfers", ["status", "rail", "created_at"])


def downgrade() -> None:
    op.drop_table("interbank_transfers")
    op.execute("ALTER TABLE ledger_entries DROP COLUMN IF EXISTS posting_seq")  # drops its unique key too
    # Fails loudly if inter-bank history exists: append-only ledger rows cannot be discarded
    op.drop_constraint("chk_ledger_txn_type_valid", "ledger_transactions", type_="check")
    op.create_check_constraint(
        "chk_ledger_txn_type_valid", "ledger_transactions", f"transaction_type IN ({OLD_TXN_TYPES})"
    )
    op.execute("DELETE FROM accounts WHERE account_type = 'SETTLEMENT'")
    op.drop_constraint("chk_accounts_type_valid", "accounts", type_="check")
    op.create_check_constraint("chk_accounts_type_valid", "accounts", f"account_type IN ({OLD_ACC_TYPES})")
    op.drop_index("uq_accounts_one_settlement_per_bank", table_name="accounts")
    op.drop_index("ix_accounts_bank_id", table_name="accounts")
    op.drop_column("accounts", "bank_id")
    op.drop_table("banks")
