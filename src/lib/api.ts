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
    get create() {
      return `${getApiBase()}/users`
    },
    update: (id: number) => `${getApiBase()}/users/${id}`,
    resetPassword: (id: number) => `${getApiBase()}/users/${id}/reset-password`,
    setInactive: (id: number) => `${getApiBase()}/users/${id}/inactive`,
  },
  branches: {
    get list() {
      return `${getApiBase()}/branchs`
    },
    get create() {
      return `${getApiBase()}/branchs`
    },
    update: (id: number) => `${getApiBase()}/branchs/${id}`,
    setInactive: (id: number) => `${getApiBase()}/branchs/${id}/inactive`,
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

}
