import type { DashboardSummaryResponse } from "@/types/dashboard"

function formatInr(value: number): string {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function SummaryDataTable({ data }: { data: DashboardSummaryResponse }) {
  const rows = [
    { label: "Received Principle", value: data.receivedPrinciple },
    { label: "Received Interest", value: data.receivedInterest },
    { label: "Joining Fee", value: data.totalJoiningFee },
    { label: "Processing Fee", value: data.totalProcessingFee },
    { label: "Insurance", value: data.totalInsuranceAmount },
    { label: "Expenses", value: data.totalLedgerExpenseAmount },
    { label: "Outstanding Principle", value: data.outstandingPrinciple },
    { label: "Interest Accrued", value: data.interestAccured },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Financial Insights</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatInr(row.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
