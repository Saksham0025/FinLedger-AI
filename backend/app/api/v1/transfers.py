"""Transfer API Endpoints for FinLedger-AI."""

import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.transfer import TransferRequest
from app.models.account import Account
from app.schemas.transfer import TransferCreateRequest, TransferResponse
from app.services.transfer_service import (
    TransferService,
    IdempotencyConflictError,
    TransferBusinessError,
    InsufficientFundsError,
    TransferOwnershipError,
    AccountEligibilityError,
)
from app.schemas.transfer import TransferPreviewRequest, TransferPreviewResponse
from app.services.payee_guard_service import PayeeGuardService, PayeeGuardError

router = APIRouter(prefix="/transfers", tags=["Financial Transfers"])


@router.post(
    "/preview",
    response_model=TransferPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview and verify recipient details before transfer confirmation (PayeeGuard)",
)
def preview_transfer(
    data: TransferPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authoritative pre-transfer beneficiary verification without moving funds."""
    is_staff = current_user.role in ("STAFF", "ADMIN")
    try:
        return PayeeGuardService.preview_transfer(
            db=db,
            caller_user_id=current_user.id,
            source_account_id=data.source_account_id,
            destination_account_id=data.destination_account_id,
            amount=data.amount,
            is_staff=is_staff,
        )
    except PayeeGuardError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.post(
    "",
    response_model=TransferResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute an atomic financial transfer",
)
def create_transfer(
    data: TransferCreateRequest,
    request: Request,
    response: Response,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=1,
        max_length=64,
        description="Unique UUIDv4 idempotency key per client operation",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Execute an atomic transfer between two accounts with canonical locking and idempotency."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    is_staff = current_user.role in ("STAFF", "ADMIN")

    try:
        transfer_req, is_replay = TransferService.execute_transfer(
            db=db,
            caller_user_id=current_user.id,
            idempotency_key=idempotency_key,
            source_account_id=data.source_account_id,
            destination_account_id=data.destination_account_id,
            amount=data.amount,
            currency=data.currency,
            memo=data.memo,
            is_staff_override=is_staff,
            client_ip=client_ip,
            user_agent=user_agent,
        )

        if is_replay:
            response.status_code = status.HTTP_200_OK

        return transfer_req

    except IdempotencyConflictError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(err),
        )
    except InsufficientFundsError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except TransferOwnershipError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(err),
        )
    except AccountEligibilityError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except TransferBusinessError as err:
        raise HTTPException(
            status_code=err.status_code,
            detail=err.message,
        )


@router.get(
    "/{transfer_id}",
    response_model=TransferResponse,
    summary="Get transfer receipt and status by ID",
)
def get_transfer(
    transfer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details for a specific transfer by UUID."""
    stmt = select(TransferRequest).where(TransferRequest.id == transfer_id)
    transfer = db.scalars(stmt).first()

    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer record not found",
        )

    # Authorization guard: customers can only view transfers they initiated or received
    if current_user.role not in ("STAFF", "ADMIN"):
        is_initiator = transfer.source_user_id == current_user.id
        user_account_ids = set()
        if current_user.customer:
            user_account_ids = {
                acc.id
                for acc in db.scalars(
                    select(Account).where(Account.customer_id == current_user.customer.id)
                ).all()
            }
        is_involved = (
            transfer.source_account_id in user_account_ids
            or transfer.destination_account_id in user_account_ids
        )

        if not (is_initiator or is_involved):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot inspect another user's transfer record",
            )

    return transfer
