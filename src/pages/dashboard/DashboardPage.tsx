import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Link } from "react-router-dom"
import { useIsFetching, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  RefreshCw,
  IndianRupee,
  Wallet,
  TrendingUp,
  HandCoins,
  Landmark,
  AlertCircle,
  UserCheck,
  CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getBranch, getSession } from "@/services/auth.service"
import { getNormalizedSessionMeta } from "@/lib/authz"
import { reportService } from "@/services/report.service"
import { dashboardService } from "@/services/dashboard.service"
import type { PocBranchReportRow } from "@/types/report"
import type { DashboardChartItem } from "@/types/dashboard"
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard"
import { HorizontalBarChart } from "@/components/dashboard/HorizontalBarChart"
import { SummaryDataTable } from "@/components/dashboard/SummaryDataTable"
import { SegmentedToggle, type SegmentedToggleOption } from "@/components/dashboard/SegmentedToggle"
import { StaffSchedulesReportPanel } from "@/components/dashboard/StaffSchedulesReportPanel"
import { UserLedgerDashboardPanel } from "@/components/dashboard/UserLedgerDashboardPanel"
import {
  PendingPaidScheduleGrids,
  type DashboardScheduleLine,
} from "@/components/dashboard/PendingPaidScheduleGrids"
import { DateInput } from "@/components/date"
import { formatOrgModeDateHighlight } from "@/lib/date-time"
import {
  isOverdueSchedulerStatus,
  summarizeScheduleAmounts,
} from "@/lib/dashboard/report-status-totals"

const EMPTY_POCS: PocBranchReportRow[] = []

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data && typeof data === "object") {
    const obj = data as { message?: string; error?: string; title?: string }
    return obj.message ?? obj.error ?? obj.title ?? fallback
  }
  return fallback
}

