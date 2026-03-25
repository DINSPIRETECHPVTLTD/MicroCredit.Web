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
