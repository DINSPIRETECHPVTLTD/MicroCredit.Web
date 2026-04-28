

const VITE_API_URL_REQUIRED =
  "VITE_API_URL is required. Set it in your .env file (e.g. VITE_API_URL=https://your-api.example.com)."

function getApiBase(): string {
    const raw = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined
  const trimmed = typeof raw === "string" ? raw.trim() : ""
  if (!trimmed) {
    throw new Error(VITE_API_URL_REQUIRED)
  }
  return trimmed.replace(/\/$/, "")
}

export function getApiUrl(path: string): string {
  const base = getApiBase()
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

export const api = {
  auth: {
    get login() {
      return `${getApiBase()}/auth/login`
    },
    get refresh() {
      return `${getApiBase()}/auth/refresh`
    },
    get navigateToBranch() {
      return `${getApiBase()}/auth/navigate-to-branch`
    },
    get navigateToOrg() {
      return `${getApiBase()}/auth/navigate-to-org`
    },
  },
  users: {
    get list() {
      return `${getApiBase()}/Users/Org`
    },
    get investors() {
      return `${getApiBase()}/Users/investors`
    },
    get collectedBy() {
      return `${getApiBase()}/users/collected-by`
    },
    get create() {
      return `${getApiBase()}/users`
    },
    update: (id: number) => `${getApiBase()}/users/${id}`,
    resetPassword: (id: number) => `${getApiBase()}/users/${id}/reset-password`,
    setInactive: (id: number) => `${getApiBase()}/users/${id}/inactive`,
  },
  branches: {
    get list() {
      return `${getApiBase()}/branches`
    },
    get create() {
      return `${getApiBase()}/branches`
    },
    update: (id: number) => `${getApiBase()}/branches/${id}`,
    setInactive: (id: number) => `${getApiBase()}/branches/${id}/inactive`,
  },
  investments: {
    get list() {
      return `${getApiBase()}/investments`
    },
    get create() {
      return `${getApiBase()}/investments`
    },
  },
  ledgerBalances: {
    get list() {
      return `${getApiBase()}/ledger-balances`
    },

    fundTransfer: `${getApiBase()}/ledger-balances/fund-transfer`
  },
  ledgerTransactions: {
    get expenses() {
      return `${getApiBase()}/ledger-transactions/expenses`
    },
    transactions: (userId: number) => `${getApiBase()}/ledger-transactions/user-transactions/${userId}`,
    get create() {
      return `${getApiBase()}/ledger-transactions/add-expense`
    },
  },
    
   masterLookups: {
        get list() {
            return `${getApiBase()}/masterLookups`
        },
        get keys()
        {
          return `${getApiBase()}/masterLookups/keys`
        },
        update: (id: number) => `${getApiBase()}/masterLookups/${id}`,
        setInactive: (id: number) => `${getApiBase()}/masterLookups/${id}/inactive`,
    },
    paymentTerms: {
        get list() {
            return `${getApiBase()}/paymentTerm`
        },
        get create() {
            return `${getApiBase()}/paymentTerm`
        },
        update: (id: number) => `${getApiBase()}/paymentTerm/${id}`,
        delete: (id: number) => `${getApiBase()}/paymentTerm/${id}`,
    },
    pocs: {
      listByBranch: (branchId: number) => `${getApiBase()}/POC/branch/${branchId}`,
      create: () => `${getApiBase()}/POC`,
      update: (id: number) => `${getApiBase()}/POC/${id}`,
      setInactive: (id: number) => `${getApiBase()}/POC/${id}/inactive`,
      getById:(id: number) => `${getApiBase()}/POC/${id}`
    },
    centers: {
      get list() {
        return `${getApiBase()}/center`
      },
      get create() {
        return `${getApiBase()}/center`
      },
      update: (id: number) => `${getApiBase()}/center/${id}`,
      setInactive: (id: number) => `${getApiBase()}/center/${id}/inactive`,
    },
  members: {
    listByBranch: (branchId: number) => `${getApiBase()}/Member/by-branch/${branchId}`,
    create: () => `${getApiBase()}/Member`,
    update: (id: number) => `${getApiBase()}/Member/${id}`,
    setInactive: (id: number) => `${getApiBase()}/Member/${id}/inactive`,
  },
  memberFees: {
    create: () => `${getApiBase()}/MemberMembershipFees`,
  },
  staff: {
    get list() {
      return `${getApiBase()}/Users/branch`
    },
    get create() {
      return `${getApiBase()}/users`
    },
    update: (id: number) => `${getApiBase()}/users/${id}`,
    resetPassword: (id: number) => `${getApiBase()}/users/${id}/reset-password`,
    setInactive: (id: number) => `${getApiBase()}/users/${id}/inactive`,
  },
  loans: {
      get list() {
          return `${getApiBase()}/loans`
      },

      get addLoan() {
        return `${getApiBase()}/loans/add-loan`
      },

      loanByMemId(memberId: number) {
        return `${getApiBase()}/loans/memberId/${memberId}`
      },

      close(loanId: number) {
        return `${getApiBase()}/loans/${loanId}/close`
      },

      updateStatus(loanId: number) {
        return `${getApiBase()}/loans/${loanId}/status`
      },

      claim(loanId: number) {
        return `${getApiBase()}/loans/${loanId}/claim`
      },

      get activeList() {
        return `${getApiBase()}/loans/ActiveLoans`
      },
  },

    searchMembers: {
      get list() {
        return `${getApiBase()}/member/by-branch/search-member`
      }
    },
      
  loanScheduler: {
    list: (loanId: number) => `${getApiBase()}/LoanSchedulers/${loanId}`,
  },
  recoveryPosting: {
    get schedulers() {
      return `${getApiBase()}/RecoveryPosting/schedulers`
    },
    get post() {
      return `${getApiBase()}/RecoveryPosting/post`
    },
  },
  report: {
    summary: () => `${getApiBase()}/report/summary`,
    pocsByBranch: (branchId: number) =>
      `${getApiBase()}/Report/pocs-by-branch/${branchId}`,
    membersByPoc: (branchId: number, pocId: number) =>
      `${getApiBase()}/Report/members-by-poc/${branchId}/${pocId}`,
    membersByPocs: (branchId: number) =>
      `${getApiBase()}/Report/members-by-pocs/${branchId}`,
    memberWiseCollectionReport: () => `${getApiBase()}/Report/MemberWiseCollectionSheet`
  },
}
