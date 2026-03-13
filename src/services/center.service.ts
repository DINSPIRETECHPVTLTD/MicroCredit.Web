import axios from 'axios';
import { api } from '../lib/api';
import type { CenterResponse } from '../types/center';

export const centerService = {
    async getCenters(): Promise<CenterResponse[]> {
        const { data } = await axios.get<CenterResponse[]>(api.centers.list)
        return data
    },

    async createCenter(request: { name: string; address?: string | null; city?: string | null; }): Promise<CenterResponse> {
        const { data } = await axios.post<CenterResponse>(api.centers.create, request)
        return data
    },

    async updateCenter(id: number, request: { name: string; address?: string | null; city?: string | null; }): Promise<CenterResponse> {
        const { data } = await axios.put<CenterResponse>(api.centers.update(id), request)
        return data
    },

    async setInactive(id: number): Promise<unknown> {
        const { data } = await axios.delete(api.centers.setInactive(id))
        return data
    },
};
