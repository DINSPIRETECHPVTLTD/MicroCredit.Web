import type { AppMenuItem, AppMode, AppRole } from "@/types/menu"

export const DASHBOARD_BASE = ""

export const APP_MENU: AppMenuItem[] = [
  { label: "Dashboard", key: "Dashboard", route: "dashboard", modes: ["ORG"] },
  { label: "Org Info", key: "Info", route: "org-info", modes: ["ORG"] },
  { label: "Users", key: "Users", route: "users", modes: ["ORG"], roles: ["Owner"] },
  { label: "Branches", key: "Branches", route: "branches", modes: ["ORG"], roles: ["Owner"] },
  {
    label: "Master",
    key: "Master",
    modes: ["ORG"],
    children: [
      { label: "Master Data", key: "Master Data", route: "master/data" },
      { label: "Payment Terms", key: "Payment Terms", route: "master/payment-terms" },
    ],
  },
  {
    label: "Funds",
    key: "Funds",
    modes: ["ORG"],
    children: [
      { label: "Investments", key: "Investments", route: "funds/investments" },
      { label: "Ledger Balances", key: "Ledger Balances", route: "funds/ledger-balances" },
      { label: "Expenses", key: "Expenses", route: "funds/expenses" },
    ],
  },
  { label: "Dashboard", key: "Dashboard", route: "dashboard", modes: ["BRANCH"] },
  { label: "Centers", key: "Centers", route: "centers", modes: ["BRANCH"] },
  { label: "POCs", key: "POCs", route: "pocs", modes: ["BRANCH"] },
  { label: "Staff", key: "Staff", route: "staff", modes: ["BRANCH"], roles: ["Owner", "BranchAdmin"] },
  { label: "Members", key: "Members", route: "members", modes: ["BRANCH"] },
  {
    label: "Loans",
    key: "Loan",
    modes: ["BRANCH"],
    children: [
      { label: "Add Loan", key: "Add Loan", route: "loans/add" },
      { label: "Manage Loan", key: "Manage Loan", route: "loans/manage" },
    ],
  },
  { label: "Recovery Posting", key: "Recovery Posting", route: "recovery-posting", modes: ["BRANCH"] },
  {
    label: "Reports",
    key: "Reports",
    modes: ["BRANCH"],
    route: "reports",
  },
]

export function getFilteredMenu(
  menu: AppMenuItem[],
  mode: AppMode,
  role: AppRole
): AppMenuItem[] {
  return menu.filter(
    (item) =>
      (!item.modes || item.modes.includes(mode)) &&
      (!item.roles || item.roles.includes(role))
  )
}

export function getExpandedKeyForUrl(
  menu: AppMenuItem[],
  url: string,
  base: string = DASHBOARD_BASE
): string | null {
  const full = (r: string) =>
    (r ? `${base ? base + "/" : "/"}${r}` : base || "/")
  for (const item of menu) {
    if (item.children?.length) {
      const childMatch = item.children.some(
        (c) => c.route && url.startsWith(full(c.route))
      )
      if (childMatch) return item.key
    }
  }
  return null
}
