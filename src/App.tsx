import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { GuestRoute } from "@/components/GuestRoute"
import DashboardLayout from "@/components/DashboardLayout"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Placeholder from "@/pages/Placeholder"
import BranchList from "@/pages/branches/BranchList"
import UserList from "@/pages/users/UserList"
import InvestmentsList from "@/pages/Investments/InvestmentsList"
import LedgerBalancesList from "./pages/ledgerBalances/ledgerBalanceList"
import ExpenseList from "./pages/Expenses/ExpenseList"
import MasterLookupList from "@/pages/Master/MasterLookupList"
import PaymentTermList from "@/pages/Master/PaymentTermList"
import PocList from "@/pages/pocs/PocList"
import UserLedgerTransactions from "./pages/ledgerBalances/UserLedgerTransactions"
import CenterList from "./pages/center/CenterList"
import MemberList from "./pages/members/MemberList"
import StaffList from "./pages/staff/StaffList"

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
          <Route path="master/data" element={<MasterLookupList />} />
          <Route path="master/payment-terms" element={<PaymentTermList />} />        
          <Route path="funds/investments" element={<InvestmentsList />} />
          <Route path="funds/ledger-balances" element={<LedgerBalancesList />} />
          <Route path="funds/expenses" element={<ExpenseList />} />
          <Route path="centers" element={<CenterList />} />
          <Route path="pocs" element={<PocList />} />
          <Route path="staff" element={<StaffList />} />
          <Route path="members" element={<MemberList />} />
          <Route path="loans/add" element={<Placeholder />} />
          <Route path="loans/manage" element={<Placeholder />} />
          <Route path="recovery-posting" element={<Placeholder />} />
          <Route path="ledger-transactions/:userId" element={<UserLedgerTransactions />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
