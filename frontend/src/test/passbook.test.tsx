import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PassbookTable, dateInputToIso } from '../components/common/PassbookTable';
import { AccountPassbook } from '../types/api';

const book: AccountPassbook = {
  account_id: 'a1',
  account_number: 'INR-SAV-1',
  account_type: 'SAVINGS',
  bank_code: 'FLAI',
  bank_name: 'FinLedger Bank',
  ifsc: 'FLAI0000001',
  holder_name: 'Test Holder',
  date_from: null,
  date_to: null,
  opening_balance: '100.00',
  total_debits: '30.00',
  total_credits: '0.00',
  closing_balance: '70.00',
  truncated: false,
  entries: [
    {
      entry_id: 'e1',
      serial: 7,
      transaction_id: 't1',
      posted_at: '2026-10-01T10:00:00Z',
      transaction_type: 'INTERBANK_OUTWARD',
      narration: 'IMPS/FLAII261001ABCDE/Ben/IVBK0000101',
      debit: '30.00',
      credit: null,
      balance: '70.00',
    },
  ],
};

describe('PassbookTable', () => {
  it('shows brought-forward, the posting with its running balance, and IFSC', () => {
    render(<PassbookTable book={book} />);
    expect(screen.getByText('Balance brought forward')).toBeInTheDocument();
    expect(screen.getByText('Inter-bank out')).toBeInTheDocument();
    expect(screen.getByText('IMPS/FLAII261001ABCDE/Ben/IVBK0000101')).toBeInTheDocument();
    expect(screen.getByText('FLAI0000001')).toBeInTheDocument();
    expect(screen.getAllByText('₹70.00').length).toBe(2); // row balance and closing balance
  });

  it('turns a date input into an exclusive end when asked', () => {
    expect(dateInputToIso('')).toBeUndefined();
    const start = new Date(dateInputToIso('2026-10-01')!);
    const end = new Date(dateInputToIso('2026-10-01', true)!);
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
  });
});
