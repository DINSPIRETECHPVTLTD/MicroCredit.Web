import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { isAuthenticated } from "@/services/auth.service"
import DashboardLayout from "@/components/DashboardLayout"
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
import AddLoan from "./pages/loan/AddLoan"
import ManageLoanList from "./pages/loan/ManageLoanList"
import LoanPrepayment from "./pages/loan/LoanPrepayment"
import LoanSchedulerList from "./pages/loanScheduler/LoanSchedulerList"
import RecoveryPostingList from "./pages/recoveryPosting/RecoveryPostingList"
import DashboardPage from "@/pages/dashboard/DashboardPage"
import Reports from "./pages/Reports/Reports"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated() ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <UserList />
              </ProtectedRoute>
            }
          />
          <Route path="users/new" element={<Navigate to="/users" replace />} />
          <Route path="users/:id/edit" element={<Navigate to="/users" replace />} />
          <Route
            path="org-info"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <Placeholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="branches"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <BranchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="master/data"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <MasterLookupList />
              </ProtectedRoute>
            }
          />
          <Route
            path="master/payment-terms"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <PaymentTermList />
              </ProtectedRoute>
            }
          />
          <Route
            path="funds/investments"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <InvestmentsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="funds/ledger-balances"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <LedgerBalancesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="funds/expenses"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <ExpenseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="centers"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <CenterList />
              </ProtectedRoute>
            }
          />
          <Route
            path="pocs"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <PocList />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin"]}>
                <StaffList />
              </ProtectedRoute>
            }
          />
          <Route
            path="loans/add"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <AddLoan />
              </ProtectedRoute>
            }
          />
          <Route
            path="members"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <MemberList />
              </ProtectedRoute>
            }
          />
          <Route
            path="loans/manage"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <ManageLoanList />
              </ProtectedRoute>
            }
          />
          <Route
            path="loans/:loanId/prepayment"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <LoanPrepayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="loans/recovery-posting"
            element={<Navigate to="/recovery-posting" replace />}
          />
          <Route
            path="loans/:loanId/scheduler"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <LoanSchedulerList />
              </ProtectedRoute>
            }
          />
          <Route
            path="recovery-posting"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <RecoveryPostingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="ledger-transactions/:userId"
            element={
              <ProtectedRoute allowModes={["ORG"]} allowRoles={["Owner"]}>
                <UserLedgerTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowModes={["BRANCH"]} allowRoles={["Owner", "BranchAdmin", "Staff"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
