import axios from "axios"
import { api } from "@/lib/api"
import type { PocResponse ,PocRequest} from "@/types/poc"

export const pocService = {
  async getPocsByBranch(branchId: number): Promise<PocResponse[]> {
    const { data } = await axios.get<PocResponse[]>(api.pocs.listByBranch(branchId))
    return data
  },
  async createPoc(request: PocRequest): Promise<PocResponse> {
    const { data } = await axios.post<PocResponse>(api.pocs.create(), request)
    return data
  },
  async updatePoc(id: number, request: PocRequest): Promise<PocResponse> {
    const { data } = await axios.put<PocResponse>(api.pocs.update(id), request)
    return data
  },
  async setInactivePoc(id: number): Promise<unknown> {
    const { data } = await axios.delete(api.pocs.setInactive(id))
    return data
  },
}