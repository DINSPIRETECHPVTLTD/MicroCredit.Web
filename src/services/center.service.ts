import { apiClient } from '@/lib/auth/api-client'
import { api } from '../lib/api';
import type { CenterResponse, CentersListApiResponse, CentersListResult } from '../types/center';

function parseCentersListResponse(
    data: CenterResponse[] | CentersListApiResponse
): CentersListResult {
    if (Array.isArray(data)) {
        return { centers: data }
    }
    return {
        centers: data.data ?? [],
        emptyMessage: data.message,
    }
}

export const centerService = {
    async getCenters(): Promise<CentersListResult> {
        const { data } = await apiClient.get<CenterResponse[] | CentersListApiResponse>(
            api.centers.list
        )
        return parseCentersListResponse(data)
    },

    async createCenter(request: { name: string; address?: string | null; city?: string | null; }): Promise<CenterResponse> {
        const { data } = await apiClient.post<CenterResponse>(api.centers.create, request)
        return data
    },

    async updateCenter(id: number, request: { name: string; address?: string | null; city?: string | null; }): Promise<CenterResponse> {
        const { data } = await apiClient.put<CenterResponse>(api.centers.update(id), request)
        return data
    },

    async setInactive(id: number): Promise<unknown> {
        const { data } = await apiClient.delete(api.centers.setInactive(id))
        return data
    },
};
