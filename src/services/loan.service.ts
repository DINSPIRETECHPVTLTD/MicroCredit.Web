import axios from 'axios';
import { api } from '../lib/api';
import type { AddLoanRequest, LoanResponse } from '../types/loan';

type ApiLoanLike = {
    loanId?: number | string
    id?: number | string
    memberId?: number | string
    fullName?: string
    memberName?: string
    status?: string
    Status?: string
    loanTotalAmount?: number | string
    totalAmount?: number | string
    noOfTerms?: number | string
    numberOfTerms?: number | string
    numberofterms?: number | string
    NoOfTerms?: number | string
    weeksPaid?: number | string
    /** Full installments marked paid (excludes partial slots unless API only sends weeksPaid as combined). */
    paidTerms?: number | string
    paidEmiCount?: number | string
    emiPaidCount?: number | string
    completedTerms?: number | string
    partialPaidTerms?: number | string
    partialTerms?: number | string
    partialEmiCount?: number | string
    totalTerms?: number | string
    loanTerms?: number | string
    loanTermCount?: number | string
    totalNoOfTerms?: number | string
    termsProgress?: number | string
    totalAmountPaid?: number | string
    schedulerTotalAmount?: number | string
    remainingBal?: number | string
    remainingBalance?: number | string
}

type ClaimLoanResponse = {
    loanId?: number
    status?: string
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

const TERMS_FRACTION = /^(\d+)\s*\/\s*(\d+)$/

function isSlashFractionString(value: unknown): boolean {
    return typeof value === 'string' && TERMS_FRACTION.test(value.trim())
}

/** Plain non-negative integer counts only (rejects "10/0"-style composites). */
function parsePlainTermCount(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined
    const s = String(value).trim()
    if (s.includes('/')) return undefined
    const n = toNumber(value)
    if (!Number.isFinite(n) || n < 0) return undefined
    return Math.trunc(n)
}

/**
 * API often sends total/paid as "10/0". Display as paid/total: "0/10".
 * If the string is already paid/total (e.g. "2/10"), leave it as-is.
 */
function normalizeTermsFractionString(raw: string): string {
    const s = raw.trim()
    const m = s.match(TERMS_FRACTION)
    if (!m) return s
    const a = Number(m[1])
    const b = Number(m[2])
    if (a > b) return `${b}/${a}`
    return `${a}/${b}`
}

function getTotalTermCount(x: ApiLoanLike): number | undefined {
    const keys = [
        'totalTerms',
        'loanTermCount',
        'totalNoOfTerms',
        'loanTerms',
        'numberOfTerms',
        'numberofterms',
        'NoOfTerms',
        'noOfTerms',
    ]
    for (const key of keys) {
        const v = getValueCaseInsensitive(x, [key])
        const n = parsePlainTermCount(v)
        if (n !== undefined && n > 0) return n
    }
    return undefined
}

function getPaidAndPartialCounts(x: ApiLoanLike): { paid: number; partial: number } | undefined {
    const paidRaw = getValueCaseInsensitive(x, [
        'paidTerms',
        'paidEmiCount',
        'emiPaidCount',
        'completedTerms',
    ])
    const partialRaw = getValueCaseInsensitive(x, [
        'partialPaidTerms',
        'partialTerms',
        'partialEmiCount',
    ])
    const weeksRaw = getValueCaseInsensitive(x, ['weeksPaid'])

    const partial = parsePlainTermCount(partialRaw) ?? 0
    let paid = parsePlainTermCount(paidRaw)
    if (paid === undefined) paid = parsePlainTermCount(weeksRaw)

    if (paid !== undefined || partial > 0) {
        return { paid: paid ?? 0, partial }
    }
    return undefined
}

/** Paid & partial / total for active loan lists (and member loan rows). */
function buildActiveLoanTermsLabel(x: ApiLoanLike): string {
    const total = getTotalTermCount(x)
    const pp = getPaidAndPartialCounts(x)
    if (total !== undefined && pp !== undefined) {
        return `${pp.paid + pp.partial}/${total}`
    }

    const composite = getValueCaseInsensitive(x, ['termsProgress', 'noOfTerms', 'terms', 'termCount'])
    const s = toText(composite)
    if (s && isSlashFractionString(s)) {
        return normalizeTermsFractionString(s)
    }

    if (s) return s
    return ''
}

function normalizeLoan(x: ApiLoanLike): LoanResponse {
    const loanId = getValueCaseInsensitive(x, ['loanId', 'id'])
    const memberId = getValueCaseInsensitive(x, ['memberId'])
    const fullName = getValueCaseInsensitive(x, ['fullName', 'memberName'])
    const status = getValueCaseInsensitive(x, ['status'])
    const loanTotalAmount = getValueCaseInsensitive(x, ['loanTotalAmount', 'totalAmount'])
    const totalAmountPaid = getValueCaseInsensitive(x, ['totalAmountPaid'])
    const schedulerTotalAmount = getValueCaseInsensitive(x, ['schedulerTotalAmount', 'loanTotalAmount', 'totalAmount'])
    const remainingBal = getValueCaseInsensitive(x, ['remainingBal', 'remainingBalance'])

    return {
        loanId: toNumber(loanId),
        memberId: toNumber(memberId),
        fullName: typeof fullName === 'string' ? fullName : '',
        status: typeof status === 'string' ? status : '',
        loanTotalAmount: toNumber(loanTotalAmount),
        noOfTerms: buildActiveLoanTermsLabel(x),
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

    async addLoan(request : AddLoanRequest): Promise<number> {
        const { data } = await axios.post(api.loans.addLoan, request)
        return data
    },

    async updateLoanStatus(loanId: number, status: string): Promise<LoanResponse> {
        const { data } = await axios.post<ApiLoanLike>(api.loans.updateStatus(loanId), { status })
        return normalizeLoan(data)
    },

    async getLoanByMemId(memberId: number): Promise<LoanResponse[]> {
        const { data } = await axios.get<ApiLoanLike[]>(api.loans.loanByMemId(memberId))
        return (data ?? []).map(normalizeLoan)
    },

    async claimLoan(loanId: number): Promise<ClaimLoanResponse> {
        const { data } = await axios.post<ClaimLoanResponse>(api.loans.claim(loanId))
        return data ?? {}
    },
}