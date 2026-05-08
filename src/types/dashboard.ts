export interface DashboardSummaryResponse {
  totalOwnerAmount: number
  totalInvestorAmount: number
  totalInsuranceAmount: number
  totalClaimedAmount: number
  totalProcessingFee: number
  receivedPrinciple: number
  receivedInterest: number
  outstandingPrinciple: number
  interestAccured: number
  totalJoiningFee: number
  totalExpenseAmount: number
  totalLedgerExpenseAmount: number
}

export interface DashboardChartItem {
  label: string
  value: number
}
