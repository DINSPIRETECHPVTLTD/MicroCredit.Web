import axios from "axios"
import { api } from "@/lib/api"
import type { PocResponse } from "@/types/poc"

export const pocService = {
  async getPocsByBranch(branchId: number): Promise<PocResponse[]> {
    const { data } = await axios.get<PocResponse[]>(api.pocs.listByBranch(branchId))
    return data
  },
}