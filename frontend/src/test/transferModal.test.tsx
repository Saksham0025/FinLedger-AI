import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransferModal } from '../components/customer/TransferModal';
import { Account } from '../types/api';

const mockAccounts: Account[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    customer_id: 'cust-1',
    account_number: 'INR-SAV-123456',
    account_type: 'SAVINGS',
    currency: 'INR',
    cached_balance: '50000.00',
    status: 'ACTIVE',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('TransferModal Component', () => {
  it('validates strictly positive amount and rejects zero or negative amounts', async () => {
    const handleClose = vi.fn();
    render(
      <TransferModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '0' } });

    const destInput = screen.getByPlaceholderText(/e\.g\. 12345678/i);
    fireEvent.change(destInput, { target: { value: '22222222-2222-2222-2222-222222222222' } });

    const reviewBtn = screen.getByRole('button', { name: /review transfer/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Amount must be strictly greater than ₹0.00/i)).toBeInTheDocument();
    });
  });

  it('rejects same-account transfer attempts', async () => {
    const handleClose = vi.fn();
    render(
      <TransferModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '5000.00' } });

    // Set destination to same ID as source
    const destInput = screen.getByPlaceholderText(/e\.g\. 12345678/i);
    fireEvent.change(destInput, { target: { value: mockAccounts[0].id } });

    const reviewBtn = screen.getByRole('button', { name: /review transfer/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Source and destination accounts must be distinct/i)).toBeInTheDocument();
    });
  });

  it('navigates to review step with valid inputs and displays idempotency key', async () => {
    const handleClose = vi.fn();
    render(
      <TransferModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
      />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '15000.00' } });

    const destInput = screen.getByPlaceholderText(/e\.g\. 12345678/i);
    fireEvent.change(destInput, { target: { value: '33333333-3333-3333-3333-333333333333' } });

    const reviewBtn = screen.getByRole('button', { name: /review transfer/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirm & Post Transfer/i)).toBeInTheDocument();
      expect(screen.getByText(/Idempotency Key/i)).toBeInTheDocument();
      expect(screen.getByText(/₹15,000.00/i)).toBeInTheDocument();
    });
  });
});
