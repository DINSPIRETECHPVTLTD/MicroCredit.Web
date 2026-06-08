import type { Breakpoint } from "./breakpoints"

export type TableVisibilityKey =
  | "members"
  | "branches"
  | "users"
  | "staff"
  | "pocs"
  | "centers"
  | "expenses"
  | "investments"
  | "ledgerBalances"
  | "ledgerTransactions"
  | "masterLookups"
  | "paymentTerms"
  | "manageLoans"
  | "loanScheduler"
  | "addLoanSearch"
  | "loanPrepayment"
  | "recoveryPosting"
  | "dashboardPoc"
  | "dashboardMemberDetail"
  | "staffScheduleStaff"
  | "staffSchedulePoc"
  | "staffScheduleMemberLines"

type VisibilityMap = Record<string, boolean>

/** Per-table column visibility by breakpoint. Omitted keys default to visible. */
const TABLE_VISIBILITY: Record<
  TableVisibilityKey,
  Record<Breakpoint, VisibilityMap>
> = {
  members: {
    mobile: {
      memberId: false,
      memberCode: false,
      phone: false,
      dob: false,
      center: false,
      fullAddress: false,
      poc: false,
    },
    tablet: {
      memberId: false,
      dob: false,
      fullAddress: false,
      poc: false,
    },
    desktop: {},
  },
  branches: {
    mobile: { id: false, address: false, phoneNumber: false },
    tablet: { id: false, address: false },
    desktop: {},
  },
  users: {
    mobile: { id: false, email: false, role: false, address: false },
    tablet: { id: false, address: false },
    desktop: {},
  },
  staff: {
    mobile: { id: false, email: false, role: false, address: false },
    tablet: { id: false, address: false },
    desktop: {},
  },
  pocs: {
    mobile: { id: false, phoneNumber: false, centerName: false, fullAddress: false },
    tablet: { id: false, fullAddress: false },
    desktop: {},
  },
  centers: {
    mobile: { id: false, address: false, city: false },
    tablet: { id: false, address: false },
    desktop: {},
  },
  expenses: {
    mobile: { createdByName: false, createdDate: false, comments: false },
    tablet: { createdDate: false, comments: false },
    desktop: {},
  },
  investments: {
    mobile: { createdByName: false, createdDate: false },
    tablet: { createdDate: false },
    desktop: {},
  },
  ledgerBalances: {
    mobile: {},
    tablet: {},
    desktop: {},
  },
  ledgerTransactions: {
    mobile: { toUser: false, createdDate: false, transactionType: false, comments: false },
    tablet: { createdDate: false, comments: false },
    desktop: {},
  },
  masterLookups: {
    mobile: {
      id: false,
      lookupCode: false,
      numericValue: false,
      sortOrder: false,
      status: false,
    },
    tablet: { id: false, numericValue: false, sortOrder: false, status: false },
    desktop: {},
  },
  paymentTerms: {
    mobile: {
      id: false,
      paymentType: false,
      noOfTerms: false,
      processingFee: false,
      rateOfInterest: false,
      insuranceFee: false,
    },
    tablet: {
      id: false,
      processingFee: false,
      rateOfInterest: false,
      insuranceFee: false,
    },
    desktop: {},
  },
  manageLoans: {
    mobile: {
      pocName: false,
      noOfTerms: false,
      totalAmountPaid: false,
      loanId: false,
      memberId: false,
      schedulerTotalAmount: false,
      remainingBal: false,
    },
    tablet: {
      loanId: false,
      memberId: false,
      schedulerTotalAmount: false,
    },
    desktop: {
      loanId: false,
      memberId: false,
      schedulerTotalAmount: false,
      remainingBal: false,
    },
  },
  loanScheduler: {
    mobile: {
      LoanschedulerId: false,
      LoanID: false,
      PaymentDate: false,
      PaymentMode: false,
      Comments: false,
    },
    tablet: {
      LoanschedulerId: false,
      LoanID: false,
      PaymentMode: false,
      Comments: false,
    },
    desktop: {
      LoanschedulerId: false,
      LoanID: false,
    },
  },
  addLoanSearch: {
    mobile: {
      fullAddress: false,
      phoneNumber: false,
      guardianName: false,
      center: false,
      poc: false,
    },
    tablet: { fullAddress: false, guardianName: false, poc: false },
    desktop: {},
  },
  loanPrepayment: {
    mobile: {
      paymentDate: false,
      principalAmount: false,
      interestAmount: false,
      paymentMode: false,
      comments: false,
    },
    tablet: {
      interestAmount: false,
      comments: false,
    },
    desktop: {},
  },
  recoveryPosting: {
    mobile: {
      loanId: false,
      installmentNo: false,
      actualPrincipal: false,
      actualInterest: false,
      principalAmt: false,
      interestAmt: false,
      paymentMode: false,
      comments: false,
      pocName: false,
    },
    tablet: {
      actualPrincipal: false,
      actualInterest: false,
      interestAmt: false,
      comments: false,
    },
    desktop: {},
  },
  dashboardPoc: {
    mobile: { centerName: false },
    tablet: {},
    desktop: {},
  },
  dashboardMemberDetail: {
    mobile: { memberId: false, scheduleDate: false },
    tablet: { memberId: false },
    desktop: {},
  },
  staffScheduleStaff: {
    mobile: { userRole: false, scheduleCount: false },
    tablet: { scheduleCount: false },
    desktop: {},
  },
  staffSchedulePoc: {
    mobile: {},
    tablet: {},
    desktop: {},
  },
  staffScheduleMemberLines: {
    mobile: { memberId: false, scheduleDate: false },
    tablet: { memberId: false },
    desktop: {},
  },
}

export function getColumnVisibility(
  tableKey: TableVisibilityKey,
  breakpoint: Breakpoint
): VisibilityMap {
  return TABLE_VISIBILITY[tableKey][breakpoint]
}

export function hasHiddenColumns(
  tableKey: TableVisibilityKey,
  breakpoint: Breakpoint
): boolean {
  const vis = getColumnVisibility(tableKey, breakpoint)
  return Object.values(vis).some((v) => v === false)
}

export function getHiddenColumnIds(
  tableKey: TableVisibilityKey,
  breakpoint: Breakpoint
): string[] {
  const vis = getColumnVisibility(tableKey, breakpoint)
  return Object.entries(vis)
    .filter(([, visible]) => visible === false)
    .map(([id]) => id)
}

/** Merge responsive visibility with static defaults (e.g. ManageLoans desktop toggles). */
export function mergeColumnVisibility(
  responsive: VisibilityMap,
  defaults: VisibilityMap = {}
): VisibilityMap {
  return { ...defaults, ...responsive }
}
