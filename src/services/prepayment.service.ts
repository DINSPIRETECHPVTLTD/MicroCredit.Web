import { apiClient } from '@/lib/auth/api-client'
import { api } from '../lib/api'

export type PrepaymentPostLine = {
    loanSchedulerId: number
    paymentAmount: number
    principalAmount: number
    interestAmount: number
    paymentMode: string
    status: string
    comments?: string | null
}

export type PrepaymentPostPayload = {
    clientRequestId: string
    collectedBy: number
    items: PrepaymentPostLine[]
    skipLedgerTransaction?: boolean
}

export async function postPrepaymentRecoveries(
    payload: PrepaymentPostPayload
): Promise<{ postedCount: number; message?: string }> {
    const { data } = await apiClient.post<{ postedCount: number; message?: string }>(
        api.recoveryPosting.post,
        {
            clientRequestId: payload.clientRequestId,
            collectedBy: payload.collectedBy,
            items: payload.items,
            ...(payload.skipLedgerTransaction ? { skipLedgerTransaction: true } : {}),
        }
    )
    return data
}
