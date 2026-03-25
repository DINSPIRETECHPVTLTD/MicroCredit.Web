export type LoanScheduleWord = "weekly" | "daily" | "monthly"

/** Data passed to the loan agreement print view (navigation state + normalization). */
export interface LoanAgreementMember {
  memberId: string | number
  name: string
  address: string
  loanAmount: number
  loanType: string
  interestRate: number | string
  /** Legacy field; prefer `installmentCount` */
  tenure?: number
  installmentCount: number
  scheduleWord?: LoanScheduleWord
  organizationName: string
}
