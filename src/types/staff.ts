
export interface StaffResponse {
    id: number
    firstName: string
    surname: string
    email: string
    role: string
    address: string
    address1: string
    address2: string
    city: string
    state: string
    pinCode: string
    phoneNumber: string
}
export interface UpdateStaffRequest {
    firstName: string
    surname: string
    role: string
    email: string
    phoneNumber?: string | null
    address1?: string | null
    address2?: string | null
    city?: string | null
    state?: string | null
    pinCode?: string | null
}

export interface CreateStaffRequest extends UpdateStaffRequest {
    password: string
}
