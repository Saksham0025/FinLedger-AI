"""Bank directory and inter-bank (NEFT / RTGS / IMPS) payment endpoints."""

import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_customer, require_staff
from app.models.bank import Bank
from app.models.interbank import InterbankTransfer
from app.models.user import User
from app.schemas.interbank import (
    IFSC_PATTERN,
    BankResponse,
    BeneficiaryLookupResponse,
    InterbankTransferCreateRequest,
    InterbankTransferResponse,
    NeftBatchResponse,
)
from app.services.interbank_service import InterbankService
from app.services.transfer_service import IdempotencyConflictError, TransferBusinessError

router = APIRouter(tags=["Inter-bank Payments"])


@router.get("/banks", response_model=list[BankResponse], summary="List participating banks")
def list_banks(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Bank).order_by(Bank.name)))


@router.get(
    "/interbank/beneficiary",
    response_model=BeneficiaryLookupResponse,
    summary="Verify a beneficiary by IFSC and account number before paying (name is masked)",
)
def lookup_beneficiary(
    ifsc: str = Query(..., pattern=IFSC_PATTERN),
    account_number: str = Query(..., min_length=3, max_length=32),
    _: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    try:
        return InterbankService.lookup_beneficiary(db, ifsc, account_number)
    except TransferBusinessError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.post(
    "/interbank/transfers",
    response_model=InterbankTransferResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send money to another bank over NEFT, RTGS or IMPS",
)
def create_interbank_transfer(
    data: InterbankTransferCreateRequest,
    request: Request,
    response: Response,
    idempotency_key: uuid.UUID = Header(..., alias="Idempotency-Key"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    try:
        transfer, is_replay = InterbankService.initiate(
            db=db,
            caller_user_id=current_user.id,
            idempotency_key=str(idempotency_key),
            source_account_id=data.source_account_id,
            beneficiary_ifsc=data.beneficiary_ifsc,
            beneficiary_account_number=data.beneficiary_account_number,
            beneficiary_name=data.beneficiary_name,
            amount=data.amount,
            rail=data.rail,
            memo=data.memo,
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except IdempotencyConflictError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))
    except TransferBusinessError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)
    if is_replay:
        response.status_code = status.HTTP_200_OK
    return transfer


@router.get(
    "/interbank/transfers",
    response_model=list[InterbankTransferResponse],
    summary="Inter-bank payments: customers see their own (sent or received), staff see all",
)
def list_interbank_transfers(
    status_filter: str | None = Query(default=None, alias="status", pattern=r"^(PENDING_SETTLEMENT|SETTLED|RETURNED|FAILED)$"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(InterbankTransfer).order_by(InterbankTransfer.created_at.desc()).limit(limit).offset(offset)
    if status_filter:
        stmt = stmt.where(InterbankTransfer.status == status_filter)
    if current_user.role not in ("STAFF", "ADMIN"):
        own_ids = [a.id for a in current_user.customer.accounts] if current_user.customer else []
        stmt = stmt.where(
            or_(
                InterbankTransfer.source_user_id == current_user.id,
                InterbankTransfer.beneficiary_account_id.in_(own_ids),
            )
        )
    return list(db.scalars(stmt))


@router.post(
    "/interbank/neft/settle-batch",
    response_model=NeftBatchResponse,
    summary="Run one NEFT settlement batch (staff); in production this fires half-hourly",
)
def settle_neft_batch(current_user: User = Depends(require_staff), db: Session = Depends(get_db)):
    return InterbankService.run_neft_batch(db, actor_user_id=current_user.id)
