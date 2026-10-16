import { apiClient } from './client';
import { GraphSubgraphResponse, GraphFindingResponse } from '../types/api';

export interface GetSubgraphParams {
  anchor_account_id?: string;
  depth?: number;
  time_window_hours?: number;
  min_amount?: number;
}

export interface ListFindingsParams {
  pattern_type?: string;
  severity?: 'INFO' | 'SUSPICIOUS' | 'CRITICAL';
  review_status?: 'PENDING' | 'CLEARED' | 'CONFIRMED_FRAUD' | 'ESCALATED';
  limit?: number;
  offset?: number;
}

export const graphApi = {
  getSubgraph: async (params?: GetSubgraphParams): Promise<GraphSubgraphResponse> => {
    const res = await apiClient.get<GraphSubgraphResponse>('/api/v1/graph/subgraph', { params });
    return res.data;
  },

  listFindings: async (params?: ListFindingsParams): Promise<GraphFindingResponse[]> => {
    const res = await apiClient.get<GraphFindingResponse[]>('/api/v1/graph/findings', { params });
    return res.data;
  },

  reviewFinding: async (
    id: string,
    payload: { review_status: string; review_notes?: string }
  ): Promise<GraphFindingResponse> => {
    const res = await apiClient.patch<GraphFindingResponse>(`/api/v1/graph/findings/${id}/review`, payload);
    return res.data;
  },
};
