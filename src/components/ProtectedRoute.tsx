import { Navigate, useLocation } from "react-router-dom"
import { getSession, isAuthenticated } from "@/services/auth.service"
import type { AppMode, AppRole } from "@/types/menu"
import { getNormalizedSessionMeta } from "@/lib/authz"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowModes?: AppMode[]
  allowRoles?: AppRole[]
}

export function ProtectedRoute({ children, allowModes, allowRoles }: ProtectedRouteProps) {
  const location = useLocation()
  const authenticated = isAuthenticated()
  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }
  const session = getSession()
  const { mode, role } = getNormalizedSessionMeta(session)
  const modeDenied = !!allowModes?.length && !allowModes.includes(mode)
  const roleDenied = !!allowRoles?.length && (!role || !allowRoles.includes(role))
  if (modeDenied || roleDenied) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
