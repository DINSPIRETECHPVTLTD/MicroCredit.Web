export interface InvestmentResponse {
  id: number
  userId: number
  amount: number
  investmentDate: Date
  createdById: number
  createdDate: Date
}

export interface CreateInvestmentRequest {
  userId: number
  amount: number
  investmentDate: string
  createdDate: string
}