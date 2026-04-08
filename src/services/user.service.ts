import axios from "axios"
import { api } from "@/lib/api"
import type { UserResponse, CreateUserRequest, UpdateUserRequest } from "@/types/user"

export const userService = {
  async getUsers(): Promise<UserResponse[]> {
    const { data } = await axios.get<UserResponse[]>(api.users.list)
    console.log("Fetched users:", data) // Debug log to check fetched data
    return data
  },

  async getCollectedByUsers(): Promise<UserResponse[]> {
    const { data } = await axios.get<UserResponse[]>(api.users.collectedBy)
    return data
  },

  async createUser(request: CreateUserRequest): Promise<unknown> {
    const { data } = await axios.post(api.users.create, request)
    return data
  },

  async updateUser(id: number, request: UpdateUserRequest): Promise<unknown> {
    const { data } = await axios.put(api.users.update(id), request)
    return data
  },

  async resetPassword(
    id: number,
    request: { password: string }
  ): Promise<unknown> {
    const { data } = await axios.post(api.users.resetPassword(id), request)
    return data
  },

  async setInactive(id: number) {
    const { data } = await axios.delete(api.users.setInactive(id), {})
    return data
  },
}
