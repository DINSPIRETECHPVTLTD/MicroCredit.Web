export type AppMode = "ORG" | "BRANCH"
export type AppRole = "Owner" | "BranchAdmin" | "Staff" | "Investor"

export interface AppMenuItem {
  label: string
  key: string
  route?: string
  modes?: AppMode[]
  roles?: AppRole[]
  children?: AppMenuItem[]
}
