import type { LoanAgreementMember, LoanScheduleWord } from "@/types/loanAgreement"

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

function formatCurrency(value: unknown): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0
  return inrFormatter.format(n)
}

function formatInterestRate(rate: unknown): string {
  if (rate === null || rate === undefined || rate === "") return "—"
  if (typeof rate === "number" && Number.isFinite(rate)) return String(rate)
  const s = String(rate).trim()
  return s || "—"
}

function formatInterestLine(rate: unknown): string {
  const f = formatInterestRate(rate)
  if (f === "—") return "—"
  return `${f}% per annum (on loan principal)`
}

function getInstallmentCount(member: LoanAgreementMember): number {
  if (member.installmentCount != null && Number.isFinite(Number(member.installmentCount))) {
    return Math.max(0, Math.floor(Number(member.installmentCount)))
  }
  if (member.tenure != null && Number.isFinite(Number(member.tenure))) {
    return Math.max(0, Math.floor(Number(member.tenure)))
  }
  return 0
}

function getScheduleWord(member: LoanAgreementMember): LoanScheduleWord {
  const w = member.scheduleWord
  if (w === "weekly" || w === "daily" || w === "monthly") return w
  const s = (member.loanType || "").toLowerCase()
  if (s.includes("week")) return "weekly"
  if (s.includes("day") && !s.includes("month")) return "daily"
  return "monthly"
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

type Props = {
  member: LoanAgreementMember
}

export default function LoanAgreementPrint({ member }: Props) {
  const today = formatDateDisplay(new Date())
  const installments = getInstallmentCount(member)
  const scheduleWord = getScheduleWord(member)

  return (
    <div className="loan-agreement-wrap">
      <style>{`
        .loan-agreement-wrap {
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .loan-agreement-doc {
          width: 210mm;
          min-height: 297mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 18mm 16mm;
          box-sizing: border-box;
          border: 1px solid #222;
          background: #fff;
        }
        .loan-agreement-title {
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0 0 8mm 0;
        }
        .loan-agreement-date {
          text-align: right;
          font-size: 12px;
          margin-bottom: 6mm;
        }
        .loan-agreement-box {
          border: 1px solid #333;
          padding: 10mm 8mm;
          margin-bottom: 8mm;
          background: #fafafa;
        }
        .loan-agreement-box h2 {
          margin: 0 0 6mm 0;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .loan-agreement-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 3mm 4mm;
          font-size: 12px;
          line-height: 1.45;
        }
        .loan-agreement-label {
          font-weight: 600;
          color: #222;
        }
        .loan-agreement-value {
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .loan-agreement-declaration {
          font-size: 12px;
          line-height: 1.65;
          text-align: justify;
          margin-bottom: 10mm;
        }
        .loan-agreement-declaration p {
          margin: 0 0 4mm 0;
        }
        .loan-agreement-signatures {
          display: flex;
          justify-content: space-between;
          gap: 12mm;
          margin-top: 14mm;
          font-size: 12px;
        }
        .loan-agreement-sign-block {
          flex: 1;
          min-width: 0;
        }
        .loan-agreement-sign-line {
          border-bottom: 1px solid #000;
          height: 14mm;
          margin-bottom: 3mm;
        }
        .loan-agreement-print-btn {
          margin: 16px auto 0;
          display: block;
          padding: 10px 20px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          cursor: pointer;
          border: 1px solid #333;
          border-radius: 4px;
          background: #f5f5f5;
        }
        .loan-agreement-print-btn:hover {
          background: #eaeaea;
        }
        .loan-agreement-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
          .loan-agreement-doc {
            border: 1px solid #000;
            padding: 0;
            min-height: auto;
            width: 100%;
            max-width: none;
          }
          .loan-agreement-wrap {
            margin: 0;
            padding: 0;
          }
        }
        @media screen and (max-width: 900px) {
          .loan-agreement-doc {
            width: 100%;
            padding: 12mm 10mm;
          }
        }
      `}</style>

      <button type="button" className="loan-agreement-print-btn no-print" onClick={() => window.print()}>
        Print / Save PDF
      </button>

      <article className="loan-agreement-doc">
        <header className="loan-agreement-date">Date: {today}</header>

        <h1 className="loan-agreement-title">Loan Agreement / Promissory Note</h1>

        <section className="loan-agreement-box" aria-labelledby="member-loan-details-heading">
          <h2 id="member-loan-details-heading">Member &amp; loan details</h2>
          <div className="loan-agreement-grid">
            <span className="loan-agreement-label">Member ID</span>
            <span className="loan-agreement-value">{member.memberId}</span>

            <span className="loan-agreement-label">Member Name</span>
            <span className="loan-agreement-value">{member.name}</span>

            <span className="loan-agreement-label">Address</span>
            <span className="loan-agreement-value">{member.address}</span>

            <span className="loan-agreement-label">Loan Amount</span>
            <span className="loan-agreement-value">{formatCurrency(member.loanAmount)}</span>

            <span className="loan-agreement-label">Loan Type</span>
            <span className="loan-agreement-value">{member.loanType}</span>

            <span className="loan-agreement-label">Interest Rate</span>
            <span className="loan-agreement-value">{formatInterestLine(member.interestRate)}</span>

            <span className="loan-agreement-label">Installment</span>
            <span className="loan-agreement-value">
              {installments} {installments === 1 ? "installment" : "installments"}
            </span>
          </div>
        </section>

        <section className="loan-agreement-declaration" aria-labelledby="declaration-heading">
          <h2 id="declaration-heading" className="loan-agreement-sr-only">
            Declaration
          </h2>
          <p>
            I, <strong>{member.name}</strong>, hereby confirm that I have received a loan amount of{" "}
            <strong>{formatCurrency(member.loanAmount)}</strong> from <strong>{member.organizationName}</strong>.
          </p>
          <p>
            I agree to repay the loan amount along with applicable interest in <strong>{installments}</strong>{" "}
            <strong>{scheduleWord}</strong> installments as per the agreed schedule.
          </p>
        </section>

        <footer className="loan-agreement-signatures">
          <div className="loan-agreement-sign-block">
            <div className="loan-agreement-sign-line" aria-hidden="true" />
            <div>
              <strong>Member</strong>
              <br />
              Signature
            </div>
          </div>
          <div className="loan-agreement-sign-block">
            <div className="loan-agreement-sign-line" aria-hidden="true" />
            <div>
              <strong>Authorized signatory</strong>
              <br />
              {member.organizationName}
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
