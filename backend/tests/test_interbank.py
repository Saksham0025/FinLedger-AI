"""Multi-bank, inter-bank payment (NEFT/RTGS/IMPS) and passbook tests on real PostgreSQL."""

from decimal import Decimal
import threading
import uuid
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Account, AuditLog, Bank, Customer, InterbankTransfer, LedgerTransaction, User
from app.services.account_service import AccountService
from app.services.interbank_service import InterbankService, mask_name
from app.services.ledger_service import LedgerService
from app.services.statement_service import StatementService
from app.services.transfer_service import AccountEligibilityError, InsufficientFundsError, TransferService


def _bank(db, code) -> Bank:
    return db.scalars(select(Bank).where(Bank.code == code)).one()


def _settlement(db, code) -> Account:
    return db.scalars(
        select(Account).where(Account.bank_id == _bank(db, code).id, Account.account_type == "SETTLEMENT")
    ).one()


def _customer(db, name="Interbank Customer") -> User:
    tag = uuid.uuid4().hex[:8]
    user = User(username=f"ib_{tag}", email=f"ib_{tag}@example.com", password_hash="x", role="CUSTOMER", is_active=True)
    db.add(user)
    db.flush()
    db.add(Customer(user_id=user.id, full_name=name, kyc_status="VERIFIED"))
    db.flush()
    db.refresh(user)
    return user


def _account(db, user, bank_code, funds="0.00", status="ACTIVE") -> Account:
    acc = AccountService.provision_customer_account(db, user.customer.id, "SAVINGS", bank_id=_bank(db, bank_code).id)
    db.commit()
    if Decimal(funds) > 0:
        AccountService.deposit_opening_funds(db, acc.id, Decimal(funds))
    if status != "ACTIVE":
        acc.status = status
        db.commit()
    return acc


def _pay(client, headers, src, ben, amount, rail="IMPS", ifsc=None, number=None, key=None):
    return client.post(
        "/api/v1/interbank/transfers",
        json={
            "source_account_id": str(src.id),
            "rail": rail,
            "beneficiary_ifsc": ifsc or ben.bank.ifsc,
            "beneficiary_account_number": number or ben.account_number,
            "beneficiary_name": "Beneficiary Person",
            "amount": str(amount),
        },
        headers={**headers, "Idempotency-Key": key or str(uuid.uuid4())},
    )


@pytest.fixture
def parties(db_session, test_customer_user, auth_headers_factory):
    """Remitter at FLAI with ₹10,00,000; beneficiary (another customer) at IVBK with ₹0."""
    remitter = _account(db_session, test_customer_user, "FLAI", "1000000.00")
    other = _customer(db_session, "Rahul Sharma")
    beneficiary = _account(db_session, other, "IVBK")
    return remitter, beneficiary, auth_headers_factory(test_customer_user), other


# ---------- Real-time rails ----------

def test_imps_settles_immediately_and_conserves_money(client, db_session, parties):
    remitter, beneficiary, headers, _ = parties
    flai_set, ivbk_set = _settlement(db_session, "FLAI"), _settlement(db_session, "IVBK")
    before = (flai_set.cached_balance, ivbk_set.cached_balance)

    resp = _pay(client, headers, remitter, beneficiary, "2500.50")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "SETTLED"
    assert len(body["utr"]) == 16 and body["utr"].startswith("FLAII")

    db_session.expire_all()
    assert remitter.cached_balance == Decimal("997499.50")
    assert beneficiary.cached_balance == Decimal("2500.50")
    # Settlement accounts net to zero once a payment settles
    assert (flai_set.cached_balance, ivbk_set.cached_balance) == before

    t = db_session.get(InterbankTransfer, uuid.UUID(body["id"]))
    types = {db_session.get(LedgerTransaction, i).transaction_type for i in (t.outward_txn_id, t.settlement_txn_id)}
    assert types == {"INTERBANK_OUTWARD", "INTERBANK_SETTLEMENT"}
    assert LedgerService.reconcile_all_accounts(db_session).is_balanced


# Failure paths roll back the request's transaction, which in this harness also discards the
# uncommitted fixtures; so these assert on the response, and persistence is proven with
# committed data in test_failed_payment_keeps_evidence_and_moves_no_money.

def test_rtgs_two_lakh_minimum(client, parties):
    remitter, beneficiary, headers, _ = parties
    ok = _pay(client, headers, remitter, beneficiary, "200000.00", rail="RTGS")
    assert ok.status_code == 201 and ok.json()["status"] == "SETTLED"
    resp = _pay(client, headers, remitter, beneficiary, "199999.99", rail="RTGS")
    assert resp.status_code == 400 and "RTGS minimum" in resp.json()["detail"]


