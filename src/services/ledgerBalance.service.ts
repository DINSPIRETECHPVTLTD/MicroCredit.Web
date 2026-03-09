import axios from 'axios';
import { api } from '../lib/api';
import type { LedgerBalanceResponse } from '../types/ledgerBalance';

export const ledgerBalanceService = {
    async getLedgerBalances(): Promise<LedgerBalanceResponse[]> {
        const { data } = await axios.get<LedgerBalanceResponse[]>(api.ledgerBalances.list)
        return data
    }
};