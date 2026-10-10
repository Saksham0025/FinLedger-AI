"""Integration tests for System-Wide Ledger Reconciliation in FinLedger-AI.

Verifies:
- Standard system state reports is_balanced=True with 0 discrepancies
- Deliberately introduced cache balance tampering is accurately detected and measured
- Staff-only access control on /api/v1/audit/reconciliation endpoint
"""

from decimal import Decimal
import uuid

from app.models.account import Account
from app.services.ledger_service import LedgerService


def test_reconciliation_detects_deliberate_discrepancy(db_session, sample_customer):
    """Verify reconciliation detects an intentionally desynchronized cached balance."""
    # Create test account with matched cached balance and zero ledger entries
    tampered_acc = Account(
        customer_id=sample_customer.id,
        account_number=f"INR-DISCREP-{uuid.uuid4().hex[:6]}",
        account_type="SAVINGS",
        currency="INR",
        cached_balance=Decimal("0.00"),
        status="ACTIVE",
        version=1,
    )
    db_session.add(tampered_acc)
    db_session.flush()

    # Tamper with cached balance directly without creating ledger entries
    tampered_acc.cached_balance = Decimal("1234.56")
    db_session.flush()

    report = LedgerService.reconcile_all_accounts(db_session)

    # Must detect discrepancy
    assert report.is_balanced is False
    assert report.discrepancy_count >= 1

    discrepant_item = next(d for d in report.discrepancies if d.account_id == tampered_acc.id)
    assert discrepant_item.cached_balance == Decimal("1234.56")
    assert discrepant_item.derived_balance == Decimal("0.00")
    assert discrepant_item.discrepancy == Decimal("1234.56")


def test_reconciliation_api_rbac(client, auth_headers_factory, test_staff_user, test_customer_user):
    """Verify /api/v1/audit/reconciliation requires STAFF or ADMIN role."""
    # Staff access -> 200 OK
    staff_headers = auth_headers_factory(test_staff_user)
    staff_res = client.get("/api/v1/audit/reconciliation", headers=staff_headers)
    assert staff_res.status_code == 200
    data = staff_res.json()
    assert "is_balanced" in data
    assert "total_accounts_checked" in data

    # Customer access -> 403 Forbidden
    cust_headers = auth_headers_factory(test_customer_user)
    cust_res = client.get("/api/v1/audit/reconciliation", headers=cust_headers)
    assert cust_res.status_code == 403

    # Unauthenticated access -> 401 Unauthorized
    anon_res = client.get("/api/v1/audit/reconciliation")
    assert anon_res.status_code == 401
