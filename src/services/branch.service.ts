import axios from 'axios';
import { api } from '../lib/api';
import type { BranchResponse } from '../types/branch';

export const branchService = {
    async getBranches(): Promise<BranchResponse[]> {
        const { data } = await axios.get<BranchResponse[]>(api.branches.list)
        return data
    },

    async createBranch(request: { name: string; address1?: string | null; address2?: string | null; city?: string | null; state?: string | null; country?: string | null; zipcode?: string | null; phoneNumber?: string | null }): Promise<BranchResponse> {
        const { data } = await axios.post<BranchResponse>(api.branches.create, request)
        return data
    },

    async updateBranch(id: number, request: { name: string; address1?: string | null; address2?: string | null; city?: string | null; state?: string | null; country?: string | null; zipcode?: string | null; phoneNumber?: string | null }): Promise<BranchResponse> {
        const { data } = await axios.put<BranchResponse>(api.branches.update(id), request)
        return data
    },

    async setInactive(id: number): Promise<unknown> {
        const { data } = await axios.delete(api.branches.setInactive(id))
        return data
    },
};
