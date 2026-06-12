import type { MRT_ColumnDef, MRT_RowData } from "material-react-table"
import { getColumnDisplayValue } from "@/lib/responsive/useResponsiveTable"

type HiddenColumnsDetailPanelProps<T extends MRT_RowData> = {
  row: T
  columns: MRT_ColumnDef<T>[]
  hiddenColumnIds: string[]
  className?: string
}

function columnId<T extends MRT_RowData>(col: MRT_ColumnDef<T>): string | undefined {
  return col.id ?? (col as { accessorKey?: string }).accessorKey
}

export function HiddenColumnsDetailPanel<T extends MRT_RowData>({
  row,
  columns,
  hiddenColumnIds,
  className,
}: HiddenColumnsDetailPanelProps<T>) {
  if (hiddenColumnIds.length === 0) return null

  const hiddenSet = new Set(hiddenColumnIds)
  const fields = columns.filter((col) => {
    const id = columnId(col)
    return id != null && hiddenSet.has(id) && id !== "actions"
  })

  if (fields.length === 0) return null

  return (
    <div
      className={`border-t border-border bg-muted/30 px-3 py-3 sm:px-4 ${className ?? ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {fields.map((col) => {
          const id = columnId(col)!
          const label =
            typeof col.header === "string" ? col.header : id
          return (
            <div key={id} className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm text-foreground break-words">
                {getColumnDisplayValue(row, col)}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

/** MRT renderDetailPanel helper — pass columns + hiddenColumnIds from useResponsiveTable. */
export function renderHiddenColumnsDetailPanel<T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
  hiddenColumnIds: string[]
) {
  return function DetailPanel({ row }: { row: { original: T } }) {
    return (
      <HiddenColumnsDetailPanel
        row={row.original}
        columns={columns}
        hiddenColumnIds={hiddenColumnIds}
      />
    )
  }
}
