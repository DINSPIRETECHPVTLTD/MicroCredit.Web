import axios from 'axios';
import { api } from '../lib/api';
import type { LoanResponse } from '../types/loan';

type ApiLoanLike = {
    loanId?: number | string
    id?: number | string
    memberId?: number | string
    fullName?: string
    memberName?: string
    loanTotalAmount?: number | string
    totalAmount?: number | string
    noOfTerms?: number | string
    numberOfTerms?: number | string
    numberofterms?: number | string
    NoOfTerms?: number | string
    weeksPaid?: number | string
    totalAmountPaid?: number | string
    schedulerTotalAmount?: number | string
    remainingBal?: number | string
    remainingBalance?: number | string
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function toText(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value).trim()
}

function getValueCaseInsensitive(source: ApiLoanLike, candidates: string[]): unknown {
    const entries = Object.entries(source ?? {})
    const normalized = new Map<string, unknown>()
    for (const [k, v] of entries) {
        normalized.set(k.toLowerCase(), v)
    }
    for (const key of candidates) {
        const value = normalized.get(key.toLowerCase())
        if (value !== undefined && value !== null && value !== '') {
            return value
        }
    }
    return undefined
}

function normalizeLoan(x: ApiLoanLike): LoanResponse {
    const loanId = getValueCaseInsensitive(x, ['loanId', 'id'])
    const memberId = getValueCaseInsensitive(x, ['memberId'])
    const fullName = getValueCaseInsensitive(x, ['fullName', 'memberName'])
    const loanTotalAmount = getValueCaseInsensitive(x, ['loanTotalAmount', 'totalAmount'])
    const noOfTerms = getValueCaseInsensitive(x, [
        'noOfTerms',
        'numberOfTerms',
        'numberofterms',
        'NoOfTerms',
        'noofterms',
        'terms',
        'termCount',
        'weeksPaid',
    ])
    const totalAmountPaid = getValueCaseInsensitive(x, ['totalAmountPaid'])
    const schedulerTotalAmount = getValueCaseInsensitive(x, ['schedulerTotalAmount', 'loanTotalAmount', 'totalAmount'])
    const remainingBal = getValueCaseInsensitive(x, ['remainingBal', 'remainingBalance'])

    return {
        loanId: toNumber(loanId),
        memberId: toNumber(memberId),
        fullName: typeof fullName === 'string' ? fullName : '',
        loanTotalAmount: toNumber(loanTotalAmount),
        noOfTerms: toText(noOfTerms),
        totalAmountPaid: toNumber(totalAmountPaid),
        schedulerTotalAmount: toNumber(schedulerTotalAmount),
        remainingBal: toNumber(remainingBal),
    }
}

export const loanService = {
    async getLoans(): Promise<LoanResponse[]> {
        const { data } = await axios.get<ApiLoanLike[]>(api.loans.list)
        return (data ?? []).map(normalizeLoan)
    },
    async getActiveLoans(): Promise<LoanResponse[]> {
        const { data } = await axios.get<ApiLoanLike[]>(api.loans.activeList)
        return (data ?? []).map(normalizeLoan)
    },
};