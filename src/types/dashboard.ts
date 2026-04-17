export interface DashboardSummaryResponse {
  totalOwnerAmount: number
  totalInvestorAmount: number
  totalInsuranceAmount: number
  totalProcessingFee: number
  receivedPrinciple: number
  receivedInterest: number
  outstandingPrinciple: number
  interestAccured: number
  totalJoiningFee: number
  totalLedgerExpenseAmount: number
}

export interface DashboardChartItem {
  label: string
  value: number
}
