import axios from 'axios';
import { api } from '../lib/api';
import type { AddLoanRequest, LoanResponse } from '../types/loan';

export const loanService = {
    async getLoans(): Promise<LoanResponse[]> {
        const { data } = await axios.get<LoanResponse[]>(api.loans.list)
        return data
    },

    async addLoan(request : AddLoanRequest): Promise<number> {
        const { data } = await axios.post(api.loans.addLoan, request)
        return data
    },

    async getLoanByMemId(memberId: number): Promise<LoanResponse[]> {
        const { data } = await axios.get<LoanResponse[]>(api.loans.loanByMemId(memberId))
        return data
    }
};