import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom"
import {
  APP_MENU,
  DASHBOARD_BASE,
  getFilteredMenu,
  getExpandedKeyForUrl,
} from "@/config/app-menu"
import type { AppMode, AppRole } from "@/types/menu"
import type { OrgResponse, BranchResponse } from "@/types/auth"
import {
  getSession,
  getDisplayName,
  getOrganization,
  getBranch,
  authService,
} from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  MapPin,
  User,
  LayoutDashboard,
  Info,
  Users,
  GitBranch,
  Database,
  Table,
  CreditCard,
  Wallet,
  TrendingUp,
  BookOpen,
  Building,
  UserCheck,
  Banknote,
  Plus,
  List,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"

const MENU_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Info: Info,
  Users: Users,
  Branches: GitBranch,
  Master: Database,
  "Master Data": Table,
  "Payment Terms": CreditCard,
  Funds: Wallet,
  Investments: TrendingUp,
  "Ledger Balances": BookOpen,
  Expenses: CreditCard,
  Centers: Building,
  POCs: UserCheck,
  Staff: Users,
  Members: Users,
  Loan: Banknote,
  "Add Loan": Plus,
  "Manage Loan": List,
  "Recovery Posting": RefreshCw,
}

function getMenuIcon(key: string): LucideIcon | null {
  return MENU_ICONS[key] ?? null
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(getSession())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const mode: AppMode =
    session?.mode === "ORG" || session?.mode === "BRANCH"
      ? session.mode
      : "ORG"
  const role: AppRole =
    session?.role === "OWNER" ||
    session?.role === "BRANCH_ADMIN" ||
    session?.role === "STAFF" ||
    session?.role === "BRANCH_USER"
      ? session.role
      : "OWNER"

  const organization: OrgResponse | null = getOrganization()
  const selectedBranch: BranchResponse | null = getBranch()
  const userDisplayName = getDisplayName()
  const filteredMenu = getFilteredMenu(APP_MENU, mode, role)


  useEffect(() => {
    const key = getExpandedKeyForUrl(filteredMenu, location.pathname, DASHBOARD_BASE)
    if (key) setExpandedKey(key)
  }, [location.pathname, filteredMenu])


  useEffect(() => {
    setSession(getSession())
  }, [location.pathname])
  
  const getLink = (route: string | undefined) => {
    if (route == null || route === "") return "/"
    return `/${route}`
  }

  const isExpanded = (key: string) => expandedKey === key
  const toggleExpanded = (key: string) =>
    setExpandedKey((k) => (k === key ? null : key))

  const handleReturnToOrg = async () => {
    try {
      await authService.navigateToOrg()
      setSession(getSession())
      toast.success("Successfully switched to Org mode")
      navigate("/", { replace: true })
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            "Failed to switch to Org mode"
          : "Failed to switch to Org mode"
  
      toast.error(message)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex h-screen min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-card shadow-sm">
        <div className="flex flex-col gap-1 border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {organization?.name ?? "MCS"}
              </p>
              {selectedBranch && (
                <p className="truncate text-xs font-medium text-primary">
                  {selectedBranch.name}
                </p>
              )}
            </div>
          </div>
          {organization?.address && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">
                {organization.address}
                {organization.phoneNumber ? ` • ${organization.phoneNumber}` : ""}
              </span>
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-0.5">
            {filteredMenu.map((item) =>
              item.route !== undefined && !item.children?.length ? (
                <li key={item.key}>
                  <NavLink
                    to={getLink(item.route)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    {(() => {
                      const Icon = getMenuIcon(item.key)
                      return (
                        <>
                          {Icon ? (
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </>
                      )
                    })()}
                  </NavLink>
                </li>
              ) : item.children?.length ? (
                <li key={item.key}>
                  {(() => {
                    const ParentIcon = getMenuIcon(item.key)
                    return (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.key)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="flex items-center gap-3">
                          {ParentIcon ? (
                            <ParentIcon className="h-4 w-4 shrink-0" aria-hidden />
                          ) : (
                            <span className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {isExpanded(item.key) ? (
                          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    )
                  })()}
                  {isExpanded(item.key) && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                      {item.children?.map((child) => (
                        <li key={child.key}>
                          <NavLink
                            to={getLink(child.route)}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                                isActive
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )
                            }
                          >
                            {(() => {
                              const Icon = getMenuIcon(child.key)
                              return (
                                <>
                                  {Icon ? (
                                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  ) : (
                                    <span className="h-3.5 w-3.5 shrink-0" />
                                  )}
                                  <span className="truncate">{child.label}</span>
                                </>
                              )
                            })()}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : null
            )}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
                mode === "ORG"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              )}
            >
              {mode === "ORG" ? "Org" : "Branch"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 sm:flex">
              <User className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
                {userDisplayName}
              </span>
            </div>
            {mode === "BRANCH" && role === "OWNER" && (
              <Button variant="outline" size="sm" onClick={handleReturnToOrg}>
                Back to Org
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
