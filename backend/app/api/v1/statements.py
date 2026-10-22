"""Passbook and bank-wise balance sheet endpoints."""

from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_staff
from app.models.bank import Bank
from app.models.customer import Customer
from app.models.user import User
from app.schemas.interbank import (
    AccountPassbook,
    BankBalanceSheet,
    BankCustomerRow,
    BankDayBookEntry,
    CustomerPassbook,
)
from app.services.account_service import AccountService
from app.services.statement_service import StatementService

router = APIRouter(prefix="/statements", tags=["Statements & Passbooks"])


@router.get("/accounts/{account_id}/passbook", response_model=AccountPassbook, summary="Passbook for one account")
def account_passbook(
    account_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = AccountService.get_account_by_id(db, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if current_user.role not in ("STAFF", "ADMIN"):
        if not current_user.customer or account.customer_id != current_user.customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this account")
    return StatementService.account_passbook(db, account, date_from, date_to)


@router.get(
    "/customer",
    response_model=CustomerPassbook,
    summary="Customer-wise statement across all banks (customers: own; staff: pass customer_id)",
)
def customer_passbook(
    customer_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role in ("STAFF", "ADMIN"):
        if customer_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="customer_id is required")
        customer = db.get(Customer, customer_id)
    else:
        customer = current_user.customer
        if customer_id is not None and (customer is None or customer.id != customer_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: not your customer profile")
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return StatementService.customer_passbook(db, customer, date_from, date_to)


@router.get("/banks", response_model=list[BankBalanceSheet], summary="Balance sheet summary for every bank (staff)")
def bank_balance_sheets(_: User = Depends(require_staff), db: Session = Depends(get_db)):
    return StatementService.bank_balance_sheets(db)


def _bank_or_404(db: Session, bank_id: uuid.UUID) -> Bank:
    bank = db.get(Bank, bank_id)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank not found")
    return bank


@router.get("/banks/{bank_id}/customers", response_model=list[BankCustomerRow], summary="Customers of a bank (staff)")
def bank_customers(bank_id: uuid.UUID, _: User = Depends(require_staff), db: Session = Depends(get_db)):
    _bank_or_404(db, bank_id)
    return StatementService.bank_customers(db, bank_id)


@router.get(
    "/banks/{bank_id}/transactions",
    response_model=list[BankDayBookEntry],
    summary="Bank-wise day book: every posting at the bank (staff)",
)
def bank_transactions(
    bank_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    _bank_or_404(db, bank_id)
    return StatementService.bank_transactions(db, bank_id, date_from, date_to, limit, offset)
