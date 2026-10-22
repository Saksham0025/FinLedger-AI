"""Bank, inter-bank payment and statement Pydantic v2 schemas for FinLedger-AI."""

from datetime import datetime
from decimal import Decimal
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator

IFSC_PATTERN = r"^[A-Z]{4}0[A-Z0-9]{6}$"


class BankResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    ifsc: str


class InterbankTransferCreateRequest(BaseModel):
    """Payload for POST /api/v1/interbank/transfers."""

    source_account_id: uuid.UUID
    rail: str = Field(..., pattern=r"^(NEFT|RTGS|IMPS)$")
    beneficiary_ifsc: str = Field(..., pattern=IFSC_PATTERN, description="11-character IFSC of the beneficiary branch")
    beneficiary_account_number: str = Field(..., min_length=3, max_length=32)
    beneficiary_name: str = Field(..., min_length=2, max_length=100)
    amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2, le=Decimal("10000000.00"))
    memo: str | None = Field(default=None, max_length=120)

    @field_validator("beneficiary_ifsc", mode="before")
    @classmethod
    def upper_ifsc(cls, v: str) -> str:
        return v.strip().upper() if isinstance(v, str) else v

    @field_validator("beneficiary_account_number", "beneficiary_name")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()


class InterbankTransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utr: str
    rail: str
    status: str
    remitter_account_id: uuid.UUID
    remitter_bank_id: uuid.UUID
    beneficiary_bank_id: uuid.UUID | None
    beneficiary_ifsc: str
    beneficiary_account_number: str
    beneficiary_name: str
    amount: Decimal
    memo: str | None
    failure_reason: str | None
    batch_id: str | None
    created_at: datetime
    settled_at: datetime | None


class BeneficiaryLookupResponse(BaseModel):
    bank_name: str
    ifsc: str
    account_found: bool
    masked_name: str | None
    reason: str | None


class NeftBatchResponse(BaseModel):
    batch_id: str
    processed: int
    settled_count: int
    settled_amount: Decimal
    returned_count: int
    returned_amount: Decimal


class PassbookEntry(BaseModel):
    entry_id: uuid.UUID
    serial: int
    transaction_id: uuid.UUID
    posted_at: datetime
    transaction_type: str
    narration: str
    debit: Decimal | None
    credit: Decimal | None
    balance: Decimal


class AccountPassbook(BaseModel):
    account_id: uuid.UUID
    account_number: str
    account_type: str
    bank_code: str
    bank_name: str
    ifsc: str
    holder_name: str | None
    date_from: datetime | None
    date_to: datetime | None
    opening_balance: Decimal
    total_debits: Decimal
    total_credits: Decimal
    closing_balance: Decimal
    truncated: bool
    entries: list[PassbookEntry]


class CustomerPassbook(BaseModel):
    customer_id: uuid.UUID
    full_name: str
    total_closing_balance: Decimal
    accounts: list[AccountPassbook]


class BankBalanceSheet(BaseModel):
    bank_id: uuid.UUID
    code: str
    name: str
    ifsc: str
    customer_count: int
    account_count: int
    customer_deposits: Decimal
    investment_holdings: Decimal
    settlement_in_flight: Decimal
    posting_count: int
    total_debits: Decimal
    total_credits: Decimal
    interbank_outward_settled: Decimal
    interbank_inward_settled: Decimal
    net_interbank_position: Decimal


class BankCustomerRow(BaseModel):
    customer_id: uuid.UUID
    full_name: str
    account_count: int
    balance: Decimal


class BankDayBookEntry(BaseModel):
    entry_id: uuid.UUID
    posted_at: datetime
    account_number: str
    account_type: str
    holder_name: str | None
    transaction_type: str
    narration: str
    debit: Decimal | None
    credit: Decimal | None
