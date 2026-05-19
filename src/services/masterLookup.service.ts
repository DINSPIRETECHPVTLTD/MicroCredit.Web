import { apiClient } from '@/lib/auth/api-client'
import { api } from '../lib/api';
import type { CreateMasterLookupRequest, MasterLookupResponse, UpdateMasterLookupRequest } from '../types/masterLookup';

export const masterlookupService = {
    async getMasterLookups(): Promise<MasterLookupResponse[]> {
        const { data } = await apiClient.get<MasterLookupResponse[]>(api.masterLookups.list)
        return data
    },
    async getMasterLookupsByKey(lookupKey: string): Promise<MasterLookupResponse[]> {
        const { data } = await apiClient.get<MasterLookupResponse[]>(
            `${api.masterLookups.list}?lookupKey=${encodeURIComponent(lookupKey)}`
        )
        return data
    },

    async createMasterLookup(request: CreateMasterLookupRequest): Promise<number> {
        const { data } = await apiClient.post<number>(api.masterLookups.list, request)
        return data
    },

    async updateMasterLookup(id: number, request: UpdateMasterLookupRequest): Promise<void> {
        await apiClient.put(api.masterLookups.update(id), request)
    },

    async setInactive(id: number): Promise<void> {
        await apiClient.delete(api.masterLookups.setInactive(id))
    },
    async getLookupKeys(): Promise<string[]> {
        const { data } = await apiClient.get<string[]>(api.masterLookups.keys)
        return data
      },
};
