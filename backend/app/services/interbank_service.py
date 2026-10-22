"""Inter-bank Payment Service for FinLedger-AI (NEFT / RTGS / IMPS).

Models how money actually moves between Indian banks. Every bank holds a
SETTLEMENT account (its current account with the central bank). A payment is
three balanced postings, each committed atomically:

  1. INTERBANK_OUTWARD   remitter bank:   DEBIT remitter customer, CREDIT remitter settlement
  2. INTERBANK_SETTLEMENT central bank:   DEBIT remitter settlement, CREDIT beneficiary settlement
                          beneficiary bank: DEBIT beneficiary settlement, CREDIT beneficiary customer
     or INTERBANK_RETURN  when the beneficiary bank cannot credit (no such account, frozen, closed):
                          DEBIT remitter settlement, CREDIT remitter customer

Rails differ only in when step 2 runs:
  - IMPS and RTGS settle gross, in real time, immediately after step 1.
  - NEFT waits for the next deferred-net-settlement batch (run_neft_batch).

A remitter settlement balance is therefore exactly the value of outward payments in flight.
"""

from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import logging
import secrets
import string
import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.account import Account
from app.models.bank import Bank
from app.models.interbank import InterbankTransfer
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.ledger_service import LedgerService
from app.services.transfer_service import (
    AccountEligibilityError,
    IdempotencyConflictError,
    InsufficientFundsError,
    TransferBusinessError,
    TransferOwnershipError,
    lock_accounts_canonically,
)

logger = logging.getLogger("finledger.interbank")

# Per-transaction rail limits (min, max). RTGS is for large values (min ₹2 lakh);
# IMPS caps at ₹5 lakh. NEFT has no RBI-mandated limit; banks set their own.
RAIL_LIMITS: dict[str, tuple[Decimal, Decimal | None]] = {
    "NEFT": (Decimal("1.00"), None),
    "RTGS": (Decimal("200000.00"), None),
    "IMPS": (Decimal("1.00"), Decimal("500000.00")),
}
REAL_TIME_RAILS = ("RTGS", "IMPS")
CREDITABLE_TYPES = ("SAVINGS", "CURRENT")
_UTR_ALPHABET = string.ascii_uppercase + string.digits


def generate_utr(bank_code: str, rail: str) -> str:
    """16-char Unique Transaction Reference: bank code, rail letter, YYMMDD, 5 random chars."""
    # ponytail: 36^5 random suffix per bank/rail/day; uq constraint backstops a collision
    suffix = "".join(secrets.choice(_UTR_ALPHABET) for _ in range(5))
    return f"{bank_code}{rail[0]}{datetime.now(timezone.utc):%y%m%d}{suffix}"


def compute_interbank_hash(
    source_account_id: uuid.UUID, beneficiary_ifsc: str, beneficiary_account_number: str, amount: Decimal, rail: str
) -> str:
    canonical = f"{source_account_id}:{beneficiary_ifsc}:{beneficiary_account_number}:{amount:.2f}:{rail}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def mask_name(full_name: str) -> str:
    """'Rahul Sharma' -> 'R***l S****a': enough to confirm a payee, not to harvest names."""
    return " ".join(w[0] + "*" * max(len(w) - 2, 1) + (w[-1] if len(w) > 1 else "") for w in full_name.split())


def _settlement_account(db: Session, bank_id: uuid.UUID) -> Account:
    acc = db.scalars(
        select(Account).where(Account.bank_id == bank_id, Account.account_type == "SETTLEMENT")
    ).first()
    if acc is None:
        raise RuntimeError("Bank settlement account not initialized; run scripts/init_db.py --seed-only")
    return acc


def _resolve_beneficiary(db: Session, bank_id: uuid.UUID, account_number: str) -> tuple[Account | None, str | None]:
    """What the beneficiary bank does on receipt: find a creditable account or give a return reason."""
    acc = db.scalars(
        select(Account).where(Account.bank_id == bank_id, Account.account_number == account_number)
    ).first()
    if acc is None or acc.account_type not in CREDITABLE_TYPES:
        return None, "Beneficiary account does not exist at the beneficiary bank"
    if acc.status != "ACTIVE":
        return None, f"Beneficiary account is {acc.status}"
    return acc, None


