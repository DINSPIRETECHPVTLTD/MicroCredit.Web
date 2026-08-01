export type InstallmentSortKey = {
  installmentNo?: number | null
  subInstallmentSequence?: number | null
  InstallmentNo?: number | null
  SubInstallmentSequence?: number | null
}

function resolveInstallmentNo(row: InstallmentSortKey): number {
  return Number(row.installmentNo ?? row.InstallmentNo ?? 0)
}

function resolveSubSequence(row: InstallmentSortKey): number {
  return Number(row.subInstallmentSequence ?? row.SubInstallmentSequence ?? 0)
}

export function compareInstallmentOrder(a: InstallmentSortKey, b: InstallmentSortKey): number {
  const installmentDiff = resolveInstallmentNo(a) - resolveInstallmentNo(b)
  if (installmentDiff !== 0) return installmentDiff
  return resolveSubSequence(a) - resolveSubSequence(b)
}

export function formatInstallmentLabel(
  installmentNo: number,
  subInstallmentSequence = 0
): string {
  if (subInstallmentSequence > 0) {
    return `${installmentNo}_${subInstallmentSequence}`
  }
  return String(installmentNo)
}

export function isInstallmentBefore(a: InstallmentSortKey, b: InstallmentSortKey): boolean {
  return compareInstallmentOrder(a, b) < 0
}

export function resolveInstallmentLabel(row: {
  installmentLabel?: string | null
  InstallmentLabel?: string | null
  installmentNo?: number | null
  InstallmentNo?: number | null
  subInstallmentSequence?: number | null
  SubInstallmentSequence?: number | null
}): string {
  const label = row.installmentLabel ?? row.InstallmentLabel
  if (label != null && String(label).trim() !== "") return String(label).trim()

  const installmentNo = Number(row.installmentNo ?? row.InstallmentNo ?? 0)
  const subSequence = Number(row.subInstallmentSequence ?? row.SubInstallmentSequence ?? 0)
  return formatInstallmentLabel(installmentNo, subSequence)
}

export function resolveSubInstallmentSequence(row: Record<string, unknown>): number {
  const raw =
    row.subInstallmentSequence ??
    row.SubInstallmentSequence ??
    row.subInstallmentSeq ??
    row.SubInstallmentSeq
  const n = Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}
