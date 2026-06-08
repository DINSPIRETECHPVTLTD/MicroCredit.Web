import type { MemberResponse } from "@/types/member"
import type { SearchMemberResponse } from "@/types/searchMemeber"

/** Map branch member list row to Add Loan dialog/search shape (loan status from list API). */
export function memberToSearchMember(row: MemberResponse): SearchMemberResponse {
  const name =
    row.name?.trim() ||
    [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ").trim() ||
    "Member"
  const guardianName =
    [row.guardianFirstName, row.guardianLastName].filter(Boolean).join(" ").trim() ||
    row.guardianName?.trim() ||
    ""

  return {
    id: row.id,
    firstName: row.firstName ?? "",
    middleName: row.middleName ?? undefined,
    lastName: row.lastName ?? "",
    phoneNumber: row.phoneNumber ?? row.memberPhone ?? "",
    altPhone: row.altPhone ?? undefined,
    address1: row.address1 ?? undefined,
    address2: row.address2 ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    zipCode: row.zipCode ?? undefined,
    centerId: row.centerId,
    branchId: undefined,
    aadhaar: row.aadhaar ?? undefined,
    occupation: row.occupation ?? undefined,
    relationship: row.relationship ?? undefined,
    age: row.age ?? undefined,
    guardianFirstName: row.guardianFirstName ?? undefined,
    guardianMiddleName: row.guardianMiddleName ?? undefined,
    guardianLastName: row.guardianLastName ?? undefined,
    guardianPhone: row.guardianPhone ?? undefined,
    guardianAge: row.guardianAge ?? undefined,
    pocId: row.pocId ?? undefined,
    center: row.center ?? row.centerName ?? "",
    poc: row.poc ?? "",
    guardianName,
    name,
    fullAddress: row.fullAddress ?? "",
    primaryOpenLoanId: row.primaryOpenLoanId ?? null,
  }
}
