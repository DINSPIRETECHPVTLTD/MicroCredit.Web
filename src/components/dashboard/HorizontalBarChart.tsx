import type { DashboardChartItem } from "@/types/dashboard"

export function HorizontalBarChart({
  title,
  items,
  emptyMessage,
}: {
  title: string
  items: DashboardChartItem[]
  emptyMessage: string
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const max = items.reduce((peak, item) => Math.max(peak, item.value), 0)
  const palette = ["#2563eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"]

  let offset = 0
  const chartSlices = items
    .filter((item) => item.value > 0 && total > 0)
    .map((item, index) => {
      const percent = (item.value / total) * 100
      const slice = {
        start: offset,
        end: offset + percent,
        color: palette[index % palette.length],
      }
      offset += percent
      return slice
    })

  const conicGradient = chartSlices.length
    ? `conic-gradient(${chartSlices
        .map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`)
        .join(", ")})`
    : "conic-gradient(#e5e7eb 0 100%)"

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[220px,1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/30 p-4">
            <div
              className="relative h-36 w-36 rounded-full"
              style={{ background: conicGradient }}
              aria-label="distribution donut chart"
            >
              <div className="absolute inset-5 flex items-center justify-center rounded-full bg-card">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {total.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const widthPercent = max <= 0 ? 0 : Math.max(4, (item.value / max) * 100)
              const share = total > 0 ? (item.value / total) * 100 : 0
              const color = palette[index % palette.length]
              return (
                <div key={item.label} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="truncate text-xs font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                  </div>
                  <div className="mb-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, widthPercent)}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="text-right text-xs font-semibold tabular-nums text-foreground">
                    {item.value.toLocaleString("en-IN")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
