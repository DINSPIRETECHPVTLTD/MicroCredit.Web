import axios from 'axios';
import { api } from '../lib/api';
import type { LoanResponse } from '../types/loan';

export const loanService = {
    async getLoans(): Promise<LoanResponse[]> {
        const { data } = await axios.get<LoanResponse[]>(api.loans.list)
        return data
    },
};