export interface LedgerBalanceResponse {
  id: number
  userId: number
  amount: number
  insuranceAmount: number
}

export interface CreateFundTransferRequest  {
  paidFromUserId: number
  paidToUserId: number
  amount: number
  paymentDate: string
  createdDate: string
  comments: string
}