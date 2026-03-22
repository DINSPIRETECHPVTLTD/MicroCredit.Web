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
        return data
    },
};