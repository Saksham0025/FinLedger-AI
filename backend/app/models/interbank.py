import uuid
from decimal import Decimal
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Text, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.bank import Bank


class InterbankTransfer(Base):
    """Outward payment to another bank over NEFT, RTGS or IMPS.

    Lifecycle (mirrors the RBI payment systems):
      PENDING_SETTLEMENT  remitter debited, funds parked in the remitter bank's settlement account
      SETTLED             funds moved settlement-to-settlement and credited to the beneficiary
      RETURNED            beneficiary bank could not credit; funds returned to the remitter
      FAILED              rejected before any money moved (validation, insufficient funds)

    The beneficiary is addressed by IFSC + account number, exactly as a customer
    would key it in; the beneficiary bank resolves it only at settlement time.
    """

    __tablename__ = "interbank_transfers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utr: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    rail: Mapped[str] = mapped_column(String(4), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    source_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    remitter_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    remitter_bank_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banks.id", ondelete="RESTRICT"), nullable=False
    )
    beneficiary_bank_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banks.id", ondelete="RESTRICT"), nullable=True
    )
    beneficiary_ifsc: Mapped[str] = mapped_column(String(11), nullable=False)
    beneficiary_account_number: Mapped[str] = mapped_column(String(32), nullable=False)
    beneficiary_name: Mapped[str] = mapped_column(String(100), nullable=False)
    beneficiary_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    memo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    batch_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    outward_txn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), nullable=True
    )
    settlement_txn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    remitter_account: Mapped["Account"] = relationship("Account", foreign_keys=[remitter_account_id])
    remitter_bank: Mapped["Bank"] = relationship("Bank", foreign_keys=[remitter_bank_id])
    beneficiary_bank: Mapped["Bank | None"] = relationship("Bank", foreign_keys=[beneficiary_bank_id])

    __table_args__ = (
        UniqueConstraint("source_user_id", "idempotency_key", name="uq_interbank_user_idempotency"),
        CheckConstraint("rail IN ('NEFT', 'RTGS', 'IMPS')", name="chk_interbank_rail_valid"),
        CheckConstraint(
            "status IN ('PENDING_SETTLEMENT', 'SETTLED', 'RETURNED', 'FAILED')",
            name="chk_interbank_status_valid",
        ),
        CheckConstraint("amount > 0.00", name="chk_interbank_amount_positive"),
        CheckConstraint("beneficiary_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'", name="chk_interbank_ifsc_format"),
        # Money that left the remitter must be traceable to its ledger postings
        CheckConstraint(
            "status = 'FAILED' OR outward_txn_id IS NOT NULL", name="chk_interbank_outward_posted"
        ),
        CheckConstraint(
            "status NOT IN ('SETTLED', 'RETURNED') OR (settlement_txn_id IS NOT NULL AND settled_at IS NOT NULL)",
            name="chk_interbank_settlement_posted",
        ),
        Index("idx_interbank_status_rail_created", "status", "rail", "created_at"),
    )
