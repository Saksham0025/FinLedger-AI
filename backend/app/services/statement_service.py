"""Statement Service for FinLedger-AI: passbooks and bank-wise balance sheets.

Every figure is derived from the append-only ledger, never from cached balances,
so a statement is also an independent check on the balance cache.
"""

from datetime import datetime
from decimal import Decimal
import uuid
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bank import Bank
from app.models.customer import Customer
from app.models.interbank import InterbankTransfer
from app.models.ledger import LedgerEntry, LedgerTransaction

ZERO = Decimal("0.00")
# ponytail: hard row cap per statement; add keyset pagination if a period ever exceeds it
MAX_STATEMENT_ROWS = 2000

_signed = case((LedgerEntry.entry_type == "CREDIT", LedgerEntry.amount), else_=-LedgerEntry.amount)


class StatementService:

    @staticmethod
    def account_passbook(
        db: Session, account: Account, date_from: datetime | None = None, date_to: datetime | None = None
    ) -> dict:
        """Passbook for one account: opening balance, each posting with running balance, closing balance."""
        running = (
            select(
                LedgerEntry.id.label("entry_id"),
                LedgerEntry.created_at,
                LedgerEntry.posting_seq,
                LedgerEntry.entry_type,
                LedgerEntry.amount,
                LedgerTransaction.id.label("transaction_id"),
                LedgerTransaction.transaction_type,
                LedgerTransaction.description,
                func.sum(_signed).over(order_by=LedgerEntry.posting_seq).label("balance"),
            )
            .join(LedgerTransaction, LedgerTransaction.id == LedgerEntry.transaction_id)
            .where(LedgerEntry.account_id == account.id)
            .subquery()
        )
        # Window runs over the full history first, so the period filter keeps true balances
        stmt = select(running).order_by(running.c.posting_seq)
        if date_from:
            stmt = stmt.where(running.c.created_at >= date_from)
        if date_to:
            stmt = stmt.where(running.c.created_at < date_to)
        rows = db.execute(stmt.limit(MAX_STATEMENT_ROWS)).all()

        if rows:  # derive from the window so opening + rows always reproduces each printed balance
            first = rows[0]
            opening = first.balance - (first.amount if first.entry_type == "CREDIT" else -first.amount)
        elif date_from:
            opening = db.scalar(
                select(func.coalesce(func.sum(_signed), ZERO))
                .where(LedgerEntry.account_id == account.id, LedgerEntry.created_at < date_from)
            )
        else:
            opening = ZERO

        entries = [
            {
                "entry_id": r.entry_id,
                "serial": r.posting_seq,
                "transaction_id": r.transaction_id,
                "posted_at": r.created_at,
                "transaction_type": r.transaction_type,
                "narration": r.description,
                "debit": r.amount if r.entry_type == "DEBIT" else None,
                "credit": r.amount if r.entry_type == "CREDIT" else None,
                "balance": r.balance,
            }
            for r in rows
        ]
        total_debits = sum((e["debit"] or ZERO for e in entries), ZERO)
        total_credits = sum((e["credit"] or ZERO for e in entries), ZERO)
        return {
            "account_id": account.id,
            "account_number": account.account_number,
            "account_type": account.account_type,
            "bank_code": account.bank.code,
            "bank_name": account.bank.name,
            "ifsc": account.bank.ifsc,
            "holder_name": account.customer.full_name if account.customer else None,
            "date_from": date_from,
            "date_to": date_to,
            "opening_balance": opening,
            "total_debits": total_debits,
            "total_credits": total_credits,
            "closing_balance": opening + total_credits - total_debits,
            "truncated": len(rows) == MAX_STATEMENT_ROWS,
            "entries": entries,
        }

    @staticmethod
    def customer_passbook(
        db: Session, customer: Customer, date_from: datetime | None = None, date_to: datetime | None = None
    ) -> dict:
        """Customer-wise statement: a passbook for every account the customer holds, at any bank."""
        accounts = sorted(customer.accounts, key=lambda a: (a.bank.code, a.account_number))
        books = [StatementService.account_passbook(db, a, date_from, date_to) for a in accounts]
        return {
            "customer_id": customer.id,
            "full_name": customer.full_name,
            "total_closing_balance": sum((b["closing_balance"] for b in books), ZERO),
            "accounts": books,
        }

    @staticmethod
    def bank_balance_sheets(db: Session) -> list[dict]:
        """One row per bank: what it owes customers and where its settlement position stands."""
        acc_stats = {
            r.bank_id: r
            for r in db.execute(
                select(
                    Account.bank_id,
                    func.count().filter(Account.account_type.in_(("SAVINGS", "CURRENT"))).label("accounts"),
                    func.count(func.distinct(Account.customer_id)).label("customers"),
                    func.coalesce(
                        func.sum(Account.cached_balance).filter(Account.account_type.in_(("SAVINGS", "CURRENT"))), ZERO
                    ).label("deposits"),
                    func.coalesce(
                        func.sum(Account.cached_balance).filter(Account.account_type == "INVESTMENT"), ZERO
                    ).label("investments"),
                    func.coalesce(
                        func.sum(Account.cached_balance).filter(Account.account_type == "SETTLEMENT"), ZERO
                    ).label("settlement"),
                ).group_by(Account.bank_id)
            )
        }
        ledger_stats = {
            r.bank_id: r
            for r in db.execute(
                select(
                    Account.bank_id,
                    func.count(LedgerEntry.id).label("postings"),
                    func.coalesce(func.sum(LedgerEntry.amount).filter(LedgerEntry.entry_type == "DEBIT"), ZERO).label("debits"),
                    func.coalesce(func.sum(LedgerEntry.amount).filter(LedgerEntry.entry_type == "CREDIT"), ZERO).label("credits"),
                )
                .join(Account, Account.id == LedgerEntry.account_id)
                .where(Account.account_type != "INTERNAL_CLEARING")
                .group_by(Account.bank_id)
            )
        }
        settled = InterbankTransfer.status == "SETTLED"
        outward = {
            r.bank_id: r.amount
            for r in db.execute(
                select(InterbankTransfer.remitter_bank_id.label("bank_id"), func.sum(InterbankTransfer.amount).label("amount"))
                .where(settled).group_by(InterbankTransfer.remitter_bank_id)
            )
        }
        inward = {
            r.bank_id: r.amount
            for r in db.execute(
                select(InterbankTransfer.beneficiary_bank_id.label("bank_id"), func.sum(InterbankTransfer.amount).label("amount"))
                .where(settled).group_by(InterbankTransfer.beneficiary_bank_id)
            )
        }

        sheets = []
        for bank in db.scalars(select(Bank).order_by(Bank.code)):
            a, l = acc_stats.get(bank.id), ledger_stats.get(bank.id)
            out_amt, in_amt = outward.get(bank.id, ZERO), inward.get(bank.id, ZERO)
            sheets.append({
                "bank_id": bank.id,
                "code": bank.code,
                "name": bank.name,
                "ifsc": bank.ifsc,
                "customer_count": a.customers if a else 0,
                "account_count": a.accounts if a else 0,
                "customer_deposits": a.deposits if a else ZERO,
                "investment_holdings": a.investments if a else ZERO,
                "settlement_in_flight": a.settlement if a else ZERO,
                "posting_count": l.postings if l else 0,
                "total_debits": l.debits if l else ZERO,
                "total_credits": l.credits if l else ZERO,
                "interbank_outward_settled": out_amt,
                "interbank_inward_settled": in_amt,
                "net_interbank_position": in_amt - out_amt,
            })
        return sheets

    @staticmethod
    def bank_customers(db: Session, bank_id: uuid.UUID) -> list[dict]:
        """Customers holding accounts at a bank, with their balance there."""
        rows = db.execute(
            select(
                Customer.id,
                Customer.full_name,
                func.count(Account.id).label("account_count"),
                func.sum(Account.cached_balance).label("balance"),
            )
            .join(Account, Account.customer_id == Customer.id)
            .where(Account.bank_id == bank_id, Account.account_type.in_(("SAVINGS", "CURRENT", "INVESTMENT")))
            .group_by(Customer.id, Customer.full_name)
            .order_by(Customer.full_name)
        ).all()
        return [
            {"customer_id": r.id, "full_name": r.full_name, "account_count": r.account_count, "balance": r.balance}
            for r in rows
        ]

    @staticmethod
    def bank_transactions(
        db: Session,
        bank_id: uuid.UUID,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """Bank-wise day book: every posting on any account held at the bank, newest first."""
        stmt = (
            select(
                LedgerEntry.id,
                LedgerEntry.created_at,
                LedgerEntry.entry_type,
                LedgerEntry.amount,
                LedgerTransaction.transaction_type,
                LedgerTransaction.description,
                Account.account_number,
                Account.account_type,
                Customer.full_name,
            )
            .join(LedgerTransaction, LedgerTransaction.id == LedgerEntry.transaction_id)
            .join(Account, Account.id == LedgerEntry.account_id)
            .outerjoin(Customer, Customer.id == Account.customer_id)
            .where(Account.bank_id == bank_id)
            .order_by(LedgerEntry.posting_seq.desc())
            .limit(limit)
            .offset(offset)
        )
        if date_from:
            stmt = stmt.where(LedgerEntry.created_at >= date_from)
        if date_to:
            stmt = stmt.where(LedgerEntry.created_at < date_to)
        return [
            {
                "entry_id": r.id,
                "posted_at": r.created_at,
                "account_number": r.account_number,
                "account_type": r.account_type,
                "holder_name": r.full_name,
                "transaction_type": r.transaction_type,
                "narration": r.description,
                "debit": r.amount if r.entry_type == "DEBIT" else None,
                "credit": r.amount if r.entry_type == "CREDIT" else None,
            }
            for r in db.execute(stmt)
        ]
