export interface CenterResponse {
    id: number
    name: string
    address: string
    city: string
}

/** GET /center when the branch has no centers (200 with message + data). */
export interface CentersListApiResponse {
    message: string
    data: CenterResponse[]
}

export interface CentersListResult {
    centers: CenterResponse[]
    /** Set when API returns the empty-list payload with a message. */
    emptyMessage?: string
}