// Auth types from MicroCredit.WebApp reference

export interface OrgResponse {
  id: number
  name: string
  address: string
  phoneNumber: string
}

export interface BranchResponse {
  id: number
  name: string
  address: string
  phoneNumber: string
}

export interface AuthRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  refreshToken?: string
  userType: string
  userId: number
  email: string
  firstName: string
  lastName: string
  role: string
  mode?: string // "ORG" | "BRANCH"
  branchId?: number | null
  organization?: OrgResponse
  branch?: BranchResponse | null
}
