"""Fraud Detection & Alert Triage API Endpoints for FinLedger-AI."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff
from app.models.user import User
from app.models.fraud import FraudPrediction
from app.schemas.fraud import FraudPredictionResponse, FraudAlertReviewRequest
from app.services.audit_service import AuditService

router = APIRouter(prefix="/fraud", tags=["Fraud Detection & Investigation"])


@router.get(
    "/alerts",
    response_model=list[FraudPredictionResponse],
    summary="List advisory fraud alerts for staff investigation",
)
def list_fraud_alerts(
    review_status: str | None = Query(default=None, description="Filter by status (PENDING, CLEARED, CONFIRMED_FRAUD, ESCALATED)"),
    decision: str | None = Query(default=None, description="Filter by risk decision (LOW_RISK, MEDIUM_RISK, HIGH_RISK)"),
    min_risk_score: float | None = Query(default=None, ge=0.0, le=1.0, description="Minimum risk score threshold"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Retrieve advisory fraud predictions for staff triage and forensic investigation.

    Restricted to STAFF and ADMIN roles.
    """
    stmt = select(FraudPrediction).order_by(FraudPrediction.risk_score.desc(), FraudPrediction.created_at.desc())

    if review_status:
        stmt = stmt.where(FraudPrediction.review_status == review_status)
    if decision:
        stmt = stmt.where(FraudPrediction.decision == decision)
    if min_risk_score is not None:
        stmt = stmt.where(FraudPrediction.risk_score >= Decimal(f"{min_risk_score:.4f}"))

    stmt = stmt.offset(offset).limit(limit)
    return list(db.scalars(stmt).all())


@router.get(
    "/alerts/{alert_id}",
    response_model=FraudPredictionResponse,
    summary="Get fraud alert details, explainability snapshot, and rule flags",
)
def get_fraud_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Retrieve full forensic snapshot for a specific fraud prediction record."""
    stmt = select(FraudPrediction).where(FraudPrediction.id == alert_id)
    alert = db.scalars(stmt).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fraud alert record not found",
        )

    return alert


@router.patch(
    "/alerts/{alert_id}/review",
    response_model=FraudPredictionResponse,
    summary="Update fraud alert review status (triage action)",
)
def review_fraud_alert(
    alert_id: uuid.UUID,
    payload: FraudAlertReviewRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Update review status of an advisory fraud alert.

    Permitted status values: CLEARED, CONFIRMED_FRAUD, ESCALATED.
    Appends an immutable audit log recording staff triage action.
    """
    stmt = select(FraudPrediction).where(FraudPrediction.id == alert_id)
    alert = db.scalars(stmt).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fraud alert record not found",
        )

    previous_status = alert.review_status
    alert.review_status = payload.review_status
    alert.review_notes = payload.review_notes
    alert.reviewed_by_user_id = current_user.id
    alert.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(alert)

    # Append audit trail for staff triage action
    AuditService.log_event(
        action="FRAUD_ALERT_REVIEW",
        entity_type="FRAUD_PREDICTION",
        entity_id=str(alert.id),
        actor_user_id=current_user.id,
        metadata={
            "previous_status": previous_status,
            "new_status": alert.review_status,
            "transfer_request_id": str(alert.transfer_request_id),
            "review_notes": alert.review_notes,
        },
        db=db,
        independent_txn=True,
    )

    return alert
