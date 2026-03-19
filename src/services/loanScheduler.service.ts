import axios from "axios"
import { api } from "../lib/api"
import type { LoanSchedulerResponse } from "../types/loanScheduler"

export const loanSchedulerService = {
  async getLoanSchedulers(loanId: number): Promise<LoanSchedulerResponse[]> {
    const { data } = await axios.get<LoanSchedulerResponse[]>(api.loanScheduler.list(loanId))
    return data
  },
}
