import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertTriageDrawer } from '../components/staff/AlertTriageDrawer';
import { FraudAlert } from '../types/api';

const mockAlert: FraudAlert = {
  id: 'alert-1234-5678',
  transfer_request_id: 'transfer-9999',
  model_version: 'rf-v1.0.0',
  risk_score: '0.8500',
  decision: 'HIGH_RISK',
  rule_flags: ['AMOUNT_THRESHOLD_50K', 'RAPID_BURST'],
  feature_snapshot: { amount: 75000, hour_of_day: 2 },
  explanation: 'High transaction amount exceeding ₹50,000 threshold during off-hours.',
  review_status: 'PENDING',
  created_at: new Date().toISOString(),
};

describe('AlertTriageDrawer Component', () => {
  it('renders risk score percentage, decision, and heuristic rule triggers', () => {
    const handleClose = vi.fn();
    render(
      <AlertTriageDrawer
        isOpen={true}
        onClose={handleClose}
        alert={mockAlert}
      />
    );

    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('HIGH_RISK')).toBeInTheDocument();
    expect(screen.getByText('AMOUNT_THRESHOLD_50K')).toBeInTheDocument();
    expect(screen.getByText('RAPID_BURST')).toBeInTheDocument();
    expect(screen.getByText(mockAlert.explanation)).toBeInTheDocument();
  });

  it('enforces mandatory staff review notes before committing triage decision', async () => {
    const handleClose = vi.fn();
    render(
      <AlertTriageDrawer
        isOpen={true}
        onClose={handleClose}
        alert={mockAlert}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /commit review decision/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Staff review notes are mandatory for forensic auditability/i)
      ).toBeInTheDocument();
    });
  });
});
