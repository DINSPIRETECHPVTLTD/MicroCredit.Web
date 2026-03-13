import axios from 'axios';
import { api } from '../lib/api';
import type { CreateFundTransferRequest, LedgerBalanceResponse } from '../types/ledgerBalance';

export const ledgerBalanceService = {
    async getLedgerBalances(): Promise<LedgerBalanceResponse[]> {
        const { data } = await axios.get<LedgerBalanceResponse[]>(api.ledgerBalances.list)
        return data
    },

    async createFundTransfer(payload: CreateFundTransferRequest): Promise<void> {
        await axios.post(api.ledgerBalances.fundTransfer, payload)
    }
};