import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import type { PocResponse, PocsListApiResponse, PocsListResult } from "@/types/poc"

function parsePocsListResponse(
  data: PocResponse[] | PocsListApiResponse | PocResponse
): PocsListResult {
  if (Array.isArray(data)) {
    return { pocs: data }
  }
  if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) {
    return {
      pocs: data.data,
      emptyMessage: data.message,
    }
  }
  return { pocs: [data as PocResponse] }
}

// This matches the backend UpdatePocRequest / CreatePocRequest shape.
export interface PocSaveRequest {
  centerId: number
  firstName: string
  middleName?: string | null
  lastName: string
  phoneNumber: string
  altPhone?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  collectionDay?: string | null
  collectionFrequency: string
  collectionBy: number
}

export const pocService = {
  // GET /POC/{branchId}
  async getByBranch(branchId: number): Promise<PocsListResult> {
    const { data } = await apiClient.get<PocResponse | PocResponse[] | PocsListApiResponse>(
      api.pocs.listByBranch(branchId)
    )
    return parsePocsListResponse(data)
  },
  
  // POST /POC
  async createPoc(request: PocSaveRequest): Promise<PocResponse> {
    const { data } = await apiClient.post<PocResponse>(api.pocs.create(), request)
    return data
  },

  // PUT /POC/{id}
  async updatePoc(id: number, request: PocSaveRequest): Promise<PocResponse> {
    const { data } = await apiClient.put<PocResponse>(api.pocs.update(id), request)
    return data
  },

  // DELETE /POC/{id}/inactive
  async setInactive(id: number): Promise<void> {
    await apiClient.delete(api.pocs.setInactive(id))
  },

  async getByid(id: number): Promise<PocResponse> {
    const { data } = await apiClient.get<PocResponse>(api.pocs.getById(id))
    return data
  }
}