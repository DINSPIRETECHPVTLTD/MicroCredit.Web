/**
 * Installment display/order helpers for base + payment-child schedulers.
 * Labels are presentation-only — never stored in InstallmentNo.
 */

export function formatInstallmentLabel(
  installmentNo: number,
  subInstallmentSequence: number | null | undefined
): string {
  const seq = subInstallmentSequence == null ? 0 : Number(subInstallmentSequence)
  if (!Number.isFinite(seq) || seq <= 0) return String(installmentNo)
  return `${installmentNo}_${seq}`
}

export function resolveInstallmentLabel(row: {
  installmentNo?: number
  InstallmentNo?: number
  subInstallmentSequence?: number | null
  SubInstallmentSequence?: number | null
  installmentLabel?: string | null
  InstallmentLabel?: string | null
}): string {
  const apiLabel = row.installmentLabel ?? row.InstallmentLabel
  if (apiLabel != null && String(apiLabel).trim() !== "") return String(apiLabel)
  const n = Number(row.installmentNo ?? row.InstallmentNo ?? 0)
  const seq = Number(row.subInstallmentSequence ?? row.SubInstallmentSequence ?? 0)
  return formatInstallmentLabel(n, seq)
}

export function compareInstallmentOrder(
  a: { installmentNo: number; subInstallmentSequence?: number | null },
  b: { installmentNo: number; subInstallmentSequence?: number | null }
): number {
  if (a.installmentNo !== b.installmentNo) return a.installmentNo - b.installmentNo
  return (a.subInstallmentSequence ?? 0) - (b.subInstallmentSequence ?? 0)
}

export function isInstallmentBefore(
  earlier: { installmentNo: number; subInstallmentSequence?: number | null },
  later: { installmentNo: number; subInstallmentSequence?: number | null }
): boolean {
  return compareInstallmentOrder(earlier, later) < 0
}
