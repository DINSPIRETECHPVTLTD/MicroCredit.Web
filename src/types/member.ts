/** GET /Member/by-branch/{id} when the branch has no members (200 with message + data). */
export interface MembersListApiResponse {
  message: string
  data: MemberResponse[]
}

export interface MembersListResult {
  members: MemberResponse[]
  emptyMessage?: string
}

export interface MemberResponse {
  id: number
  memberId?: number
  name?: string | null
  guardianName?: string | null
  memberPhone?: string | null
  guardianPhone?: string | null
  dob?: string | null
  guardianDOB?: string | null
  center?: string | null
  fullAddress?: string | null
  poc?: string | null
  firstName?: string
  middleName?: string | null
  lastName?: string
  phoneNumber?: string
  altPhone?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  centerId?: number
  centerName?: string | null
  pocId?: number | null
  /** When set, member has an open loan; use for View Schedule on Members page. */
  primaryOpenLoanId?: number | null
  createdAt?: string
  aadhaar?: string | null
  occupation?: string | null
  relationship?: string | null
  age?: number | null
  guardianFirstName?: string | null
  guardianMiddleName?: string | null
  guardianLastName?: string | null
  guardianAge?: number | null
}
