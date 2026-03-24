import axios from 'axios'
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
    collectedBy: number
    items: PrepaymentPostLine[]
}

export async function postPrepaymentRecoveries(
    payload: PrepaymentPostPayload
): Promise<{ postedCount: number; message?: string }> {
    const { data } = await axios.post<{ postedCount: number; message?: string }>(
        api.recoveryPosting.post,
        payload
    )
    return data
}
