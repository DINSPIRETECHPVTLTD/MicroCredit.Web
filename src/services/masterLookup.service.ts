import axios from 'axios';
import { api } from '../lib/api';
import type { CreateMasterLookupRequest, MasterLookupResponse, UpdateMasterLookupRequest } from '../types/masterLookup';

export const masterlookupService = {
    async getMasterLookups(): Promise<MasterLookupResponse[]> {
        const { data } = await axios.get<MasterLookupResponse[]>(api.masterLookups.list)
        return data
    },
    async getMasterLookupsByKey(lookupKey: string): Promise<MasterLookupResponse[]> {
        const all = await this.getMasterLookups()
        return all.filter(
          (x) => x.lookupKey?.toLowerCase() === lookupKey.toLowerCase()
        )
    },

    async createMasterLookup(request: CreateMasterLookupRequest): Promise<number> {
        const { data } = await axios.post<number>(api.masterLookups.list, request)
        return data
    },

    async updateMasterLookup(id: number, request: UpdateMasterLookupRequest): Promise<void> {
        await axios.put(api.masterLookups.update(id), request)
    },

    async setInactive(id: number): Promise<void> {
        await axios.delete(api.masterLookups.setInactive(id))
    },
};
