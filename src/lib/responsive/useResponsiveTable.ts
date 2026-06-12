import { useMemo } from "react"
import type { MRT_ColumnDef, MRT_RowData } from "material-react-table"
import { renderHiddenColumnsDetailPanel } from "@/components/table/HiddenColumnsDetailPanel"
import { useBreakpoint } from "./useBreakpoint"
import {
  getColumnVisibility,
  getHiddenColumnIds,
  hasHiddenColumns,
  mergeColumnVisibility,
  type TableVisibilityKey,
} from "./tableVisibility"

type UseResponsiveTableOptions = {
  /** Static visibility merged on top (desktop defaults, etc.) */
  defaultVisibility?: Record<string, boolean>
}

export function useResponsiveTable(
  tableKey: TableVisibilityKey,
  options: UseResponsiveTableOptions = {}
) {
  const breakpoint = useBreakpoint()
  const { defaultVisibility = {} } = options

  const columnVisibility = useMemo(
    () =>
      mergeColumnVisibility(
        getColumnVisibility(tableKey, breakpoint),
        defaultVisibility
      ),
    [tableKey, breakpoint, defaultVisibility]
  )

  const hiddenColumnIds = useMemo(
    () => getHiddenColumnIds(tableKey, breakpoint),
    [tableKey, breakpoint]
  )

  const enableExpanding = useMemo(
    () => hasHiddenColumns(tableKey, breakpoint),
    [tableKey, breakpoint]
  )

  return {
    breakpoint,
    columnVisibility,
    hiddenColumnIds,
    enableExpanding,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
  }
}

/** Resolve display string for a hidden column in an expand/detail panel. */
export function getColumnDisplayValue<T extends MRT_RowData>(
  row: T,
  column: MRT_ColumnDef<T>
): string {
  const id = column.id ?? (column as { accessorKey?: string }).accessorKey
  if (!id) return "—"

  if (column.accessorFn) {
    try {
      const v = column.accessorFn(row)
      if (v == null || v === "") return "—"
      return String(v)
    } catch {
      return "—"
    }
  }

  const key = (column as { accessorKey?: keyof T }).accessorKey
  if (key != null) {
    const v = row[key]
    if (v == null || v === "") return "—"
    return String(v)
  }

  return "—"
}

const TABLE_CONTAINER_PROPS = { sx: { overflowX: "auto" as const } }

/** Standard MRT props for list pages: visibility, expand panel, horizontal scroll fallback. */
export function useStandardTableOptions<T extends MRT_RowData>(
  tableKey: TableVisibilityKey,
  columns: MRT_ColumnDef<T>[],
  options: UseResponsiveTableOptions = {}
) {
  const responsive = useResponsiveTable(tableKey, options)

  const renderDetailPanel = useMemo(
    () =>
      responsive.enableExpanding
        ? renderHiddenColumnsDetailPanel(columns, responsive.hiddenColumnIds)
        : undefined,
    [columns, responsive.enableExpanding, responsive.hiddenColumnIds]
  )

  return {
    ...responsive,
    state: { columnVisibility: responsive.columnVisibility },
    enableExpanding: responsive.enableExpanding,
    renderDetailPanel,
    muiTableContainerProps: TABLE_CONTAINER_PROPS,
  }
}
