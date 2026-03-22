export interface LoanResponse {
    id: string
    memberName: string
    totalAmount: number
    weeksPaid: number
    totalAmountPaid: number
    remainingBalance: number


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
