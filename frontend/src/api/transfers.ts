import { apiClient } from './client';
import { TransferRequest } from '../types/api';

export interface CreateTransferPayload {
  source_account_id: string;
  destination_account_id: string;
  amount: string | number;
  currency?: string;
  memo?: string | null;
}

export const transfersApi = {
  createTransfer: async (
    payload: CreateTransferPayload,
    idempotencyKey: string
  ): Promise<TransferRequest> => {
    const res = await apiClient.post<TransferRequest>(
      '/api/v1/transfers',
      {
        ...payload,
        currency: 'INR', // Strictly INR
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return res.data;
  },

  getTransfer: async (id: string): Promise<TransferRequest> => {
    const res = await apiClient.get<TransferRequest>(`/api/v1/transfers/${id}`);
    return res.data;
  },

  previewTransfer: async (
    payload: { source_account_id: string; destination_account_id: string; amount: string | number }
  ): Promise<import('../types/api').PayeePreviewResponse> => {
    const res = await apiClient.post<import('../types/api').PayeePreviewResponse>(
      '/api/v1/transfers/preview',
      payload
    );
    return res.data;
  },
};

