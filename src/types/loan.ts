export interface LoanResponse {
    loanId: number
    memberId: number
    fullName: string
    loanTotalAmount: number
    noOfTerms: string
    totalAmountPaid: number
    schedulerTotalAmount: number
    remainingBal: number
}

export interface AddLoanRequest {
    memberId: number
    loanAmount: number 
    interestAmount: number
    processingFee: number
    insuranceFee: number
    isSavingEnabled: false
    savingAmount: number
    totalAmount: number
    disbursementDate: string
    collectionStartDate: string
    collectionTerm: String
    noOfTerms: number
}
