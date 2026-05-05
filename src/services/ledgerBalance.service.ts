import axios from 'axios';
import { api } from '../lib/api';
import type { CreateFundTransferRequest, LedgerBalanceResponse } from '../types/ledgerBalance';

type ApiLedgerBalanceLike = {
    id?: number | string
    Id?: number | string
    userId?: number | string
    UserId?: number | string
    amount?: number | string
    Amount?: number | string
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function normalizeLedgerBalance(row: ApiLedgerBalanceLike): LedgerBalanceResponse {
    return {
        id: toNumber(row.id ?? row.Id),
        userId: toNumber(row.userId ?? row.UserId),
        amount: toNumber(row.amount ?? row.Amount),
    }
}

export const ledgerBalanceService = {
    async getLedgerBalances(): Promise<LedgerBalanceResponse[]> {
        const { data } = await axios.get<ApiLedgerBalanceLike[]>(api.ledgerBalances.list)
        return (data ?? []).map(normalizeLedgerBalance)
    },

    async createFundTransfer(payload: CreateFundTransferRequest): Promise<void> {
        await axios.post(api.ledgerBalances.fundTransfer, payload)
    }
};