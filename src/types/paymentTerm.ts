export interface PaymentTermResponse {
    id: number
    paymentTerm: string
    paymentType: string
    noOfTerms: number
    processingFee: number
    rateOfInterest: number
    insuranceFee: number
}

export interface SavePaymentTermRequest {
    paymentTerm: string
    paymentType: string
    noOfTerms: number
    processingFee: number
    rateOfInterest: number
    insuranceFee: number
}

