import { apiClient } from './client';
import {
  AccountPassbook,
  Bank,
  BankBalanceSheet,
  BankCustomerRow,
  BankDayBookEntry,
  BeneficiaryLookup,
  CustomerPassbook,
  InterbankStatus,
  InterbankTransfer,
  NeftBatchResult,
  PaymentRail,
} from '../types/api';

export interface CreateInterbankPayload {
  source_account_id: string;
  rail: PaymentRail;
  beneficiary_ifsc: string;
  beneficiary_account_number: string;
  beneficiary_name: string;
  amount: string;
  memo?: string | null;
}

export interface Period {
  date_from?: string;
  date_to?: string;
}

export const interbankApi = {
  listBanks: async (): Promise<Bank[]> => (await apiClient.get<Bank[]>('/api/v1/banks')).data,

  lookupBeneficiary: async (ifsc: string, accountNumber: string): Promise<BeneficiaryLookup> =>
    (
      await apiClient.get<BeneficiaryLookup>('/api/v1/interbank/beneficiary', {
        params: { ifsc, account_number: accountNumber },
      })
    ).data,

  send: async (payload: CreateInterbankPayload, idempotencyKey: string): Promise<InterbankTransfer> =>
    (
      await apiClient.post<InterbankTransfer>('/api/v1/interbank/transfers', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    ).data,

  list: async (status?: InterbankStatus, limit = 50): Promise<InterbankTransfer[]> =>
    (
      await apiClient.get<InterbankTransfer[]>('/api/v1/interbank/transfers', {
        params: { status, limit },
      })
    ).data,

  runNeftBatch: async (): Promise<NeftBatchResult> =>
    (await apiClient.post<NeftBatchResult>('/api/v1/interbank/neft/settle-batch')).data,
};

export const statementsApi = {
  accountPassbook: async (accountId: string, period: Period = {}): Promise<AccountPassbook> =>
    (await apiClient.get<AccountPassbook>(`/api/v1/statements/accounts/${accountId}/passbook`, { params: period })).data,

  customerPassbook: async (customerId?: string, period: Period = {}): Promise<CustomerPassbook> =>
    (
      await apiClient.get<CustomerPassbook>('/api/v1/statements/customer', {
        params: { customer_id: customerId, ...period },
      })
    ).data,

  bankBalanceSheets: async (): Promise<BankBalanceSheet[]> =>
    (await apiClient.get<BankBalanceSheet[]>('/api/v1/statements/banks')).data,

  bankCustomers: async (bankId: string): Promise<BankCustomerRow[]> =>
    (await apiClient.get<BankCustomerRow[]>(`/api/v1/statements/banks/${bankId}/customers`)).data,

  bankDayBook: async (bankId: string, limit = 100, offset = 0): Promise<BankDayBookEntry[]> =>
    (
      await apiClient.get<BankDayBookEntry[]>(`/api/v1/statements/banks/${bankId}/transactions`, {
        params: { limit, offset },
      })
    ).data,
};
