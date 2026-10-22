import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

# The bank every pre-existing account belonged to before multi-bank support.
# Fixed so the migration, the accounts.bank_id default and the seeds agree.
HOME_BANK_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


class Bank(Base):
    """Participating bank. One branch per bank, so the IFSC lives here.

    Each bank owns exactly one SETTLEMENT account (INR-SET-<code>) modelling its
    current account with the central bank, through which inter-bank transfers settle.
    """

    __tablename__ = "banks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(4), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(11), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("code ~ '^[A-Z]{4}$'", name="chk_banks_code_format"),
        # RBI IFSC: 4-letter bank code, a reserved '0', then a 6-character branch code
        CheckConstraint("ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$' AND left(ifsc, 4) = code", name="chk_banks_ifsc_format"),
    )

    @property
    def settlement_account_number(self) -> str:
        return f"INR-SET-{self.code}"
