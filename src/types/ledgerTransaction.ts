export interface LedgerTransactionResponse {
  id: number
  paidFromUserId: number
  paidToUserId: number
  amount: number
  paymentDate: Date
  createdBy: number
  createdDate: Date
  transactionType: string
  referenceId: number
  comments: string
}