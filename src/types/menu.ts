export type AppMode = "ORG" | "BRANCH"
export type AppRole = "OWNER" | "BRANCH_ADMIN" | "STAFF" | "BRANCH_USER"

export interface AppMenuItem {
  label: string
  key: string
  route?: string
  modes?: AppMode[]
  roles?: AppRole[]
  children?: AppMenuItem[]
}
