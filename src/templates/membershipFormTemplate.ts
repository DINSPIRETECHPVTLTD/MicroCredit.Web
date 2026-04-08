import type { MemberResponse } from "@/types/member"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function valueOrDash(value?: string | number | null): string {
  if (value == null) return "—"
  const str = String(value).trim()
  return str ? str : "—"
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function buildMemberName(member: MemberResponse): string {
  const composed = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ").trim()
  return valueOrDash(member.name ?? composed)
}

function buildGuardianName(member: MemberResponse): string {
  const composed = [member.guardianFirstName, member.guardianMiddleName, member.guardianLastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  return valueOrDash(member.guardianName ?? composed)
}

function buildAddress(member: MemberResponse): string {
  const parts = [member.address1, member.address2].filter(Boolean).map((s) => s!.trim())
  if (parts.length) return parts.join(", ")
  return valueOrDash(member.fullAddress)
}

export function buildMembershipFormHtml(member: MemberResponse, printDate: string): string {
  const memberName = buildMemberName(member)
  const guardianName = buildGuardianName(member)
  const memberAge = member.age != null ? String(member.age) : "—"
  const guardianAge = member.guardianAge != null ? String(member.guardianAge) : "—"
  const village = valueOrDash(member.center ?? member.centerName)
  const code = valueOrDash(member.memberId ?? member.id)
  const mobile = valueOrDash(member.memberPhone ?? member.phoneNumber)
  const occupation = valueOrDash(member.occupation)
  const aadhaar = valueOrDash(member.aadhaar)
  const addressLine = buildAddress(member)
  const colony = valueOrDash([member.address1, member.address2].filter(Boolean).join(", "))
  const villageTown = valueOrDash(member.city)
  const district = valueOrDash(member.city)
  const state = valueOrDash(member.state)
  const pinCode = valueOrDash(member.zipCode)
  const memberDob = formatDate(member.dob)
  const guardianDob = formatDate(member.guardianDOB)

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Membership Form - Navya Micro Credit Services</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #000; font-size: 12.5px; }
      .page {
        padding: 8mm;
        min-height: 277mm;
        display: flex;
        flex-direction: column;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #000;
        padding-bottom: 7px;
        margin-bottom: 10px;
      }
      .header-left { text-align: center; flex: 1; }
      .header-left h1 { margin: 0; font-size: 30px; font-weight: 800; }
      .header-left .sub { margin-top: 2px; font-size: 11px; font-weight: 600; line-height: 1.2; }
      .photo-box {
        width: 140px;
        height: 90px;
        border: 1px solid #111;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        text-align: center;
        padding: 4px;
      }
      .form-title {
        text-align: center;
        font-weight: 700;
        text-decoration: underline;
        margin: 8px 0 12px;
      }
      .row { margin: 8px 0; line-height: 1.62; }
      .line {
        display: inline-block;
        border-bottom: 1px dotted #000;
        min-width: 120px;
        padding: 0 2px;
      }
      .line-sm { min-width: 70px; }
      .line-md { min-width: 180px; }
      .line-lg { min-width: 300px; }
      .section-title { margin-top: 12px; font-weight: 700; }
      .signature-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 20px;
      }
      .signature-row > div { width: 50%; text-align: center; }
      .office {
        margin-top: auto;
        border-top: 1px solid #000;
        padding-top: 10px;
      }
      .office-title { text-align: center; text-decoration: underline; font-weight: 800; margin-bottom: 10px; }
      .office-signs { display: flex; justify-content: space-between; }
      .office-signs > div { width: 33.33%; text-align: center; }
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        .page {
          padding: 0;
          min-height: auto;
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="header-left">
          <h1>NAVYA MICRO CREDIT SERVICES</h1>
          <div class="sub">Reg Off: Door No. 20-93/1, Sarada Nagar, Road No.6,</div>
          <div class="sub">Near Reddy Brothers, Saroor Nagar, R.R. Dist., Telangana-500060.</div>
          <div class="sub">Reg No:4040/2025</div>
        </div>
        <div class="photo-box">PHOTO</div>
      </div>

      <div class="form-title">సభ్యత్వ దరఖాస్తు / Member Form</div>

      <div class="row">Date: <span class="line line-md">${escapeHtml(printDate)}</span> &nbsp;&nbsp; Village: <span class="line line-md">${escapeHtml(village)}</span> &nbsp;&nbsp; Code: <span class="line line-sm">${escapeHtml(code)}</span></div>

      <div class="section-title">1. వ్యక్తిగత వివరములు (Personal Details):</div>
      <div class="row">సభ్యుల పేరు (Member's Full Name): <span class="line line-lg">${escapeHtml(memberName)}</span> వయస్సు (Age): <span class="line line-sm">${escapeHtml(memberAge)}</span></div>
      <div class="row">భర్త / తండ్రి పేరు (Husband / Guardian Name): <span class="line line-lg">${escapeHtml(guardianName)}</span> వయస్సు (Age): <span class="line line-sm">${escapeHtml(guardianAge)}</span></div>
      <div class="row">Member DOB: <span class="line line-md">${escapeHtml(memberDob)}</span> Guardian DOB: <span class="line line-md">${escapeHtml(guardianDob)}</span></div>
      <div class="row">వృత్తి (Occupation): <span class="line line-md">${escapeHtml(occupation)}</span> ఆధార్ నెం. (Aadhaar No): <span class="line line-md">${escapeHtml(aadhaar)}</span></div>
      <div class="row">ఫోన్ నెం. (Mobile Number): <span class="line line-md">${escapeHtml(mobile)}</span> 2: <span class="line line-md">${escapeHtml(valueOrDash(member.altPhone))}</span></div>
      <br><br>
      <div class="section-title">2. చిరునామా (Address):</div>
      <div class="row">ఇంటి నెం / వీధి (House No / Street): <span class="line line-lg">${escapeHtml(addressLine)}</span></div>
      <div class="row">కాలనీ (Colony): <span class="line line-md">${escapeHtml(colony)}</span> గ్రామం / పట్టణం (Village / Town): <span class="line line-md">${escapeHtml(villageTown)}</span></div>
      <div class="row">జిల్లా (District): <span class="line line-md">${escapeHtml(district)}</span> రాష్ట్రం (State): <span class="line line-md">${escapeHtml(state)}</span> పిన్ కోడ్ (PIN Code): <span class="line line-sm">${escapeHtml(pinCode)}</span></div>
      <div class="row">(We have been living in our current residence for ...... years.)</div>

      <div class="section-title">3. ప్రకటన (Declaration):</div>
      <div class="row">పై వివరాలు పూర్తిగా నిజమని మేము ధృవీకరిస్తున్నాము. We confirm that the above details are true.</div>
      <br><br><br><br><br>
      <div class="signature-row">
        <div>
          <div class="line line-md"></div>
          <div>సభ్యుని సంతకం / వేలిముద్ర</div>
          <div>(Member's signature / Thumb impression)</div>
        </div>
        <div>
          <div class="line line-md"></div>
          <div>భర్త/సంరక్షకుని సంతకం / వేలిముద్ర</div>
          <div>(Husband / Guardian's signature / Thumb impression)</div>
        </div>
      </div>

      <div class="office">
        <div class="office-title">ఆఫీసు కొరకు / Office Use Only</div>
        <br><br><br><br><br>
        <div class="office-signs">
          <div>
            <div>సిబ్బంది సంతకము</div>
            <div>Staff Signature</div>
          </div>
          <div>
            <div>క్యాషియర్ సంతకము</div>
            <div>Cashier Signature</div>
          </div>
          <div>
            <div>మేనేజరు సంతకము</div>
            <div>Manager Signature</div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>`
}
