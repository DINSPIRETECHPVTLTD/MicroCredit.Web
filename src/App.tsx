import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { GuestRoute } from "@/components/GuestRoute"
import DashboardLayout from "@/components/DashboardLayout"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Placeholder from "@/pages/Placeholder"
import BranchList from "@/pages/branches/BranchList"
import UserList from "@/pages/users/UserList"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/new" element={<Navigate to="/users" replace />} />
          <Route path="users/:id/edit" element={<Navigate to="/users" replace />} />
          <Route path="org-info" element={<Placeholder />} />
          <Route path="branches" element={<BranchList />} />
          <Route path="master/data" element={<Placeholder />} />
          <Route path="master/payment-terms" element={<Placeholder />} />
          <Route path="funds/investments" element={<Placeholder />} />
          <Route path="funds/ledger-balances" element={<Placeholder />} />
          <Route path="centers" element={<Placeholder />} />
          <Route path="pocs" element={<Placeholder />} />
          <Route path="staff" element={<Placeholder />} />
          <Route path="members" element={<Placeholder />} />
          <Route path="loans/add" element={<Placeholder />} />
          <Route path="loans/manage" element={<Placeholder />} />
          <Route path="recovery-posting" element={<Placeholder />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
