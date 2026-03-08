import axios from 'axios';
import { api } from '../lib/api';
import type { LedgerTransactionResponse } from '@/types/ledgerTransaction';

export const ledgerTransactionService = {
    async getExpenses(): Promise<LedgerTransactionResponse[]> {
        const { data } = await axios.get<LedgerTransactionResponse[]>(api.ledgerTransactions.expenses)
        return data
    }
};