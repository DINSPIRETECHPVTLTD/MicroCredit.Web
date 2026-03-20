import axios from "axios"
import { api } from "@/lib/api"
import type { StaffResponse, CreateStaffRequest, UpdateStaffRequest } from "@/types/staff"

export const staffService = {
    async getStaffs(): Promise<StaffResponse[]> {
        const { data } = await axios.get<StaffResponse[]>(api.staff.list)
        console.log("Fetched staff:", data) 
        return data
    },

    async createStaff(request: CreateStaffRequest): Promise<unknown> {
        const { data } = await axios.post(api.staff.create, request)
        return data
    },

    async updateStaff(id: number, request: UpdateStaffRequest): Promise<unknown> {
        const { data } = await axios.put(api.staff.update(id), request)
        return data
    },

    async resetPassword(
        id: number,
        request: { password: string }
    ): Promise<unknown> {
        const { data } = await axios.post(api.staff.resetPassword(id), request)
        return data
    },

    async setInactive(id: number) {
        const { data } = await axios.delete(api.staff.setInactive(id), {})
        return data
    },
}
