export type AppMode = "ORG" | "BRANCH"
export type AppRole = "Owner" | "BranchAdmin" | "Staff" | "Investor"

export interface AppMenuItem {
  label: string
  key: string
  route?: string
  modes?: AppMode[]
  roles?: AppRole[]
  /** If set, users with these roles will not see this item (applied after `roles`). */
  excludeRoles?: AppRole[]
  children?: AppMenuItem[]
}
