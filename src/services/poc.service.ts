// src/services/poc.service.ts
import axios from "axios"
import { api } from "@/lib/api"
import type { PocResponse } from "@/types/poc"

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
  async getByBranch(branchId: number): Promise<PocResponse[]> {
    const { data } = await axios.get<PocResponse | PocResponse[]>(
      api.pocs.listByBranch(branchId)
    )
  
    // If backend returns a single object, wrap it; if it returns an array, use as-is.
    return Array.isArray(data) ? data : [data]
  },
  
  // POST /POC
  async createPoc(request: PocSaveRequest): Promise<PocResponse> {
    const { data } = await axios.post<PocResponse>(api.pocs.create(), request)
    return data
  },

  // PUT /POC/{id}
  async updatePoc(id: number, request: PocSaveRequest): Promise<PocResponse> {
    const { data } = await axios.put<PocResponse>(api.pocs.update(id), request)
    return data
  },

  // DELETE /POC/{id}/inactive
  async setInactive(id: number): Promise<void> {
    await axios.delete(api.pocs.setInactive(id))
  },
}