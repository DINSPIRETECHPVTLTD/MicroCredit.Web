import axios from "axios"
import { api } from "../lib/api"
import type { PaymentTermResponse, SavePaymentTermRequest } from "../types/paymentTerm"

type ApiPaymentTermResponse = {
    paymentTermId: number
    paymentTermName: string
    paymentType: string
    noOfTerms: number
    processingFee: number | null
    rateOfInterest: number | null
    insuranceFee: number | null
}

type ApiSavePaymentTermRequest = {
    paymentTermName: string
    paymentType: string
    noOfTerms: number
    processingFee: number
    rateOfInterest: number
    insuranceFee: number
}

function toUi(item: ApiPaymentTermResponse): PaymentTermResponse {
    return {
        id: item.paymentTermId,
        paymentTerm: item.paymentTermName,
        paymentType: item.paymentType,
        noOfTerms: item.noOfTerms,
        processingFee: item.processingFee ?? 0,
        rateOfInterest: item.rateOfInterest ?? 0,
        insuranceFee: item.insuranceFee ?? 0,
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