def test_imps_maximum_five_lakh(client, parties):
    remitter, beneficiary, headers, _ = parties
    resp = _pay(client, headers, remitter, beneficiary, "500000.01", rail="IMPS")
    assert resp.status_code == 400 and "IMPS maximum" in resp.json()["detail"]


# ---------- NEFT deferred settlement ----------

def test_neft_waits_for_batch_then_settles(client, db_session, parties, test_staff_user, auth_headers_factory):
    remitter, beneficiary, headers, _ = parties
    flai_set = _settlement(db_session, "FLAI")
    in_flight_before = flai_set.cached_balance

    resp = _pay(client, headers, remitter, beneficiary, "750.00", rail="NEFT")
    assert resp.status_code == 201 and resp.json()["status"] == "PENDING_SETTLEMENT"
    db_session.expire_all()
    assert remitter.cached_balance == Decimal("999250.00")
    assert beneficiary.cached_balance == Decimal("0.00")
    assert flai_set.cached_balance - in_flight_before == Decimal("750.00")  # parked at remitter bank

    assert client.post("/api/v1/interbank/neft/settle-batch", headers=headers).status_code == 403
    batch = client.post("/api/v1/interbank/neft/settle-batch", headers=auth_headers_factory(test_staff_user))
    assert batch.status_code == 200 and batch.json()["settled_count"] >= 1

    db_session.expire_all()
    t = db_session.get(InterbankTransfer, uuid.UUID(resp.json()["id"]))
    assert t.status == "SETTLED" and t.batch_id == batch.json()["batch_id"]
    assert beneficiary.cached_balance == Decimal("750.00")
    assert flai_set.cached_balance == in_flight_before


@pytest.mark.parametrize("case", ["missing", "frozen"])
def test_uncreditable_beneficiary_is_returned_to_remitter(client, db_session, parties, case):
    remitter, beneficiary, headers, _ = parties
    if case == "frozen":
        beneficiary.status = "FROZEN"
        db_session.commit()
        number = beneficiary.account_number
    else:
        number = "IVBK-NO-SUCH-ACCOUNT"

    resp = _pay(client, headers, remitter, beneficiary, "1200.00", ifsc="IVBK0000101", number=number)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "RETURNED"
    assert ("FROZEN" if case == "frozen" else "does not exist") in body["failure_reason"]

    db_session.expire_all()
    assert remitter.cached_balance == Decimal("1000000.00")
    assert beneficiary.cached_balance == Decimal("0.00")
    t = db_session.get(InterbankTransfer, uuid.UUID(body["id"]))
    assert db_session.get(LedgerTransaction, t.settlement_txn_id).transaction_type == "INTERBANK_RETURN"
    assert LedgerService.reconcile_all_accounts(db_session).is_balanced


# ---------- Validation, ownership, idempotency ----------

@pytest.mark.parametrize(
    "ifsc, amount, expected",
    [
        ("FLAI0000001", "10.00", "own bank"),
        ("ZZZZ0000001", "10.00", "Unknown IFSC"),
        (None, "1000000.01", "Insufficient funds"),
    ],
)
def test_business_rejections(client, parties, ifsc, amount, expected):
    remitter, beneficiary, headers, _ = parties
    r = _pay(client, headers, remitter, beneficiary, amount, rail="NEFT", ifsc=ifsc)
    assert r.status_code == 400 and expected in r.json()["detail"]


def test_ifsc_format_validated(client, parties):
    remitter, beneficiary, headers, _ = parties
    r = _pay(client, headers, remitter, beneficiary, "10.00", ifsc="IVBK1000101")  # 5th char must be 0
    assert r.status_code == 422


def test_cannot_debit_another_customers_account(client, parties, auth_headers_factory):
    remitter, beneficiary, _, other = parties
    r = _pay(client, auth_headers_factory(other), remitter, beneficiary, "10.00")
    assert r.status_code == 403


def test_idempotent_replay_and_payload_conflict(client, db_session, parties):
    remitter, beneficiary, headers, _ = parties
    key = str(uuid.uuid4())
    first = _pay(client, headers, remitter, beneficiary, "100.00", key=key)
    replay = _pay(client, headers, remitter, beneficiary, "100.00", key=key)
    assert (first.status_code, replay.status_code) == (201, 200)
    assert first.json()["id"] == replay.json()["id"]
    db_session.expire_all()
    assert beneficiary.cached_balance == Decimal("100.00")  # charged once
    assert _pay(client, headers, remitter, beneficiary, "101.00", key=key).status_code == 409


