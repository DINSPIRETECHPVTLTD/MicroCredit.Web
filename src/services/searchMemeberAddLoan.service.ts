import axios from 'axios';
import { api } from '../lib/api';
import type { SearchMemberResponse } from '@/types/searchMemeber';

export interface SearchMemberRequest {
  branchId: number;
  firstName: string;
  middleName: string;
  lastName: string;
}

export const searchMemberService = {
    async getmembers(request: SearchMemberRequest): Promise<SearchMemberResponse[]> {
        const { data } = await axios.post<SearchMemberResponse[]>(api.searchMembers.list, request)
        const rows = data ?? []
        return rows.map((row) => {
            const r = row as SearchMemberResponse & Record<string, unknown>
            const raw =
                r.primaryOpenLoanId ??
                r.PrimaryOpenLoanId ??
                (row as { primaryOpenLoanId?: unknown }).primaryOpenLoanId
            const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
            const primaryOpenLoanId = Number.isFinite(n) && n > 0 ? n : null
            return { ...row, primaryOpenLoanId }
        })
    },
};