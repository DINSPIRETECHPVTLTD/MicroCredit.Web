import { apiClient } from '@/lib/auth/api-client'
import { api } from "@/lib/api"
import type { UserResponse, CreateUserRequest, UpdateUserRequest } from "@/types/user"

export const userService = {
  async getUsers(): Promise<UserResponse[]> {
    const { data } = await apiClient.get<UserResponse[]>(api.users.list)
    return data
  },
  async getInvestors(): Promise<UserResponse[]> {
    const { data } = await apiClient.get<UserResponse[]>(api.users.investors)
    return data
  },

  async getCollectedByUsers(): Promise<UserResponse[]> {
    const { data } = await apiClient.get<UserResponse[]>(api.users.collectedBy)
    return data
  },

  async createUser(request: CreateUserRequest): Promise<unknown> {
    const { data } = await apiClient.post(api.users.create, request)
    return data
  },

  async updateUser(id: number, request: UpdateUserRequest): Promise<unknown> {
    const { data } = await apiClient.put(api.users.update(id), request)
    return data
  },

  async resetPassword(
    id: number,
    request: { password: string }
  ): Promise<unknown> {
    const { data } = await apiClient.post(api.users.resetPassword(id), request)
    return data
  },

  async setInactive(id: number) {
    const { data } = await apiClient.delete(api.users.setInactive(id), {})
    return data
  },
}