def test_beneficiary_lookup_masks_name(client, parties):
    _, beneficiary, headers, _ = parties
    r = client.get(
        "/api/v1/interbank/beneficiary",
        params={"ifsc": "IVBK0000101", "account_number": beneficiary.account_number},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["account_found"] and r.json()["masked_name"] == "R***l S****a"
    assert mask_name("Al") == "A*l"


def test_settlement_accounts_are_not_reachable_by_customer_transfers(db_session, parties, test_customer_user):
    remitter, _, _, _ = parties
    with pytest.raises(AccountEligibilityError):
        TransferService.execute_transfer(
            db_session, test_customer_user.id, str(uuid.uuid4()),
            remitter.id, _settlement(db_session, "FLAI").id, Decimal("1.00"),
        )


def test_customer_sees_received_payments(client, parties, auth_headers_factory):
    remitter, beneficiary, headers, other = parties
    sent = _pay(client, headers, remitter, beneficiary, "42.00").json()
    received = client.get("/api/v1/interbank/transfers", headers=auth_headers_factory(other)).json()
    assert sent["id"] in {t["id"] for t in received}


# ---------- Passbooks & bank-wise balance sheets ----------

def test_account_passbook_running_balance(client, db_session, parties):
    remitter, beneficiary, headers, _ = parties
    _pay(client, headers, remitter, beneficiary, "300.00")
    _pay(client, headers, remitter, beneficiary, "200.00", rail="NEFT")

    r = client.get(f"/api/v1/statements/accounts/{remitter.id}/passbook", headers=headers)
    assert r.status_code == 200
    book = r.json()
    balances = [Decimal(e["balance"]) for e in book["entries"]]
    assert [e["serial"] for e in book["entries"]] == sorted(e["serial"] for e in book["entries"])
    assert balances == [Decimal("1000000.00"), Decimal("999700.00"), Decimal("999500.00")]
    assert Decimal(book["opening_balance"]) == 0
    assert Decimal(book["closing_balance"]) == Decimal("999500.00")
    assert Decimal(book["total_debits"]) == Decimal("500.00")
    assert book["ifsc"] == "FLAI0000001"


def test_passbook_period_opening_balance(independent_engine):
    """A period statement opens with the balance carried forward from before the period."""
    with Session(independent_engine) as db:
        user = _customer(db)
        db.commit()
        src = _account(db, user, "FLAI", "1000.00")  # separate commits => distinct now() timestamps
        ben = _account(db, _customer(db), "IVBK")
        db.commit()
        InterbankService.initiate(
            db, user.id, str(uuid.uuid4()), src.id, "IVBK0000101", ben.account_number, "Ben", Decimal("300.00"), "IMPS"
        )
        full = StatementService.account_passbook(db, db.get(Account, src.id))
        cutoff = full["entries"][1]["posted_at"]  # the IMPS debit
        period = StatementService.account_passbook(db, db.get(Account, src.id), date_from=cutoff)

    assert [e["balance"] for e in full["entries"]] == [Decimal("1000.00"), Decimal("700.00")]
    assert period["opening_balance"] == Decimal("1000.00")
    assert [e["debit"] for e in period["entries"]] == [Decimal("300.00")]
    assert period["closing_balance"] == Decimal("700.00")


def test_passbook_ownership(client, parties, auth_headers_factory):
    remitter, beneficiary, headers, other = parties
    r = client.get(f"/api/v1/statements/accounts/{remitter.id}/passbook", headers=auth_headers_factory(other))
    assert r.status_code == 403


def test_customer_wise_statement_spans_banks(client, db_session, parties, test_customer_user):
    remitter, beneficiary, headers, _ = parties
    _account(db_session, test_customer_user, "DCBK", "50.00")
    book = client.get("/api/v1/statements/customer", headers=headers).json()
    assert {a["bank_code"] for a in book["accounts"]} >= {"FLAI", "DCBK"}
    assert Decimal(book["total_closing_balance"]) == sum(Decimal(a["closing_balance"]) for a in book["accounts"])


def test_bank_balance_sheets_and_day_book(client, db_session, parties, test_staff_user, auth_headers_factory):
    remitter, beneficiary, headers, _ = parties
    _pay(client, headers, remitter, beneficiary, "900.00")
    staff = auth_headers_factory(test_staff_user)

    assert client.get("/api/v1/statements/banks", headers=headers).status_code == 403
    sheets = {s["code"]: s for s in client.get("/api/v1/statements/banks", headers=staff).json()}
    assert set(sheets) >= {"FLAI", "IVBK", "DCBK", "GCBK"}
    assert Decimal(sheets["IVBK"]["interbank_inward_settled"]) >= Decimal("900.00")
    assert Decimal(sheets["FLAI"]["interbank_outward_settled"]) >= Decimal("900.00")

    ivbk = _bank(db_session, "IVBK").id
    rows = client.get(f"/api/v1/statements/banks/{ivbk}/transactions", headers=staff).json()
    assert any(r["account_number"] == beneficiary.account_number and r["credit"] == "900.00" for r in rows)
    custs = client.get(f"/api/v1/statements/banks/{ivbk}/customers", headers=staff).json()
    assert any(c["full_name"] == "Rahul Sharma" for c in custs)


# ---------- Concurrency (independent committed sessions) ----------

@pytest.fixture
def independent_engine():
    engine = create_engine(settings.sync_test_database_url, pool_size=10, pool_pre_ping=True)
    yield engine
    engine.dispose()


def test_failed_payment_keeps_evidence_and_moves_no_money(independent_engine):
    """Financial rollback must not erase the FAILED instruction or its audit log."""
    with Session(independent_engine) as db:
        user = _customer(db)
        db.commit()
        src = _account(db, user, "FLAI", "500.00")
        ben = _account(db, _customer(db), "IVBK")
        db.commit()
        key = str(uuid.uuid4())
        with pytest.raises(InsufficientFundsError):
            InterbankService.initiate(
                db, user.id, key, src.id, "IVBK0000101", ben.account_number, "Ben", Decimal("500.01"), "NEFT"
            )
        src_id, ben_id = src.id, ben.id

    with Session(independent_engine) as db:
        failed = db.scalars(select(InterbankTransfer).where(InterbankTransfer.idempotency_key == key)).one()
        assert failed.status == "FAILED" and failed.outward_txn_id is None
        assert "Insufficient funds" in failed.failure_reason
        assert db.scalars(
            select(AuditLog).where(AuditLog.action == "INTERBANK_FAILED", AuditLog.entity_id == str(failed.id))
        ).first()
        assert db.get(Account, src_id).cached_balance == Decimal("500.00")
        assert LedgerService.get_derived_balance(db, src_id) == Decimal("500.00")
        assert db.get(Account, ben_id).cached_balance == Decimal("0.00")


def test_concurrent_neft_batches_settle_each_payment_once(independent_engine):
    with Session(independent_engine) as db:
        user = _customer(db)
        db.commit()
        src = _account(db, user, "FLAI", "1000.00")
        ben = _account(db, _customer(db), "GCBK")
        db.commit()
        ids = []
        for _ in range(5):
            t, _ = InterbankService.initiate(
                db, user.id, str(uuid.uuid4()), src.id, "GCBK0000301", ben.account_number, "Ben", Decimal("100.00"), "NEFT"
            )
            ids.append(t.id)
        ben_id = ben.id

    barrier = threading.Barrier(2)
    errors = []

    def run():
        with Session(independent_engine) as db:
            barrier.wait()
            try:
                InterbankService.run_neft_batch(db)
            except Exception as exc:
                errors.append(exc)

    threads = [threading.Thread(target=run) for _ in range(2)]
    [t.start() for t in threads]
    [t.join(timeout=30) for t in threads]
    assert not errors

    with Session(independent_engine) as db:
        assert {db.get(InterbankTransfer, i).status for i in ids} == {"SETTLED"}
        assert db.get(Account, ben_id).cached_balance == Decimal("500.00")
        assert LedgerService.get_derived_balance(db, ben_id) == Decimal("500.00")
        assert LedgerService.reconcile_all_accounts(db).is_balanced


def test_concurrent_imps_cannot_overdraw(independent_engine):
    with Session(independent_engine) as db:
        user = _customer(db)
        db.commit()
        src = _account(db, user, "FLAI", "100.00")
        ben = _account(db, _customer(db), "DCBK")
        user_id, src_id, ben_no = user.id, src.id, ben.account_number

    barrier = threading.Barrier(2)
    outcomes = []

    def pay():
        with Session(independent_engine) as db:
            barrier.wait()
            try:
                t, _ = InterbankService.initiate(
                    db, user_id, str(uuid.uuid4()), src_id, "DCBK0000201", ben_no, "Ben", Decimal("80.00"), "IMPS"
                )
                outcomes.append(t.status)
            except InsufficientFundsError:
                outcomes.append("INSUFFICIENT")

    threads = [threading.Thread(target=pay) for _ in range(2)]
    [t.start() for t in threads]
    [t.join(timeout=30) for t in threads]
    assert sorted(outcomes) == ["INSUFFICIENT", "SETTLED"]
    with Session(independent_engine) as db:
        assert db.get(Account, src_id).cached_balance == Decimal("20.00")
        assert LedgerService.get_derived_balance(db, src_id) == Decimal("20.00")
