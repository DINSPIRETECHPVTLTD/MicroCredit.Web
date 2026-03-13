export interface PocResponse {
  id: number
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
  centerId: number
  createdBy: number
  collectionDay?: string | null
  collectionFrequency: string
  collectionBy: number
  createdAt: string
  name: string
  fullAddress: string
  centerName: string   // NEW For Center Name in POC Grid
}

export interface PocRequest {
  centerId: number
  firstName: string
  middleName?: string | null   
  lastName: string             
  phoneNumber: string
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  collectionFrequency?: string | null
  collectionDay?: string | null
  collectedByUserId?: number | null
}