function formatInr(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Calendar day in local timezone YYYY-MM-DD */
function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function todayDateKey(): string {
  return localDateKey(new Date())
}

function scheduleDateKey(scheduleIsoOrKey: string | null): string | null {
  if (!scheduleIsoOrKey) return null
  const s = scheduleIsoOrKey.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

/** Isolated so the rest of the dashboard does not re-render every minute tick. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 [caret-color:transparent]">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

function OrgModeDateHighlight() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const dateTimePart = formatOrgModeDateHighlight(now)

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
      <span className="text-sm font-semibold text-primary">{dateTimePart}</span>
    </div>
  )
}

/** Org mode: simple home — branch POC report is only shown in Branch mode after opening a branch. */
function OrgDashboardHome() {
  const [chartView, setChartView] = useState<"collections" | "capital">("collections")
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: dashboardService.getSummary,
  })

  const hasNoData = useMemo(() => {
    if (!data) return false
    const values = Object.values(data)
    return values.every((v) => typeof v === "number" && v === 0)
  }, [data])

  const netIncome = useMemo(() => {
    if (!data) return 0
    // Net Income = Received Interest + Joining Fee + Processing Fee - Expenses
    const income = data.receivedInterest + data.totalJoiningFee + data.totalProcessingFee
    const expenses = data.totalExpenseAmount
    return income - expenses
  }, [data])

  const cashInHand = useMemo(() => {
    if (!data) return 0
    return (
      data.totalOwnerAmount +
      data.totalInvestorAmount +
      data.receivedPrinciple +
      data.receivedInterest +
      data.totalJoiningFee +
      data.totalProcessingFee -
      data.totalExpenseAmount
    )
  }, [data])

  const chartItems = useMemo<DashboardChartItem[]>(() => {
    if (!data) return []
    if (chartView === "collections") {
      return [
        { label: "Received Principle", value: data.receivedPrinciple },
        { label: "Received Interest", value: data.receivedInterest },
        { label: "Joining Fee", value: data.totalJoiningFee },
        { label: "Processing Fee", value: data.totalProcessingFee },
        { label: "Expenses", value: data.totalExpenseAmount },
      ]
    }
    return [
      { label: "Owner Amount", value: data.totalOwnerAmount },
      { label: "Investor Amount", value: data.totalInvestorAmount },
      { label: "Insurance", value: data.totalInsuranceAmount },
      { label: "Claimed Amount", value: data.totalClaimedAmount },
      { label: "Outstanding Principle", value: data.outstandingPrinciple },
      { label: "Interest Accrued", value: data.interestAccured },
    ]
  }, [data, chartView])

  const errorMessage = useMemo(
    () => (error ? getApiErrorMessage(error, "Failed to load dashboard summary.") : ""),
    [error]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Org Dashboard</h1>
          <OrgModeDateHighlight />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">{errorMessage}</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetricCard
              title="Remittance (Owner)"
              value={formatInr(data?.totalOwnerAmount ?? 0)}
              icon={Landmark}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Credit (Investor)"
              value={formatInr(data?.totalInvestorAmount ?? 0)}
              icon={Wallet}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Insurance"
              value={formatInr(data?.totalInsuranceAmount ?? 0)}
              icon={IndianRupee}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Claimed Amount"
              value={formatInr(data?.totalClaimedAmount ?? 0)}
              icon={IndianRupee}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Net Income"
              value={formatInr(netIncome)}
              icon={TrendingUp}
              loading={isLoading}
            />
            <SummaryMetricCard
              title="Cash In Hand"
              value={formatInr(cashInHand)}
              icon={HandCoins}
              loading={isLoading}
            />
          </div>

          {hasNoData && !isLoading ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No summary data is available yet.
            </div>
          ) : (
            <>
              {data ? <SummaryDataTable data={data} /> : null}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Financial Breakdown</h3>
                  <SegmentedToggle
                    value={chartView}
                    onChange={setChartView}
                    ariaLabel="Financial breakdown view"
                    buttonClassName="min-w-0 py-1 font-medium"
                    options={[
                      { value: "collections", label: "Collections" },
                      { value: "capital", label: "Capital" },
                    ]}
                  />
                </div>
                <HorizontalBarChart
                  title="Distribution Chart"
                  items={chartItems}
                  emptyMessage="No chart data to display."
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function MyViewBranchReportSection({
  branchId,
  selectedDateKey,
}: {
  branchId: number
  selectedDateKey: string
}) {
  const activeScheduleDateKey = selectedDateKey
  const sessionUserId = getSession()?.userId ?? 0

  const {
    data: collectionReport,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reportMyCollectionSchedules", branchId, sessionUserId, selectedDateKey],
    queryFn: () => reportService.getMyCollectionSchedules(branchId, selectedDateKey),
    enabled: sessionUserId > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const pocs = collectionReport?.pocs ?? EMPTY_POCS
  const members = collectionReport?.members ?? []

  const filteredMembers = useMemo(() => {
    if (isFetching) return members
    return members.filter(
      (m) =>
        scheduleDateKey(m.scheduleDate) === activeScheduleDateKey ||
        isOverdueSchedulerStatus(m.loanSchedulerStatus)
    )
  }, [members, activeScheduleDateKey, isFetching])

  const scheduleLines = useMemo<DashboardScheduleLine[]>(() => {
    const pocById = new Map(pocs.map((p) => [p.pocId, p]))
    return filteredMembers.map((m, index) => {
      const poc = pocById.get(m.pocId)
      return {
        id: `${m.memberId}-${m.scheduleDate ?? ""}-${m.paymentDate ?? ""}-${index}`,
        memberId: m.memberId,
        memberCode: m.memberCode,
        memberName: m.memberName,
        pocId: m.pocId,
        pocName: poc?.pocName || "—",
        centerName: poc?.centerName || "—",
        scheduleDate: m.scheduleDate,
        paymentDate: m.paymentDate,
        emiAmount: m.actualEmi,
        paidAmount: m.paidAmount,
        loanSchedulerStatus: m.loanSchedulerStatus,
      }
    })
  }, [filteredMembers, pocs])

  const amountSummary = useMemo(() => summarizeScheduleAmounts(scheduleLines), [scheduleLines])
  const totalPocs = useMemo(
    () => new Set(filteredMembers.map((m) => m.pocId)).size,
    [filteredMembers]
  )
  const totalMembers = useMemo(
    () => new Set(filteredMembers.map((m) => m.memberId)).size,
    [filteredMembers]
  )

  useEffect(() => {
    if (isError && error) {
      toast.error(getApiErrorMessage(error, "Failed to load your collection schedules"))
    }
  }, [isError, error])

  if (sessionUserId <= 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Could not determine the logged-in user. Sign in again to view your schedules.
      </div>
    )
  }

  if (isLoading && collectionReport === undefined) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">Could not load your collection schedules.</p>
        <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SummaryMetricCard
          title="POCs / Members"
          value={`${totalPocs} / ${totalMembers}`}
          icon={UserCheck}
          loading={isLoading || isFetching}
          compact
        />
        <SummaryMetricCard
          title="Total schedule / Pending Amount"
          value={`${formatInr(amountSummary.scheduleTotal)} / ${formatInr(amountSummary.pendingTotal)}`}
          icon={IndianRupee}
          loading={isLoading || isFetching}
          compact
        />
        <SummaryMetricCard
          title="Total overdue amount"
          value={formatInr(amountSummary.overdueTotal)}
          icon={AlertCircle}
          loading={isLoading || isFetching}
          compact
        />
        <SummaryMetricCard
          title="Total Collected Amount"
          value={formatInr(amountSummary.collectedTotal)}
          icon={HandCoins}
          loading={isLoading || isFetching}
          compact
        />
        <SummaryMetricCard
          title="Total Pre/Post collected amount"
          value={`${formatInr(amountSummary.preCollected)} / ${formatInr(amountSummary.postCollected)}`}
          icon={CalendarClock}
          loading={isLoading || isFetching}
          compact
        />
      </div>
      <PendingPaidScheduleGrids
        rows={scheduleLines}
        isLoading={isLoading || isFetching}
      />
    </div>
  )
}

/** Static empty state — no hooks so parent can branch before mounting hookful content. */
function BranchDashboardNoBranch() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <p className="text-lg font-medium text-foreground">No branch is selected.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Open <strong>Branches</strong>, choose a branch, then return to Dashboard for My View.
      </p>
      <Button className="mt-4" asChild variant="outline">
        <Link to="/branches">Go to Branches</Link>
      </Button>
    </div>
  )
}

