import axios from "axios"
import { api } from "../lib/api"
import type { PaymentTermResponse, SavePaymentTermRequest } from "../types/paymentTerm"

type ApiPaymentTermResponse = {
    paymentTermId?: number | string
    PaymentTermId?: number | string
    paymentTermName?: string
    PaymentTermName?: string
    paymentType?: string
    PaymentType?: string
    noOfTerms?: number | string
    NoOfTerms?: number | string
    processingFee?: number | string | null
    ProcessingFee?: number | string | null
    rateOfInterest?: number | string | null
    RateOfInterest?: number | string | null
    insuranceFee?: number | string | null
    InsuranceFee?: number | string | null
}

type ApiSavePaymentTermRequest = {
    paymentTermName: string
    paymentType: string
    noOfTerms: number
    processingFee: number
    rateOfInterest: number
    insuranceFee: number
}

function toNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0
    if (typeof value === "string") {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

function toText(value: unknown): string {
    if (value === null || value === undefined) return ""
    return String(value).trim()
}

function toUi(item: ApiPaymentTermResponse): PaymentTermResponse {
    return {
        id: toNumber(item.paymentTermId ?? item.PaymentTermId),
        paymentTerm: toText(item.paymentTermName ?? item.PaymentTermName),
        paymentType: toText(item.paymentType ?? item.PaymentType),
        noOfTerms: toNumber(item.noOfTerms ?? item.NoOfTerms),
        processingFee: toNumber(item.processingFee ?? item.ProcessingFee),
        rateOfInterest: toNumber(item.rateOfInterest ?? item.RateOfInterest),
        insuranceFee: toNumber(item.insuranceFee ?? item.InsuranceFee),
    }
}

function toApi(request: SavePaymentTermRequest): ApiSavePaymentTermRequest {
    return {
        paymentTermName: request.paymentTerm,
        paymentType: request.paymentType,
        noOfTerms: request.noOfTerms,
        processingFee: request.processingFee,
        rateOfInterest: request.rateOfInterest,
        insuranceFee: request.insuranceFee,
    }
}

export const paymentTermService = {
    async getPaymentTerms(): Promise<PaymentTermResponse[]> {
        const { data } = await axios.get<ApiPaymentTermResponse[]>(api.paymentTerms.list)
        return data.map(toUi)
    },

    async createPaymentTerm(request: SavePaymentTermRequest): Promise<unknown> {
        const { data } = await axios.post(api.paymentTerms.create, toApi(request))
        return data
    },

    async updatePaymentTerm(id: number, request: SavePaymentTermRequest): Promise<unknown> {
        const { data } = await axios.put(api.paymentTerms.update(id), toApi(request))
        return data
    },

    async deletePaymentTerm(id: number): Promise<unknown> {
        const { data } = await axios.delete(api.paymentTerms.delete(id))
        return data
    },
}
