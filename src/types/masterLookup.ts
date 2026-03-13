export interface MasterLookupResponse {
    id: number
    lookupKey: string
    lookupValue: string
    lookupCode: string
    numericValue: number | null
    sortOrder: number
    description?: string | null
}

export interface CreateMasterLookupRequest {
    lookupKey: string
    lookupCode: string
    lookupValue: string
    numericValue?: number | null
    sortOrder: number
    description?: string | null
}

export type UpdateMasterLookupRequest = CreateMasterLookupRequest