/**
 * Branch dashboard shell: reads branch id synchronously and mounts hookful content only
 * when branchId is defined (avoids optional branchId in hook dependency arrays).
 */
function BranchReportDashboard() {
  const branchId = getBranch()?.id
  if (branchId == null) {
    return <BranchDashboardNoBranch />
  }
  return <BranchReportDashboardContent branchId={branchId} />
}

/** Branch dashboard section — My Ledger sits beside Staff Schedules for Owner in branch mode. */
type BranchDashboardSection = "myView" | "staffSchedules" | "myLedger"

/**
 * All dashboard hooks live here with a guaranteed numeric branchId.
 */
function BranchReportDashboardContent({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient()
  const { role } = getNormalizedSessionMeta(getSession())
  const isOwner = role === "Owner"
  const [dashboardSection, setDashboardSection] = useState<BranchDashboardSection>("myView")
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey)

  const myViewFetching =
    useIsFetching({ queryKey: ["reportMyCollectionSchedules", branchId] }) > 0
  const staffSchedulesFetching =
    useIsFetching({ queryKey: ["reportStaffSchedules", branchId] }) > 0
  const userLedgerFetching =
    useIsFetching({ queryKey: ["reportUserLedgerDashboard"] }) > 0
  const refreshSpinning =
    (dashboardSection === "myView" && myViewFetching) ||
    (dashboardSection === "staffSchedules" && staffSchedulesFetching) ||
    (dashboardSection === "myLedger" && userLedgerFetching)

  const handleRefreshAll = useCallback(() => {
    if (dashboardSection === "myLedger") {
      void queryClient.invalidateQueries({ queryKey: ["reportUserLedgerDashboard"] })
      return
    }
    if (dashboardSection === "staffSchedules") {
      void queryClient.invalidateQueries({ queryKey: ["reportStaffSchedules", branchId] })
      return
    }
    void queryClient.invalidateQueries({ queryKey: ["reportMyCollectionSchedules", branchId] })
  }, [queryClient, branchId, dashboardSection])

  const branchDashboardToggleOptions = useMemo((): SegmentedToggleOption<BranchDashboardSection>[] => {
    if (isOwner) {
      return [
        { value: "myView", label: "My View" },
        { value: "staffSchedules", label: "Staff Schedules" },
        { value: "myLedger", label: "My Ledger" },
      ]
    }
    return [
      { value: "myView", label: "Collection Schedules" },
      { value: "myLedger", label: "My Ledger" },
    ]
  }, [isOwner])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SegmentedToggle
            value={dashboardSection}
            onChange={(section) => {
              if (!isOwner && section === "staffSchedules") return
              setDashboardSection(section)
            }}
            ariaLabel="Dashboard section"
            className="flex w-full"
            buttonClassName="min-w-0 flex-1"
            options={branchDashboardToggleOptions}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DateInput
            value={selectedDateKey}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDateKey(e.target.value)
              }
            }}
            className="w-auto px-2 py-1 text-xs font-medium shadow-sm"
            aria-label="Pick date"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRefreshAll}
            disabled={refreshSpinning}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", refreshSpinning && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>

      {dashboardSection === "staffSchedules" && isOwner ? (
        <StaffSchedulesReportPanel branchId={branchId} selectedDateKey={selectedDateKey} />
      ) : dashboardSection === "myLedger" ? (
        <UserLedgerDashboardPanel selectedDateKey={selectedDateKey} />
      ) : (
        <MyViewBranchReportSection branchId={branchId} selectedDateKey={selectedDateKey} />
      )}
    </div>
  )
}

export default function DashboardPage() {
  const session = getSession()
  const mode = session?.mode === "ORG" || session?.mode === "BRANCH" ? session.mode : "ORG"
  if (mode !== "BRANCH") {
    return <OrgDashboardHome />
  }
  return <BranchReportDashboard />
}
