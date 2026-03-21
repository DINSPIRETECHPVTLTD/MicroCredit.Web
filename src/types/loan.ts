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