class InterbankService:
    """Initiation, settlement and return of payments to other banks."""

    @staticmethod
    def lookup_beneficiary(db: Session, ifsc: str, account_number: str) -> dict:
        """Beneficiary name lookup before payment (masked), as banks offer for NEFT/RTGS."""
        bank = db.scalars(select(Bank).where(Bank.ifsc == ifsc)).first()
        if bank is None:
            raise TransferBusinessError("Unknown IFSC", status_code=404)
        acc, reason = _resolve_beneficiary(db, bank.id, account_number)
        return {
            "bank_name": bank.name,
            "ifsc": bank.ifsc,
            "account_found": acc is not None,
            "masked_name": mask_name(acc.customer.full_name) if acc and acc.customer else None,
            "reason": reason,
        }

    @staticmethod
    def initiate(
        db: Session,
        caller_user_id: uuid.UUID,
        idempotency_key: str,
        source_account_id: uuid.UUID,
        beneficiary_ifsc: str,
        beneficiary_account_number: str,
        beneficiary_name: str,
        amount: Decimal,
        rail: str,
        memo: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[InterbankTransfer, bool]:
        """Debit the remitter into its bank's settlement account; settle at once on real-time rails.

        Returns (transfer, is_replay).
        """
        request_hash = compute_interbank_hash(
            source_account_id, beneficiary_ifsc, beneficiary_account_number, amount, rail
        )
        replay = InterbankService._find_replay(db, caller_user_id, idempotency_key, request_hash)
        if replay:
            return replay, True

        source = db.get(Account, source_account_id)
        remitter_bank_id = source.bank_id if source else None
        try:
            try:
                if source is None:
                    raise AccountEligibilityError("Source account not found")
                low, high = RAIL_LIMITS[rail]
                if amount < low:
                    raise TransferBusinessError(f"{rail} minimum per transaction is {low:,.2f} INR")
                if high is not None and amount > high:
                    raise TransferBusinessError(f"{rail} maximum per transaction is {high:,.2f} INR")

                ben_bank = db.scalars(select(Bank).where(Bank.ifsc == beneficiary_ifsc)).first()
                if ben_bank is None:
                    raise TransferBusinessError(f"Unknown IFSC {beneficiary_ifsc}")

                if ben_bank.id == source.bank_id:
                    raise TransferBusinessError(
                        "Beneficiary is at your own bank; use an internal transfer instead"
                    )
                settle_acc = _settlement_account(db, source.bank_id)

                locked = lock_accounts_canonically(db, source_account_id, settle_acc.id)
                replay = InterbankService._find_replay(db, caller_user_id, idempotency_key, request_hash)
                if replay:
                    return replay, True
                source, settle_acc = locked[source_account_id], locked[settle_acc.id]

                if not source.customer or source.customer.user_id != caller_user_id:
                    raise TransferOwnershipError(
                        "Unauthorized: Source account does not belong to the authenticated user"
                    )
                if source.status != "ACTIVE":
                    raise AccountEligibilityError(f"Source account is {source.status}, transfers not permitted")
                if source.account_type not in CREDITABLE_TYPES:
                    raise AccountEligibilityError("Inter-bank payments can only be made from savings or current accounts")
                if source.cached_balance < amount:
                    raise InsufficientFundsError(
                        f"Insufficient funds: available balance is {source.cached_balance:.2f} INR, "
                        f"transfer amount is {amount:.2f} INR"
                    )
            except TransferBusinessError as err:
                InterbankService._persist_failure_and_audit(
                    db, caller_user_id, idempotency_key, request_hash, source_account_id, remitter_bank_id,
                    beneficiary_ifsc, beneficiary_account_number, beneficiary_name, amount, rail, memo,
                    err.message, client_ip, user_agent,
                )
                raise

            utr = generate_utr(source.bank_code, rail)
            narration = f"{rail}/{utr}/{beneficiary_name}/{beneficiary_ifsc}"
            outward = LedgerService.post_balanced_transaction(
                db=db,
                transaction_type="INTERBANK_OUTWARD",
                description=(f"{narration}/{memo}" if memo else narration)[:255],
                legs=[
                    {"account_id": source.id, "entry_type": "DEBIT", "amount": amount},
                    {"account_id": settle_acc.id, "entry_type": "CREDIT", "amount": amount},
                ],
            )
            source.cached_balance -= amount
            source.version += 1
            settle_acc.cached_balance += amount
            settle_acc.version += 1

            transfer = InterbankTransfer(
                utr=utr,
                rail=rail,
                status="PENDING_SETTLEMENT",
                idempotency_key=idempotency_key,
                source_user_id=caller_user_id,
                request_hash=request_hash,
                remitter_account_id=source.id,
                remitter_bank_id=source.bank_id,
                beneficiary_bank_id=ben_bank.id,
                beneficiary_ifsc=beneficiary_ifsc,
                beneficiary_account_number=beneficiary_account_number,
                beneficiary_name=beneficiary_name,
                amount=amount,
                memo=memo,
                outward_txn_id=outward.id,
            )
            db.add(transfer)
            db.commit()

        except IntegrityError as exc:
            db.rollback()
            if "uq_interbank_user_idempotency" in str(getattr(exc, "orig", exc)):
                with Session(db.get_bind(), expire_on_commit=False) as check_db:
                    winner = InterbankService._find_replay(check_db, caller_user_id, idempotency_key, request_hash)
                    if winner:
                        return winner, True
            raise

        AuditService.log_event(
            action="INTERBANK_INITIATED",
            entity_type="INTERBANK_TRANSFER",
            entity_id=str(transfer.id),
            actor_user_id=caller_user_id,
            ip_address=client_ip,
            user_agent=user_agent,
            metadata={"utr": utr, "rail": rail, "amount": str(amount), "beneficiary_ifsc": beneficiary_ifsc},
            db=db,
            independent_txn=True,
        )

        if rail in REAL_TIME_RAILS:
            InterbankService.settle(db, transfer.id)
        db.refresh(transfer)
        return transfer, False

    @staticmethod
    def settle(db: Session, transfer_id: uuid.UUID, batch_id: str | None = None) -> InterbankTransfer | None:
        """Settle one pending payment: credit the beneficiary, or return the funds to the remitter.

        Locks the instruction row first, so concurrent batch runs cannot settle it twice;
        returns None if another run already did.
        """
        transfer = db.scalars(
            select(InterbankTransfer)
            .where(InterbankTransfer.id == transfer_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).first()
        if transfer is None or transfer.status != "PENDING_SETTLEMENT":
            db.commit()  # nothing pending; just release the row lock
            return None

        remitter_settle = _settlement_account(db, transfer.remitter_bank_id)
        beneficiary_settle = _settlement_account(db, transfer.beneficiary_bank_id)
        beneficiary, return_reason = _resolve_beneficiary(
            db, transfer.beneficiary_bank_id, transfer.beneficiary_account_number
        )
        # Lock everything either outcome may touch, in one canonical pass
        lock_ids = [remitter_settle.id, beneficiary_settle.id, transfer.remitter_account_id]
        if beneficiary is not None:
            lock_ids.append(beneficiary.id)
        locked = lock_accounts_canonically(db, *lock_ids)
        remitter_settle, beneficiary_settle = locked[remitter_settle.id], locked[beneficiary_settle.id]

        # Re-check under lock: the account may have been frozen while we waited
        if beneficiary is not None and beneficiary.status != "ACTIVE":
            beneficiary, return_reason = None, f"Beneficiary account is {beneficiary.status}"

        amount = transfer.amount
        if beneficiary is not None:
            txn = LedgerService.post_balanced_transaction(
                db=db,
                transaction_type="INTERBANK_SETTLEMENT",
                description=f"{transfer.rail}/{transfer.utr}/from {transfer.remitter_bank.ifsc}"[:255],
                legs=[
                    {"account_id": remitter_settle.id, "entry_type": "DEBIT", "amount": amount},
                    {"account_id": beneficiary_settle.id, "entry_type": "CREDIT", "amount": amount},
                    {"account_id": beneficiary_settle.id, "entry_type": "DEBIT", "amount": amount},
                    {"account_id": beneficiary.id, "entry_type": "CREDIT", "amount": amount},
                ],
            )
            remitter_settle.cached_balance -= amount
            remitter_settle.version += 1
            beneficiary_settle.version += 1  # credited and debited by the same amount
            beneficiary.cached_balance += amount
            beneficiary.version += 1
            transfer.status = "SETTLED"
            transfer.beneficiary_account_id = beneficiary.id
        else:
            remitter = locked[transfer.remitter_account_id]
            txn = LedgerService.post_balanced_transaction(
                db=db,
                transaction_type="INTERBANK_RETURN",
                description=f"{transfer.rail} RETURN/{transfer.utr}/{return_reason}"[:255],
                legs=[
                    {"account_id": remitter_settle.id, "entry_type": "DEBIT", "amount": amount},
                    {"account_id": remitter.id, "entry_type": "CREDIT", "amount": amount},
                ],
            )
            remitter_settle.cached_balance -= amount
            remitter_settle.version += 1
            remitter.cached_balance += amount
            remitter.version += 1
            transfer.status = "RETURNED"
            transfer.failure_reason = return_reason

        transfer.settlement_txn_id = txn.id
        transfer.settled_at = func.now()
        transfer.batch_id = batch_id
        db.commit()
        db.refresh(transfer)

        AuditService.log_event(
            action=f"INTERBANK_{transfer.status}",
            entity_type="INTERBANK_TRANSFER",
            entity_id=str(transfer.id),
            actor_user_id=None,
            metadata={"utr": transfer.utr, "rail": transfer.rail, "amount": str(amount),
                      "batch_id": batch_id, "reason": transfer.failure_reason},
            db=db,
            independent_txn=True,
        )
        return transfer

    @staticmethod
    def run_neft_batch(db: Session, actor_user_id: uuid.UUID | None = None) -> dict:
        """Run one NEFT settlement batch over every pending NEFT payment, oldest first."""
        batch_id = f"NEFT-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"
        pending = list(db.scalars(
            select(InterbankTransfer.id)
            .where(InterbankTransfer.status == "PENDING_SETTLEMENT", InterbankTransfer.rail == "NEFT")
            .order_by(InterbankTransfer.created_at)
        ))
        # ponytail: each item settles gross in its own txn; real NEFT nets per bank pair first
        settled = returned = 0
        settled_amount = returned_amount = Decimal("0.00")
        for transfer_id in pending:
            t = InterbankService.settle(db, transfer_id, batch_id=batch_id)
            if t is None:
                continue
            if t.status == "SETTLED":
                settled += 1
                settled_amount += t.amount
            else:
                returned += 1
                returned_amount += t.amount

        summary = {
            "batch_id": batch_id,
            "processed": settled + returned,
            "settled_count": settled,
            "settled_amount": settled_amount,
            "returned_count": returned,
            "returned_amount": returned_amount,
        }
        AuditService.log_event(
            action="NEFT_BATCH_SETTLED",
            entity_type="NEFT_BATCH",
            entity_id=batch_id,
            actor_user_id=actor_user_id,
            metadata={k: str(v) for k, v in summary.items()},
            db=db,
            independent_txn=True,
        )
        return summary

    @staticmethod
    def _find_replay(
        db: Session, caller_user_id: uuid.UUID, idempotency_key: str, request_hash: str
    ) -> InterbankTransfer | None:
        existing = db.scalars(
            select(InterbankTransfer).where(
                InterbankTransfer.source_user_id == caller_user_id,
                InterbankTransfer.idempotency_key == idempotency_key,
            )
        ).first()
        if existing is None:
            return None
        if existing.request_hash != request_hash:
            raise IdempotencyConflictError(
                "Idempotency key reuse conflict: request parameters differ from original submission"
            )
        if existing.status == "FAILED":
            raise TransferBusinessError(existing.failure_reason or "Previous attempt with this key failed")
        return existing

    @staticmethod
    def _persist_failure_and_audit(
        db: Session,
        caller_user_id: uuid.UUID,
        idempotency_key: str,
        request_hash: str,
        source_account_id: uuid.UUID,
        remitter_bank_id: uuid.UUID | None,
        beneficiary_ifsc: str,
        beneficiary_account_number: str,
        beneficiary_name: str,
        amount: Decimal,
        rail: str,
        memo: str | None,
        failure_reason: str,
        client_ip: str | None,
        user_agent: str | None,
    ) -> None:
        """Roll back the financial txn; record the FAILED instruction and audit in an independent txn."""
        db.rollback()
        with Session(db.get_bind()) as audit_db:
            record_id = None
            # Only reference rows that exist outside the rolled-back transaction
            actor_id = caller_user_id if audit_db.get(User, caller_user_id) else None
            if actor_id and remitter_bank_id and audit_db.get(Account, source_account_id):
                try:
                    failed = InterbankTransfer(
                        utr=generate_utr(audit_db.get(Bank, remitter_bank_id).code, rail),
                        rail=rail,
                        status="FAILED",
                        idempotency_key=idempotency_key,
                        source_user_id=caller_user_id,
                        request_hash=request_hash,
                        remitter_account_id=source_account_id,
                        remitter_bank_id=remitter_bank_id,
                        beneficiary_bank_id=audit_db.scalars(
                            select(Bank.id).where(Bank.ifsc == beneficiary_ifsc)
                        ).first(),
                        beneficiary_ifsc=beneficiary_ifsc,
                        beneficiary_account_number=beneficiary_account_number,
                        beneficiary_name=beneficiary_name,
                        amount=amount,
                        memo=memo,
                        failure_reason=failure_reason,
                    )
                    audit_db.add(failed)
                    audit_db.commit()
                    record_id = failed.id
                except Exception:
                    logger.exception("Could not persist FAILED inter-bank instruction")
                    audit_db.rollback()

            AuditService.log_event(
                action="INTERBANK_FAILED",
                entity_type="INTERBANK_TRANSFER",
                entity_id=str(record_id or idempotency_key),
                actor_user_id=actor_id,
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={
                    "idempotency_key": idempotency_key,
                    "source_account_id": str(source_account_id),
                    "beneficiary_ifsc": beneficiary_ifsc,
                    "amount": str(amount),
                    "rail": rail,
                    "reason": failure_reason,
                },
                db=audit_db,
                independent_txn=False,
            )
            audit_db.commit()
