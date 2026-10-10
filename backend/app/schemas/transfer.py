"""Transfer Pydantic v2 schemas for FinLedger-AI."""

from datetime import datetime
from decimal import Decimal
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TransferCreateRequest(BaseModel):
    """Payload for POST /api/v1/transfers."""

    source_account_id: uuid.UUID = Field(
        ...,
        description="Source account primary key UUID",
    )
    destination_account_id: uuid.UUID = Field(
        ...,
        description="Destination account primary key UUID",
    )
    amount: Decimal = Field(
        ...,
        gt=Decimal("0.00"),
        decimal_places=2,
        le=Decimal("10000000.00"),
        description="Transfer amount in INR (strictly positive, up to 2 decimal places)",
    )
    currency: str = Field(
        default="INR",
        pattern=r"^INR$",
        description="Currency code; strictly INR denominated",
    )
    memo: str | None = Field(
        default=None,
        max_length=255,
        description="Optional transfer description or narrative",
    )


class TransferResponse(BaseModel):
    """Transfer receipt returned on creation or query."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    idempotency_key: str
    source_account_id: uuid.UUID
    destination_account_id: uuid.UUID
    amount: Decimal
    currency: str
    status: str
    failure_reason: str | None = None
    created_at: datetime
    posted_at: datetime | None = None
