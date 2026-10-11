"""Fraud Prediction Pydantic v2 schemas for FinLedger-AI."""

from datetime import datetime
from decimal import Decimal
from typing import Any
import uuid
from pydantic import BaseModel, ConfigDict, Field


class FraudPredictionResponse(BaseModel):
    """Advisory fraud prediction score and staff review details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    transfer_request_id: uuid.UUID
    model_version: str
    risk_score: Decimal
    decision: str
    rule_flags: list[str]
    feature_snapshot: dict[str, Any]
    explanation: str
    review_status: str
    reviewed_by_user_id: uuid.UUID | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class FraudAlertReviewRequest(BaseModel):
    """Staff triage review payload for an advisory fraud alert."""

    review_status: str = Field(
        ...,
        pattern=r"^(CLEARED|CONFIRMED_FRAUD|ESCALATED)$",
        description="Updated review status (canonical enum: CLEARED, CONFIRMED_FRAUD, ESCALATED)",
    )
    review_notes: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Mandatory forensic investigation notes from staff member",
    )
