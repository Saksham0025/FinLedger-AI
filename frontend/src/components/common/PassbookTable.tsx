import React from 'react';
import { AccountPassbook } from '../../types/api';
import { formatDate, formatDateOnly, formatINR } from '../../utils/formatters';

const TYPE_LABELS: Record<string, string> = {
  INITIAL_DEPOSIT: 'Deposit',
  CUSTOMER_TRANSFER: 'Transfer',
  CORRECTION_REVERSAL: 'Reversal',
  INVESTMENT_PURCHASE: 'Investment',
  INTERBANK_OUTWARD: 'Inter-bank out',
  INTERBANK_SETTLEMENT: 'Inter-bank in',
  INTERBANK_RETURN: 'Inter-bank return',
};

const money = (v: string | null) => (v === null ? '' : formatINR(v));

/** Passbook-style statement: Sl. No., date, particulars, withdrawals, deposits, running balance. */
export const PassbookTable: React.FC<{ book: AccountPassbook }> = ({ book }) => (
  <div className="border border-eucalyptus-300 rounded-lg overflow-hidden bg-mist-50 [.theme-forensic_&]:bg-forensic-850 [.theme-forensic_&]:border-forensic-700">
    <div className="px-4 py-3 bg-forest-900 text-white flex flex-wrap gap-x-6 gap-y-1 text-xs [.theme-forensic_&]:bg-forensic-900">
      <span>
        <span className="text-sage-200">A/c No.</span> <span className="font-mono font-semibold">{book.account_number}</span>
      </span>
      {book.holder_name && (
        <span>
          <span className="text-sage-200">Name</span> {book.holder_name}
        </span>
      )}
      <span>
        <span className="text-sage-200">Bank</span> {book.bank_name}
      </span>
      <span>
        <span className="text-sage-200">IFSC</span> <span className="font-mono">{book.ifsc}</span>
      </span>
      <span>
        <span className="text-sage-200">Period</span>{' '}
        {book.date_from ? formatDateOnly(book.date_from) : 'Opening'} – {book.date_to ? formatDateOnly(book.date_to) : 'Today'}
      </span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm passbook-ruled">
        <thead>
          <tr className="text-left text-xs text-ink-600 border-b border-hairline [.theme-forensic_&]:text-slate-400 [.theme-forensic_&]:border-forensic-700">
            <th scope="col" className="font-medium py-2 px-3 w-16">Sl. No.</th>
            <th scope="col" className="font-medium py-2 px-3">Date</th>
            <th scope="col" className="font-medium py-2 px-3">Particulars</th>
            <th scope="col" className="font-medium py-2 px-3 text-right">Withdrawals (Dr)</th>
            <th scope="col" className="font-medium py-2 px-3 text-right">Deposits (Cr)</th>
            <th scope="col" className="font-medium py-2 px-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          <tr className="text-ink-600 [.theme-forensic_&]:text-slate-400">
            <td className="py-2 px-3" />
            <td className="py-2 px-3" />
            <td className="py-2 px-3 font-sans italic">Balance brought forward</td>
            <td className="py-2 px-3" />
            <td className="py-2 px-3" />
            <td className="py-2 px-3 text-right">{formatINR(book.opening_balance)}</td>
          </tr>
          {book.entries.map((e) => (
            <tr key={e.entry_id} className="h-10">
              <td className="py-2 px-3 text-ink-500">{e.serial}</td>
              <td className="py-2 px-3 whitespace-nowrap">{formatDate(e.posted_at)}</td>
              <td className="py-2 px-3 font-sans min-w-[16rem]">
                <span className="block text-[11px] text-ink-500 [.theme-forensic_&]:text-slate-400">
                  {TYPE_LABELS[e.transaction_type] ?? e.transaction_type}
                </span>
                <span className="break-words [overflow-wrap:anywhere]">{e.narration}</span>
              </td>
              <td className="py-2 px-3 text-right text-rose-700 [.theme-forensic_&]:text-rose-300">{money(e.debit)}</td>
              <td className="py-2 px-3 text-right text-forest-700 [.theme-forensic_&]:text-emerald-300">{money(e.credit)}</td>
              <td className="py-2 px-3 text-right font-semibold">{formatINR(e.balance)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-mono text-xs border-t border-hairline [.theme-forensic_&]:border-forensic-700">
          <tr>
            <th scope="row" colSpan={3} className="py-2 px-3 text-left font-sans font-medium">
              Totals ({book.entries.length} {book.entries.length === 1 ? 'entry' : 'entries'})
              {book.truncated && <span className="text-amber-700"> — truncated, narrow the period</span>}
            </th>
            <td className="py-2 px-3 text-right">{formatINR(book.total_debits)}</td>
            <td className="py-2 px-3 text-right">{formatINR(book.total_credits)}</td>
            <td className="py-2 px-3 text-right font-bold">{formatINR(book.closing_balance)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

/** `<input type="date">` value to the ISO instant at local midnight; `nextDay` makes an exclusive end. */
export function dateInputToIso(value: string, nextDay = false): string | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  if (nextDay) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
