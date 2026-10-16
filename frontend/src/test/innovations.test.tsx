import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisputeModal } from '../components/customer/DisputeModal';
import { ForensicDossierDrawer } from '../components/staff/ForensicDossierDrawer';
import { disputesApi } from '../api/disputes';
import { fraudApi } from '../api/fraud';
import { ForensicDossierResponse } from '../types/api';

describe('Innovation UI Components', () => {
  it('renders DisputeModal and submits dispute inquiry', async () => {
    const handleClose = vi.fn();
    const handleCreated = vi.fn();

    vi.spyOn(disputesApi, 'createDispute').mockResolvedValue({
      id: 'disp-test-1',
      customer_id: 'cust-1',
      transfer_request_id: 'tx-123',
      category: 'UNAUTHORIZED',
      description: 'Unrecognized ATM debit',
      status: 'OPEN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      events: [],
    });

    render(
      <DisputeModal
        isOpen={true}
        onClose={handleClose}
        transferId="tx-123"
        onDisputeCreated={handleCreated}
      />
    );

    expect(screen.getByText(/File Transaction Dispute/i)).toBeInTheDocument();
    expect(screen.getByText('tx-123')).toBeInTheDocument();

    const desc = screen.getByPlaceholderText(/Explain the circumstances/i);
    fireEvent.change(desc, { target: { value: 'Unauthorized fund transfer from unrecognized device.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Recourse Inquiry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Recourse Inquiry Filed/i)).toBeInTheDocument();
      expect(screen.getByText(/Inquiry Case Opened/i)).toBeInTheDocument();
    });
  });

  it('renders ForensicDossierDrawer with double-entry legs and evidentiary timeline', async () => {
    const handleClose = vi.fn();

    const mockDossier: ForensicDossierResponse = {
      alert: {
        id: 'alt-1',
        transfer_request_id: 'tx-1',
        model_version: 'rf-v1.0.0',
        risk_score: '0.9200',
        decision: 'HIGH_RISK',
        rule_flags: ['RULE_ZSCORE_OUTLIER', 'GRAPH_RAPID_PASS_THROUGH'],
        feature_snapshot: {},
        explanation: 'Transaction volume is 6.2x higher than typical baseline.',
        review_status: 'PENDING',
        created_at: new Date().toISOString(),
      },
      transfer: {
        id: 'tx-1',
        idempotency_key: 'idemp-1',
        source_account_id: 'acc-src-1',
        destination_account_id: 'acc-dst-1',
        amount: '45000.00',
        currency: 'INR',
        status: 'POSTED',
        created_at: new Date().toISOString(),
      },
      ledger_entries: [
        {
          id: 'leg-1',
          account_id: 'acc-src-1',
          account_number: 'ACC-SAV-111111',
          entry_type: 'DEBIT',
          amount: '45000.00',
          sequence_num: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 'leg-2',
          account_id: 'acc-dst-1',
          account_number: 'ACC-SAV-222222',
          entry_type: 'CREDIT',
          amount: '45000.00',
          sequence_num: 2,
          created_at: new Date().toISOString(),
        },
      ],
      graph_findings: [
        {
          id: 'gf-1',
          pattern_type: 'RAPID_PASS_THROUGH',
          severity: 'CRITICAL',
          heuristic_score: '0.8800',
          explanation: 'Account received ₹45,000 and dispersed ₹44,500 within 2 hours.',
          created_at: new Date().toISOString(),
        },
      ],
      investigation_notes: [],
      audit_logs: [],
      timeline: [
        {
          timestamp: new Date().toISOString(),
          event: 'Transfer Posted',
          category: 'FACT',
          source_ref: 'tx-1',
          description: 'Amount ₹45,000 posted in PostgreSQL ledger.',
        },
        {
          timestamp: new Date().toISOString(),
          event: 'Random Forest Inference',
          category: 'STATISTICAL_MODEL',
          source_ref: 'model-v1',
          description: 'Risk score evaluated as 0.9200.',
        },
      ],
    };

    vi.spyOn(fraudApi, 'getDossier').mockResolvedValue(mockDossier);

    render(
      <ForensicDossierDrawer
        isOpen={true}
        onClose={handleClose}
        alertId="alt-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Forensic Investigation Dossier/i)).toBeInTheDocument();
      expect(screen.getByText('0.9200')).toBeInTheDocument();
      expect(screen.getByText('ACC-SAV-111111')).toBeInTheDocument();
      expect(screen.getByText('ACC-SAV-222222')).toBeInTheDocument();
      expect(screen.getByText('RAPID_PASS_THROUGH')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Commit Determination/i })).toBeInTheDocument();
    });
  });
});
