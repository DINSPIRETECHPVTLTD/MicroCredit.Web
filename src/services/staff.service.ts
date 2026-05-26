import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import type {
    StaffResponse,
    CreateStaffRequest,
    UpdateStaffRequest,
    StaffListApiResponse,
    StaffListResult,
} from "@/types/staff"

function parseStaffListResponse(
    data: StaffResponse[] | StaffListApiResponse
): StaffListResult {
    if (Array.isArray(data)) {
        return { staff: data }
    }
    return {
        staff: data.data ?? [],
        emptyMessage: data.message,
    }
}

export const staffService = {
    async getStaffs(): Promise<StaffListResult> {
        const { data } = await apiClient.get<StaffResponse[] | StaffListApiResponse>(
            api.staff.list
        )
        return parseStaffListResponse(data)
    },

    async createStaff(request: CreateStaffRequest): Promise<unknown> {
        const { data } = await apiClient.post(api.staff.create, request)
        return data
    },

    async updateStaff(id: number, request: UpdateStaffRequest): Promise<unknown> {
        const { data } = await apiClient.put(api.staff.update(id), request)
        return data
    },

    async resetPassword(
        id: number,
        request: { password: string }
    ): Promise<unknown> {
        const { data } = await apiClient.post(api.staff.resetPassword(id), request)
        return data
    },

    async setInactive(id: number) {
        const { data } = await apiClient.delete(api.staff.setInactive(id), {})
        return data
    },
}
