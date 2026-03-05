import { useState, useEffect } from "react"
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
} from "lucide-react"

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
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

  const getLink = (route: string | undefined) => {
    if (route == null || route === "") return "/"
    return `/${route}`
  }

  const isExpanded = (key: string) => expandedKey === key
  const toggleExpanded = (key: string) =>
    setExpandedKey((k) => (k === key ? null : key))

  const handleReturnToOrg = () => {
    authService.navigateToOrg().catch(() => {})
  }

  const handleLogout = () => {
    authService.logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {organization?.name ?? "MCS"}
          </div>
          {organization && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {organization.address} • {organization.phoneNumber}
            </p>
          )}
          {selectedBranch && (
            <p className="text-xs text-primary mt-1 font-medium">
              {selectedBranch.name}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filteredMenu.map((item) =>
            item.route !== undefined && !item.children?.length ? (
              <NavLink
                key={item.key}
                to={getLink(item.route)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )
                }
              >
                {item.label}
              </NavLink>
            ) : item.children?.length ? (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.key)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-muted"
                >
                  {item.label}
                  {isExpanded(item.key) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isExpanded(item.key) &&
                  item.children?.map((child) => (
                    <NavLink
                      key={child.key}
                      to={getLink(child.route)}
                      className={({ isActive }) =>
                        cn(
                          "flex pl-8 pr-4 py-2 text-sm",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
              </div>
            ) : null
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
          <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {mode === "ORG" ? "ORG MODE" : "BRANCH MODE"}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              {userDisplayName}
            </span>
            {mode === "BRANCH" && role === "OWNER" && (
              <Button variant="outline" size="sm" onClick={handleReturnToOrg}>
                Return back to Org Mode
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              LOG OUT
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
