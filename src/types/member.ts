export interface MemberResponse {
  id: number
  /** Member ID for grid display (use id when not provided) */
  memberId?: number
  /** Full name from API (combined firstName + middleName + lastName) */
  name?: string | null
  /** Guardian name from API (combined) */
  guardianName?: string | null
  /** Member phone for grid */
  memberPhone?: string | null
  guardianPhone?: string | null
  /** Member date of birth, ISO e.g. "2002-06-05T00:00:00" */
  dob?: string | null
  /** Guardian date of birth, ISO e.g. "2000-10-31T00:00:00" */
  guardianDOB?: string | null
  /** Center name (from centerId lookup) */
  center?: string | null
  fullAddress?: string | null
  /** POC name (from pocId lookup) */
  poc?: string | null
  /** For form/edit (may be sent separately on create/update) */
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
  // Extra fields used for edit form
  aadhaar?: string | null
  occupation?: string | null
  relationship?: string | null
  age?: number | null
  guardianFirstName?: string | null
  guardianMiddleName?: string | null
  guardianLastName?: string | null
  guardianAge?: number | null
}
