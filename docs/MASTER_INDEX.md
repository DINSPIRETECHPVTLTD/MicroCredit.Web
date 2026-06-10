# MicroCredit.Web — Master Index

**Application:** MicroCredit.Web — Micro-credit / loan-management frontend (Navya Micro Credit Services)
**Stack:** React 19 + Vite 7 + TypeScript 5.9 · React Router 7 · TanStack React Query 5 · react-hook-form + Zod · Material React Table 3 · MUI 7 · Tailwind CSS 3 · Axios
**Backend:** REST API at `VITE_API_URL` (JWT bearer auth with refresh tokens)
**Last indexed:** 2026-06-09

This document is the master inventory and reference index for the application. Each item carries a stable ID (`PG-`, `CMP-`, `API-`, `ROLE-`, `NAV-`, `FRM-`, `TBL-`, `WF-`) to be referenced by the detailed UI/UX documentation that follows.

---

## Table of Contents

1. [User Roles & Access Model](#1-user-roles--access-model)
2. [Pages (Routes)](#2-pages-routes)
3. [Navigation](#3-navigation)
4. [Components](#4-components)
5. [APIs (Services & Endpoints)](#5-apis-services--endpoints)
6. [Forms & Dialogs](#6-forms--dialogs)
7. [Tables & Data Grids](#7-tables--data-grids)
8. [Workflows](#8-workflows)
9. [Cross-Cutting Architecture](#9-cross-cutting-architecture)
10. [Planned Detailed Documentation Set](#10-planned-detailed-documentation-set)

---

## 1. User Roles & Access Model

The app operates in two **session modes** combined with four **roles** (normalized in `src/lib/authz.ts`).

### 1.1 Session Modes

| ID | Mode | Description |
|----|------|-------------|
| MODE-ORG | `ORG` | Organization-level context. Administration, master data, funds, reports. |
| MODE-BRANCH | `BRANCH` | Branch-level operational context. Centers, POCs, members, loans, collections. Entered from Branch List via "Navigate"; exited via "Back to Org". |

### 1.2 Roles

| ID | Role | Modes | Summary of Access |
|----|------|-------|-------------------|
| ROLE-01 | **Owner** | ORG + BRANCH | Full access. Only role that sees Users, Branches, Master, Funds, Reports (ORG) and Staff (BRANCH). Can switch ORG ↔ BRANCH. |
| ROLE-02 | **Staff** | BRANCH | Branch operations: Centers, POCs, Members, Loans, Recovery Posting, Dashboard. |
| ROLE-03 | **BranchAdmin** | BRANCH | Dashboard only — explicitly excluded (`excludeRoles`) from Centers, POCs, Staff, Members, Loans, Recovery Posting, Reports menu items. |
| ROLE-04 | **Investor** | ORG | Dashboard only (no role-specific menu items). Appears as a user type in Investments / Fund Transfers. |

Unknown/unmapped roles get a minimal menu (Dashboard only) plus a warning banner.

### 1.3 Route Permission Matrix

| Route | Mode | Allowed Roles |
|-------|------|---------------|
| `/dashboard` | ORG or BRANCH | All authenticated |
| `/users`, `/org-info`, `/branches`, `/master/*`, `/funds/*`, `/reports`, `/ledger-transactions/:userId` | ORG | Owner |
| `/centers`, `/pocs`, `/members`, `/loans/*`, `/recovery-posting` | BRANCH | Owner, Staff |
| `/staff` | BRANCH | Owner |

Enforced by `ProtectedRoute` (`src/components/ProtectedRoute.tsx`): unauthenticated → `/login` (preserving `from`); mode/role mismatch → toast + redirect to `/dashboard`.

---

## 2. Pages (Routes)

Routing defined in `src/App.tsx`. All authenticated routes render inside `DashboardLayout` (sidebar + header shell).

### 2.1 Public

| ID | Route | Page | File | Purpose |
|----|-------|------|------|---------|
| PG-00 | `/login` | Login | `src/pages/Login.tsx` | Sign-in (dual-mode ORG→BRANCH fallback). Redirects to `/dashboard` if already authenticated. |

### 2.2 Shared (ORG + BRANCH)

| ID | Route | Page | File | Purpose |
|----|-------|------|------|---------|
| PG-01 | `/dashboard` | Dashboard | `src/pages/dashboard/DashboardPage.tsx` | Mode-aware: ORG financial summary vs BRANCH collection schedule dashboards. |

### 2.3 ORG Mode (Owner)

| ID | Route | Page | File | Purpose |
|----|-------|------|------|---------|
| PG-02 | `/users` | User List | `src/pages/users/UserList.tsx` | Org users (Owner/Investor) CRUD, reset password, deactivate. |
| PG-03 | `/org-info` | Org Info | `src/pages/Placeholder.tsx` | Placeholder (not yet implemented). |
| PG-04 | `/branches` | Branch List | `src/pages/branches/BranchList.tsx` | Branch CRUD + navigate into branch context. |
| PG-05 | `/master/data` | Master Lookup List | `src/pages/Master/MasterLookupList.tsx` | Lookup key/value reference data CRUD. |
| PG-06 | `/master/payment-terms` | Payment Term List | `src/pages/Master/PaymentTermList.tsx` | Loan payment-term templates CRUD. |
| PG-07 | `/funds/investments` | Investments List | `src/pages/Investments/InvestmentsList.tsx` | Investor capital records. |
| PG-08 | `/funds/ledger-balances` | Ledger Balances | `src/pages/ledgerBalances/ledgerBalanceList.tsx` | Per-user ledger balances + fund transfer. |
| PG-09 | `/funds/expenses` | Expense List | `src/pages/Expenses/ExpenseList.tsx` | Expense ledger entries. |
| PG-10 | `/ledger-transactions/:userId` | User Ledger Transactions | `src/pages/ledgerBalances/UserLedgerTransactions.tsx` | Per-user transaction history (drill-down from PG-08). |
| PG-11 | `/reports` | Reports | `src/pages/Reports/Reports.tsx` | Downloadable reports (Member Wise Collection Sheet `.xlsx`). |

### 2.4 BRANCH Mode (Owner, Staff)

| ID | Route | Page | File | Purpose |
|----|-------|------|------|---------|
| PG-12 | `/centers` | Center List | `src/pages/center/CenterList.tsx` | Collection centers CRUD. |
| PG-13 | `/pocs` | POC List | `src/pages/pocs/PocList.tsx` | Points of Contact (collection agents) CRUD. |
| PG-14 | `/staff` | Staff List | `src/pages/staff/StaffList.tsx` | Branch staff users CRUD (Owner only). |
| PG-15 | `/members` | Member List | `src/pages/members/MemberList.tsx` | Member onboarding/CRUD, loan shortcuts, document printing. |
| PG-16 | `/loans/add` | Add Loan | `src/pages/loan/AddLoan.tsx` | Member search → loan origination. |
| PG-17 | `/loans/manage` | Manage Loans | `src/pages/loan/ManageLoanList.tsx` | Active loan portfolio; entry to schedule/modify. |
| PG-18 | `/loans/:loanId/scheduler` | Loan Scheduler | `src/pages/loanScheduler/LoanSchedulerList.tsx` | Read-only EMI installment schedule. |
| PG-19 | `/loans/:loanId/prepayment` | Loan Prepayment / Modify Loan | `src/pages/loan/LoanPrepayment.tsx` | EMI posting, prepayment, status change, claim, full closure. |
| PG-20 | `/recovery-posting` | Recovery Posting | `src/pages/recoveryPosting/RecoveryPostingList.tsx` | Daily collection posting by date/center/POC. |

### 2.5 Redirect Routes

| Route | Behavior |
|-------|----------|
| `/` | → `/dashboard` |
| `/users/new`, `/users/:id/edit` | → `/users` |
| `/loans/recovery-posting` | → `/recovery-posting` |
| `*` (catch-all) | → `/` |

---

## 3. Navigation

Menu config: `src/config/app-menu.ts` (`APP_MENU`), filtered per mode + role by `getFilteredMenu()`. Rendered in `DashboardLayout` sidebar (fixed on desktop, drawer on mobile).

### 3.1 Sidebar Menu — ORG Mode

| ID | Item | Route | Roles | Children |
|----|------|-------|-------|----------|
| NAV-01 | Dashboard | `dashboard` | All | — |
| NAV-02 | Org Info | `org-info` | All (route gated to Owner) | — |
| NAV-03 | Users | `users` | Owner | — |
| NAV-04 | Branches | `branches` | Owner | — |
| NAV-05 | Master | — | All ORG (routes gated to Owner) | Master Data (`master/data`), Payment Terms (`master/payment-terms`) |
| NAV-06 | Funds | — | All ORG (routes gated to Owner) | Investments, Ledger Balances, Expenses |
| NAV-07 | Reports | `reports` | All except BranchAdmin (route gated to Owner) | — |

### 3.2 Sidebar Menu — BRANCH Mode

| ID | Item | Route | Roles |
|----|------|-------|-------|
| NAV-08 | Dashboard | `dashboard` | All |
| NAV-09 | Centers | `centers` | All except BranchAdmin |
| NAV-10 | POCs | `pocs` | All except BranchAdmin |
| NAV-11 | Staff | `staff` | Owner (BranchAdmin both included and excluded → effectively Owner) |
| NAV-12 | Members | `members` | All except BranchAdmin |
| NAV-13 | Loans (group) | Add Loan (`loans/add`), Manage Loan (`loans/manage`) | All except BranchAdmin |
| NAV-14 | Recovery Posting | `recovery-posting` | All except BranchAdmin |

### 3.3 Non-Menu Navigation Paths

| ID | From → To | Trigger |
|----|-----------|---------|
| NAV-20 | Branches → branch context (`/`) | "Navigate" row action → `authService.navigateToBranch()` |
| NAV-21 | Branch header → ORG context | "Back to Org" button (Owner in BRANCH) → `authService.navigateToOrg()` |
| NAV-22 | Ledger Balances → `/ledger-transactions/:userId` | "Open Transactions" row action |
| NAV-23 | Manage Loans → `/loans/:loanId/scheduler` | "View Schedule" row action |
| NAV-24 | Manage Loans → `/loans/:loanId/prepayment` | "Modify" row action |
| NAV-25 | Add Loan / Member List → `/loans/:loanId/scheduler` | "View Loan" (member has `primaryOpenLoanId`) |
| NAV-26 | Header → `/login` | "Log out" → `resetAppState()` |

---

## 4. Components

### 4.1 Shell & Shared

| ID | Component | File | Purpose |
|----|-----------|------|---------|
| CMP-01 | `DashboardLayout` | `src/components/DashboardLayout.tsx` | App shell: sidebar (org/branch identity + filtered menu), sticky header (mode badge, user name, Back to Org, Log out), `<Outlet/>`. |
| CMP-02 | `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Auth + mode/role route guard. |
| CMP-03 | `LoginForm` | `src/components/LoginForm.tsx` | Login form with dual-mode login fallback. |
| CMP-04 | `PageHeader` | `src/components/layout/PageHeader.tsx` | Page title + description + action buttons + toolbar slot; responsive stacking. |
| CMP-05 | `Button` | `src/components/ui/button.tsx` | shadcn-style CVA button (variants: default/destructive/outline/secondary/ghost/link; sizes incl. icon). |

### 4.2 Dashboard Components

| ID | Component | File | Purpose |
|----|-----------|------|---------|
| CMP-06 | `SummaryMetricCard` | `src/components/dashboard/SummaryMetricCard.tsx` | KPI card (ORG dashboard). |
| CMP-07 | `SummaryDataTable` | `src/components/dashboard/SummaryDataTable.tsx` | "Financial Insights" INR card grid (9 metrics). |
| CMP-08 | `HorizontalBarChart` | `src/components/dashboard/HorizontalBarChart.tsx` | Collections vs Capital bar chart. |
| CMP-09 | `SegmentedToggle` | `src/components/dashboard/SegmentedToggle.tsx` | Toggle control (chart mode, Today/Tomorrow, My View/Staff Schedules). |
| CMP-10 | `StaffSchedulesReportPanel` | `src/components/dashboard/StaffSchedulesReportPanel.tsx` | Owner-only branch dashboard: staff → POC → member nested schedule tables. |

### 4.3 Member Components

| ID | Component | File | Purpose |
|----|-----------|------|---------|
| CMP-11 | `MemberGrid` | `src/components/members/MemberGrid.tsx` | Member data grid with Edit / Inactive / Add-View Loan / PN / MF print actions. |
| CMP-12 | `MemberCreateConfirmationDialog` | `src/components/members/MemberCreateConfirmationDialog.tsx` | Step-2 preview/confirm for member create/edit (changed-field highlighting). |
| CMP-13 | member-preview-utils | `src/components/members/member-preview-utils.ts` | Preview/diff helpers for CMP-12. |

### 4.4 Table Infrastructure

| ID | Component/Module | File | Purpose |
|----|------------------|------|---------|
| CMP-14 | `HiddenColumnsDetailPanel` | `src/components/table/HiddenColumnsDetailPanel.tsx` | Expand-row panel rendering columns hidden at current breakpoint. |
| CMP-15 | `useResponsiveTable` / `useStandardTableOptions` | `src/lib/responsive/useResponsiveTable.ts` | Breakpoint-aware column visibility + detail panels for all MRT tables. |
| CMP-16 | `tableVisibility` | `src/lib/responsive/tableVisibility.ts` | Per-breakpoint hidden-column maps for 23 table keys. |
| CMP-17 | `useBreakpoint` / `breakpoints` | `src/lib/responsive/` | Mobile <768 / tablet 768–1023 / desktop ≥1024. |
| CMP-18 | `dialogClasses` | `src/lib/responsive/dialogClasses.ts` | Shared responsive `<dialog>` shell classes (sm/md/lg/xl). |

### 4.5 Libraries & Utilities

| ID | Module | File | Purpose |
|----|--------|------|---------|
| CMP-19 | Auth lib | `src/lib/auth/*` (`api-client`, `jwt`, `sync`, `broadcast`, `redirect`, `reset-app-state`, `login-errors`, `constants`) | Axios interceptors, JWT expiry, multi-tab session sync, logout/reset. |
| CMP-20 | `api` registry | `src/lib/api.ts` | Central endpoint URL builder from `VITE_API_URL`. |
| CMP-21 | `authz` | `src/lib/authz.ts` | Role/mode normalization. |
| CMP-22 | `apiErrorHandler` | `src/lib/apiErrorHandler.ts` | API error → user message mapping. |
| CMP-23 | `date-time` | `src/lib/date-time.ts` | Date formatting helpers. |
| CMP-24 | Calculation modules | `src/pages/loan/prepaymentCalculations.ts`, `src/pages/recoveryPosting/recoveryPostingCalculations.ts` | EMI split, status derivation, posting validation. |
| CMP-25 | Document templates | `src/templates/membershipFormTemplate.ts`, `src/templates/promissoryNoteTemplate.ts` | Printable bilingual HTML documents (membership form, promissory note). |
| CMP-26 | Type definitions | `src/types/*` (20 files) | API/domain contracts: auth, branch, center, dashboard, investment, ledger, loan, loanScheduler, masterLookup, member, menu, paymentTerm, poc, report, searchMember, staff, user. |

Dialog and form components are indexed in [Section 6](#6-forms--dialogs); list pages in [Section 7](#7-tables--data-grids).

---

## 5. APIs (Services & Endpoints)

Base URL: `{VITE_API_URL}`. Authenticated calls use `apiClient` (axios) which injects `Authorization: Bearer` + `X-Client-TimeZone` and performs one automatic token-refresh retry on 401. Login/refresh/logout use plain axios (no interceptors). 64 endpoint functions across 19 services.

### API-01 Auth — `src/services/auth.service.ts`

| Method | Endpoint | Function | Purpose |
|--------|----------|----------|---------|
| POST | `/auth/login` | `login` | Authenticate (ORG/BRANCH mode hint); persist session to localStorage |
| POST | `/auth/refresh` | `refresh` | Exchange refresh token |
| POST | `/auth/navigate-to-branch?branchId={id}` | `navigateToBranch` | Switch session to branch context |
| POST | `/auth/navigate-to-org` | `navigateToOrg` | Switch back to org context |
| POST | `/auth/logout` | `logout` | Revoke refresh token, clear session |

### API-02 Branches — `src/services/branch.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/branches` | `getBranches` |
| POST | `/branches` | `createBranch` |
| PUT | `/branches/{id}` | `updateBranch` |
| DELETE | `/branches/{id}/inactive` | `setInactive` |

### API-03 Centers — `src/services/center.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/center` | `getCenters` |
| POST | `/center` | `createCenter` |
| PUT | `/center/{id}` | `updateCenter` |
| DELETE | `/center/{id}/inactive` | `setInactive` |

### API-04 Dashboard — `src/services/dashboard.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/report/summary` | `getSummary` — org/branch financial summary |

### API-05 Investments — `src/services/investment.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/investments` | `getInvestments` |
| POST | `/investments` | `createInvestment` |

### API-06 Ledger Balances — `src/services/ledgerBalance.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/ledger-balances` | `getLedgerBalances` |
| POST | `/ledger-balances/Fund-Transfer` | `createFundTransfer` |

### API-07 Ledger Transactions — `src/services/ledgerTransaction.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/ledger-transactions/Expenses` | `getExpenses` |
| GET | `/ledger-transactions/User-Transactions/{userId}` | `getTransactions` |
| POST | `/ledger-transactions/Add-Expense` | `createExpense` |

### API-08 Loans — `src/services/loan.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/loans` | `getLoans` |
| GET | `/loans/ActiveLoans` | `getActiveLoans` |
| GET | `/loans/memberId/{memberId}` | `getLoanByMemId` |
| POST | `/loans/add-loan` | `addLoan` |
| POST | `/loans/{loanId}/status` | `updateLoanStatus` |
| POST | `/loans/{loanId}/claim` | `claimLoan` |
| PUT | `/loans/{loanId}/close` | *(called directly from `LoanPrepayment.tsx` via `api.loans.close`)* |

### API-09 Loan Scheduler — `src/services/loanScheduler.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/LoanSchedulers/{loanId}` | `fetchLoanSchedulerList` — EMI rows for a loan |

### API-10 Master Lookups — `src/services/masterLookup.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/masterLookups` | `getMasterLookups` |
| GET | `/masterLookups?lookupKey={key}` | `getMasterLookupsByKey` |
| GET | `/masterLookups/keys` | `getLookupKeys` |
| POST | `/masterLookups` | `createMasterLookup` |
| PUT | `/masterLookups/{id}` | `updateMasterLookup` |
| DELETE | `/masterLookups/{id}/inactive` | `setInactive` |

### API-11 Members — `src/services/member.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/Member/by-branch/{branchId}` | `getByBranch` |
| POST | `/Member` | `createMember` |
| PUT | `/Member/{id}` | `updateMember` |
| DELETE | `/Member/{id}/inactive` | `setInactive` |

### API-12 Member Fees — `src/services/memberFee.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/MemberMembershipFees` | `createFee` — joining/membership fee |

### API-13 Payment Terms — `src/services/paymentTerm.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/paymentTerm` | `getPaymentTerms` |
| POST | `/paymentTerm` | `createPaymentTerm` |
| PUT | `/paymentTerm/{id}` | `updatePaymentTerm` |
| DELETE | `/paymentTerm/{id}` | `deletePaymentTerm` |

### API-14 POCs — `src/services/poc.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/POC/branch/{branchId}` | `getByBranch` |
| GET | `/POC/{id}` | `getByid` |
| POST | `/POC` | `createPoc` |
| PUT | `/POC/{id}` | `updatePoc` |
| DELETE | `/POC/{id}/inactive` | `setInactive` |

### API-15 Recovery / Prepayment — `src/services/prepayment.service.ts` + `src/pages/recoveryPosting/recoveryPostingData.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/RecoveryPosting/schedulers?scheduleDate=&centerId=&pocId=` | `fetchRecoveryPostingSchedulers` |
| POST | `/RecoveryPosting/post` | `postPrepaymentRecoveries` / `postRecoveryPosting` |

### API-16 Reports — `src/services/report.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/Report/pocs-by-branch/{branchId}` | `getPocsByBranch` |
| GET | `/Report/members-by-poc/{branchId}/{pocId}` | `getMembersByPoc` |
| POST | `/Report/members-by-pocs/{branchId}` | `getMembersByPocs` |
| GET | `/Report/poc-collection-staff-by-branch/{branchId}` | `getPocCollectionStaffByBranch` |
| GET | `/Report/staff-schedules-by-branch/{branchId}` | `getStaffSchedulesByBranch` |
| GET | `/Report/MemberWiseCollectionSheet` | `getMemeberWiseCollectionReport` (blob → `.xlsx` download) |

### API-17 Member Search — `src/services/searchMemeberAddLoan.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| POST | `/member/by-branch/search-member` | `getmembers` — name search for add-loan flow |

### API-18 Staff — `src/services/staff.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/Users/branch` | `getStaffs` |
| POST | `/users` | `createStaff` |
| PUT | `/users/{id}` | `updateStaff` |
| POST | `/users/{id}/reset-password` | `resetPassword` |
| DELETE | `/users/{id}/inactive` | `setInactive` |

### API-19 Users — `src/services/user.service.ts`

| Method | Endpoint | Function |
|--------|----------|----------|
| GET | `/Users/Org` | `getUsers` |
| GET | `/Users/investors` | `getInvestors` |
| GET | `/users/collected-by` | `getCollectedByUsers` |
| POST | `/users` | `createUser` |
| PUT | `/users/{id}` | `updateUser` |
| POST | `/users/{id}/reset-password` | `resetPassword` |
| DELETE | `/users/{id}/inactive` | `setInactive` |

---

## 6. Forms & Dialogs

Most data-entry dialogs use native `<dialog>` + react-hook-form + Zod. 27 forms/dialogs total.

### 6.1 Data-Entry Forms

| ID | Form | File | Purpose | Key Fields | Notable Validation | Submits To |
|----|------|------|---------|------------|--------------------|------------|
| FRM-01 | LoginForm | `src/components/LoginForm.tsx` | Sign in | email, password | email format; password ≥ 6 | API-01 `login` (ORG→BRANCH fallback) |
| FRM-02 | AddEditBranchDialog | `src/pages/branches/AddEditBranchDialog.tsx` | Branch create/edit | name, address1/2, city, state (lookup), country, zipcode, phone | 6-digit zip; phone `^[6-9]\d{9}$` | API-02 |
| FRM-03 | AddEditCenterDialog | `src/pages/center/AddEditCenterDialog.tsx` | Center create/edit | name, address, city | required + max lengths | API-03 |
| FRM-04 | AddExpenseDialog | `src/pages/Expenses/AddExpenseDialog.tsx` | Add expense | paidFromUser, amount, paymentDate, createdDate, comments | amount > 0; comments ≥ 2 chars | API-07 `createExpense` |
| FRM-05 | AddInvestmentDialog | `src/pages/Investments/AddInvestmentDialog.tsx` | Add investment | investor, amount, investmentDate, createdDate | amount > 0 | API-05 `createInvestment` |
| FRM-06 | FundTransferDialog | `src/pages/ledgerBalances/FundTransferDialog.tsx` | Fund transfer | fromUser, toUser, amount, paymentDate, createdDate, comments | from ≠ to (refine); amount > 0 | API-06 `createFundTransfer` |
| FRM-07 | AddLoanDialog | `src/pages/loan/AddLoanDialog.tsx` | Loan origination | loanAmount, paymentTerm, disbursementDate, collectionStartDate, savingAmount + computed (interest, fees, total, terms) | collectionStart ≥ disbursement; weekday must match POC collection day; EMI preview | API-08 `addLoan` |
| FRM-08 | AddEditPaymentTerm | `src/pages/Master/AddEditPaymentTerm.tsx` | Payment term create/edit | paymentTerm (lookup), paymentType, noOfTerms, processingFee, rateOfInterest, insuranceFee | noOfTerms ≥ 1; fees ≥ 0 | API-13 |
| FRM-09 | AddMasterLookupDialog | `src/pages/Master/AddMasterLookupDialog.tsx` | Lookup create/edit | lookupKey, lookupCode, lookupValue, numericValue, sortOrder, description | required keys; sortOrder int ≥ 0 | API-10 |
| FRM-10 | AddEditMemberDialog | `src/pages/members/AddEditMemberDialog.tsx` | Member create/edit | center+POC, personal (names, DOB, phones, Aadhaar), address, guardian, joining fee (add only) | age ≥ 18 (member & guardian); Aadhaar 12 digits; conditional joining-fee block; relationship "Other" branch | API-11 + API-12 (via FRM-11 confirm) |
| FRM-11 | MemberCreateConfirmationDialog | `src/components/members/MemberCreateConfirmationDialog.tsx` | Step-2 preview/confirm | confirm checkbox | confirm required; changed-field highlight (edit) | triggers FRM-10 submit |
| FRM-12 | AddEditPocDialog | `src/pages/pocs/AddEditPocDialog.tsx` | POC create/edit | names, phones, address, center, collectionFrequency, collectionDay, collectionBy | phone format; collection fields required | API-14 |
| FRM-13 | AddEditStaffDialog | `src/pages/staff/AddEditStaffDialog.tsx` | Staff create/edit | names, email, phone, role (Staff/BranchAdmin), password+confirm (create only), address | strong-password regex (8+, upper/lower/digit/special); duplicate email → field error | API-18 |
| FRM-14 | AddEditUserDialog | `src/pages/users/AddEditUserDialog.tsx` | Org user create/edit | names, email, phone, role (Owner/Investor), password+confirm (create only), address, hidden `level` | strong-password regex on create | API-19 |
| FRM-15 | ResetPasswordDialog (User) | inline in `UserList.tsx` | Reset password | password, confirm | strong-password regex; match | API-19 `resetPassword` |
| FRM-16 | ResetPasswordDialog (Staff) | inline in `StaffList.tsx` | Reset password | password, confirm | same | API-18 `resetPassword` |

### 6.2 Confirmation Dialogs (Set Inactive / Delete)

| ID | Entity | Host File | API Call |
|----|--------|-----------|----------|
| FRM-17 | Branch | `BranchList.tsx` | API-02 `setInactive` |
| FRM-18 | Center | `CenterList.tsx` | API-03 `setInactive` |
| FRM-19 | Master Lookup | `MasterLookupList.tsx` | API-10 `setInactive` |
| FRM-20 | Payment Term | `PaymentTermList.tsx` | API-13 `deletePaymentTerm` |
| FRM-21 | Member | `MemberList.tsx` | API-11 `setInactive` |
| FRM-22 | POC | `PocList.tsx` | API-14 `setInactive` |
| FRM-23 | Staff | `StaffList.tsx` | API-18 `setInactive` |
| FRM-24 | User | `UserList.tsx` | API-19 `setInactive` |

### 6.3 Inline / Table-Embedded Forms (not RHF/Zod)

| ID | Form | File | Description |
|----|------|------|-------------|
| FRM-25 | Add Loan member search | `src/pages/loan/AddLoan.tsx` | First/middle/last name filters driving live member search. |
| FRM-26 | Loan Prepayment editor | `src/pages/loan/LoanPrepayment.tsx` | Per-row payment amount/mode/comments + loan status select; nested modals: bulk-apply, close confirm, claim confirm, close success. Imperative sequential-EMI validation. |
| FRM-27 | Recovery Posting editor | `src/pages/recoveryPosting/RecoveryPostingList.tsx` | Filter bar (date, center, POC, collectedBy) + per-row payment/principal/interest/status/mode/comments. Validation in `recoveryPostingCalculations.ts`. |

---

## 7. Tables & Data Grids

All interactive grids use Material React Table with client-side pagination, the shared responsive column-visibility system (CMP-15/16), and hidden-column detail panels on mobile/tablet. 21 MRT tables + 1 card grid + 1 download page.

### 7.1 CRUD List Tables

| ID | Table | Page | Entity | Row Actions | Toolbar |
|----|-------|------|--------|-------------|---------|
| TBL-01 | Branches | PG-04 | Branch | Edit, Inactive, **Navigate** (enter branch) | ADD Branch |
| TBL-02 | Centers | PG-12 | Center | Edit, Inactive | ADD Center |
| TBL-03 | Expenses | PG-09 | Ledger transaction | — | ADD Expense |
| TBL-04 | Investments | PG-07 | Investment | — | ADD Investment |
| TBL-05 | Ledger Balances | PG-08 | Ledger balance | Open Transactions → PG-10 | Create Fund Transfer |
| TBL-06 | User Ledger Transactions | PG-10 | Ledger transaction | — (read-only, sorted createdDate desc, pageSize 20) | Back to Ledgers |
| TBL-07 | Master Lookups | PG-05 | MasterLookup | Edit, Inactive | Add LookUp |
| TBL-08 | Payment Terms | PG-06 | PaymentTerm | Edit, Inactive | Add Payment Term |
| TBL-09 | Members (`MemberGrid`) | PG-15 | Member | Edit, Inactive, Add/View Loan, **PN** print, **MF** print | Add Member |
| TBL-10 | POCs | PG-13 | POC | Edit, Inactive | Add POC |
| TBL-11 | Staff | PG-14 | Staff user | Edit, Reset Password, Inactive | ADD STAFF |
| TBL-12 | Users | PG-02 | Org user (Owner/Investor) | Edit, Reset Password, Inactive | ADD USER |

### 7.2 Loan Workflow Tables

| ID | Table | Page | Entity | Key Features |
|----|-------|------|--------|--------------|
| TBL-13 | Add Loan member search | PG-16 | SearchMember | Name filters; View Loan / Add Loan per row |
| TBL-14 | Manage Loans | PG-17 | Loan | Status, amounts, paid/total terms; View Schedule / Modify |
| TBL-15 | Loan Scheduler | PG-18 | LoanScheduler row | Read-only EMI rows, status badges, summary cards |
| TBL-16 | Loan Prepayment | PG-19 | Prepayment row | Row selection + inline editing, bulk apply, claim/close flows, pageSize 20 |
| TBL-17 | Recovery Posting | PG-20 | RecoveryPosting row | Date/center/POC pre-filters, row selection auto-fill, inline editing, post validation, pageSize 20 |

### 7.3 Dashboard / Report Tables

| ID | Table | Host | Entity | Features |
|----|-------|------|--------|----------|
| TBL-18 | Financial Insights (card grid, non-MRT) | PG-01 ORG (`SummaryDataTable`) | Dashboard summary | 9 read-only INR metric cards |
| TBL-19 | POC Schedules | PG-01 BRANCH | POC summary | Today/Tomorrow toggle, global search, expand → TBL-20 |
| TBL-20 | POC Member Detail (nested) | PG-01 BRANCH | Member EMI line | Search, status/due badges |
| TBL-21 | Staff Schedules | CMP-10 | Staff summary | Owner-only; expand → TBL-22 |
| TBL-22 | Staff → POC Detail (nested) | CMP-10 | POC summary | Expand → TBL-23 |
| TBL-23 | Staff → POC → Member Lines (nested) | CMP-10 | Schedule line | Member search |

### 7.4 Non-Table List Page

| ID | Page | Description |
|----|------|-------------|
| TBL-24 | Reports (PG-11) | Card with "Member Wise Collection Sheet" → Download Report (`.xlsx` blob). |

---

## 8. Workflows

### WF-01 Authentication & Session

`/login` → FRM-01 → API-01 `login` (mode `ORG`; on `BRANCH_MODE_REQUIRED` retry with `BRANCH`) → session persisted to localStorage → redirect to origin/`/dashboard`.
- JWT expiry checked client-side; 401 triggers single auto-refresh + retry; failure → full app-state reset + "session expired" toast.
- Multi-tab sync via `storage` events + `BroadcastChannel` (`mcs-auth`): logout/session updates propagate across tabs.
- Logout: server-side refresh-token revoke (best-effort) → clear session → broadcast → `/login`.

### WF-02 ORG ↔ BRANCH Context Switching

Owner in ORG → Branches (PG-04) → "Navigate" → API-01 `navigateToBranch` → new BRANCH session + query-cache reset → branch dashboard. Reverse via header "Back to Org" → `navigateToOrg`. Sidebar menu and route guards re-evaluate on each switch.

### WF-03 Member Onboarding

PG-15 → FRM-10 (center/POC assignment, personal, address, guardian, joining fee) → FRM-11 preview + confirm checkbox → API-11 `createMember` → API-12 `createFee` (joining fee). Edit path diff-highlights changes and blocks no-op saves. Roles: BRANCH Owner/Staff.

### WF-04 Loan Origination

PG-16 (or PG-15 shortcut) → search members (API-17, returns `primaryOpenLoanId`) → member without open loan → FRM-07: pick payment term → auto-compute interest/fees/total/terms + EMI preview → validate collection start (≥ disbursement; weekday = POC collection day) → API-08 `addLoan`. Members with open loans get "View Loan" → PG-18 instead.

### WF-05 Loan Servicing & Lifecycle

- **Portfolio:** PG-17 (active loans, status, paid/total terms) → View Schedule (PG-18) or Modify (PG-19).
- **Loan statuses:** `Pending → Active` (manual, PG-19) → `Closed` (full payoff) or `Claimed` (insurance/default claim, API-08 `claimLoan`).
- **Installment statuses:** Not Paid → Paid / Partial Paid / Overdue / Claimed.
- **Modify Loan (PG-19):** select EMI rows → edit payment (auto principal/interest split) → post via API-15; sequential-EMI rules (no skipping earlier unpaid); Overdue rows locked here (handled in WF-06). Full closure = all closable rows fully paid → post (`skipLedgerTransaction`) + `PUT /loans/{id}/close`.

### WF-06 Recovery Posting (Daily Collections)

PG-20: filter by schedule date/center/POC (API-15 `schedulers`) → choose Collected By → select rows (auto-fill full EMI, or Overdue for past dates) → adjust payment/principal/interest/mode/status → validation (sequential EMIs, payment = principal + interest, ≤ EMI, mode required) → API-15 `post`. Requires branch context.

### WF-07 Fund Management (ORG Owner)

- **Investments:** PG-07 + FRM-05 → API-05 (investor capital in).
- **Ledger balances & transfers:** PG-08 + FRM-06 → API-06; per-user drill-down PG-10.
- **Expenses:** PG-09 + FRM-04 → API-07.
- Collections/disbursements flow into ledgers automatically from loan workflows.

### WF-08 Administration

- **Users (ORG):** PG-02 + FRM-14/15/24 — Owner/Investor accounts, password resets, deactivation.
- **Staff (BRANCH):** PG-14 + FRM-13/16/23 — Staff/BranchAdmin accounts.
- **Branches:** PG-04 + FRM-02/17. **Centers:** PG-12 + FRM-03/18. **POCs:** PG-13 + FRM-12/22 (collection day/frequency drive loan validation).
- **Master data:** PG-05/PG-06 + FRM-08/09 — lookups (states, payment modes, relationships, PAYMENT_TERM keys) and payment-term templates consumed across forms.

### WF-09 Document Generation

TBL-09 row actions → popup window with template HTML → browser print-to-PDF:
- **MF** — `membershipFormTemplate.ts`: bilingual membership application form.
- **PN** — `promissoryNoteTemplate.ts`: Telugu/English promissory note.
No server-side PDF; requires popups enabled.

### WF-10 Reporting & Dashboards

- **ORG dashboard (PG-01):** API-04 summary → KPI cards, Financial Insights grid (TBL-18), Collections/Capital chart.
- **BRANCH dashboard (PG-01):** Today/Tomorrow POC schedule tables (TBL-19/20); Owner extra "Staff Schedules" view (TBL-21–23). Via API-16 report endpoints.
- **Reports page (PG-11):** Member Wise Collection Sheet `.xlsx` download.

---

## 9. Cross-Cutting Architecture

| Concern | Approach |
|---------|----------|
| Server state | TanStack React Query; cache cleared on login/logout/context switch; invalidation after mutations |
| Session | `localStorage` (`AUTH_STORAGE_KEY`), JWT + refresh token, multi-tab sync |
| HTTP | `apiClient` axios instance — Bearer + timezone headers, single 401 refresh-retry; plain axios for auth endpoints |
| Forms | react-hook-form + Zod resolvers (data-entry); imperative validation for table-embedded editors |
| Tables | Material React Table + shared responsive visibility maps (23 table keys) + expand-row detail panels |
| Responsive | Breakpoints: mobile <768 / tablet 768–1023 / desktop ≥1024; sidebar → drawer; shortened action labels; dialog size classes |
| Styling | Tailwind CSS + shadcn-style `Button` (CVA); MUI for Autocomplete/table internals |
| Notifications | react-hot-toast (success/error/session-expiry) |
| Env config | `VITE_API_URL` via `.env[.development/.production/.test/.uat]`; `scripts/ensure-env.js` guard |
| i18n in documents | Bilingual (Telugu/English) print templates |

---

## 10. Planned Detailed Documentation Set

Suggested follow-up documents, each expanding this index:

| Doc | Scope | Source Sections |
|-----|-------|-----------------|
| `docs/ui-ux/01-auth-and-navigation.md` | Login, session, layout shell, sidebar/header, context switching | §1, §3, WF-01/02 |
| `docs/ui-ux/02-dashboards.md` | ORG + BRANCH dashboards, KPIs, charts, schedule tables | PG-01, TBL-18–23, WF-10 |
| `docs/ui-ux/03-administration.md` | Users, Staff, Branches, Centers, POCs, Master data | PG-02–06, 12–14, WF-08 |
| `docs/ui-ux/04-members.md` | Member list, onboarding wizard, documents | PG-15, FRM-10/11, WF-03/09 |
| `docs/ui-ux/05-loans.md` | Origination, manage, scheduler, prepayment/closure | PG-16–19, WF-04/05 |
| `docs/ui-ux/06-collections.md` | Recovery posting workflow | PG-20, FRM-27, WF-06 |
| `docs/ui-ux/07-funds-and-reports.md` | Investments, ledgers, expenses, reports | PG-07–11, WF-07/10 |
| `docs/ui-ux/08-design-system.md` | Buttons, dialogs, tables, responsive patterns, validation conventions | §4, §9 |
