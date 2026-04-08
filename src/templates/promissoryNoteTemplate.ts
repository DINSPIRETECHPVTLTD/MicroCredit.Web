function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildPromissoryNoteHtml(memberName: string, memberId: string, date: string, guardianName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="te">
    <head>
      <meta charset="UTF-8" />
      <title>Promissory Note - Navya Micro Credit Services</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, "Noto Sans Telugu", sans-serif;
          line-height: 1.80;
          margin: 0;
          color: #000;
          font-size: 12px;
        }
        .page { width: 100%; padding: 10mm; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #000;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .header-left {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 29px;
          letter-spacing: 0.2px;
          font-weight: 800;
        }
        .org-lines {
          margin-top: 2px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.2;
        }
        .org-lines div { margin: 1px 0; }
        .photo-box {
          width: 150px;
          height: 130px;
          border: 1px solid #111;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4px;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .title {
          margin: 0 0 10px;
          text-align: center;
          font-weight: 700;
          text-decoration: underline;
          font-size: 13px;
        }
        .row {
          margin: 6px 0;
          display: flex;
          align-items: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }
        .line {
          border-bottom: 1px dotted #000;
          min-width: 80px;
          display: inline-block;
          padding: 0 2px 1px;
          line-height: 1.1;
        }
        .line-sm { min-width: 70px; }
        .line-md { min-width: 160px; }
        .line-lg { min-width: 300px; }
        .line-flex { flex: 1; min-width: 120px; }
        .rule { border-top: 1px solid #000; margin: 6px 0; }
        .section {
          margin: 10px 0;
          text-align: justify;
        }
        .borrower {
          margin: 12px 0 8px;
          text-align: center;
          font-weight: 700;
        }
        .borrower-sign {
          margin: 20px 0 12px;
          display: flex;
          justify-content: flex-end;
        }
        .borrower-sign .line { min-width: 220px; text-align: center; }
        .guarantee-title {
          margin-top: 12px;
          text-align: center;
          font-weight: 700;
          text-decoration: underline;
          font-size: 14px;
        }
        .list-lines {
          margin: 8px 0 10px;
          padding-left: 18px;
        }
        .list-lines li { margin: 6px 0; }
        .office-title {
          text-align: center;
          margin-top: 14px;
          font-weight: 800;
          text-decoration: underline;
        }
        .office-signs {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .office-signs > div { width: 33.33%; text-align: center; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .page { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="page">
      <div class="header">
        <div class="header-left">
          <h1>NAVYA MICRO CREDIT SERVICES</h1>
          <div class="org-lines">
            <div>Reg Off: Door No. 20-93/1, Sarada Nagar, Road No.6,</div>
            <div>Near Reddy Brothers, Saroor Nagar, R.R. Dist., Telangana-500060.</div>
            <div>Reg No:4040/2025</div>
          </div>
        </div>
        <div class="photo-box">STICK PHOTO HERE</div>
      </div>

      <div class="title">ప్రామిసరీ నోటు (Promissory Note)</div>

      <div class="row">
        <span>సభ్యత్వ సంఖ్య (Membership number)</span>
        <span class="line line-md">${escapeHtml(memberId)}</span>
        <span>తేది (Date)</span>
        <span class="line line-md">${escapeHtml(date)}</span>
      </div>

      <div class="row">
        <span>నేను అనగా శ్రీ / శ్రీమతి</span>
        <span class="line line-lg">${escapeHtml(memberName)}</span>
        <span>S/O or W/O or Guardian</span>
        <span class="line line-flex">${escapeHtml(guardianName)}</span>
      </div>

      <div class="section">
        నవ్య మైక్రో క్రెడిట్ సర్వీసెస్ నుండి రూ. <span class="line line-md"></span> (అక్షరాల
        <span class="line line-lg"></span> వేల రూపాయలు మాత్రమే) అప్పుగా తీసుకున్నాను.
        ఈ మొత్తము నాకు నగదు రూపములో ముట్టినది. ఈ ఋణమును
        <span class="line line-sm"></span> వాయిదాలలో ప్రతి వారము/నెలకు నూటికి
        రూ. <span class="line line-sm"></span> వడ్డీ చొప్పున చెల్లించెదను.
      </div>

      <div class="section">
        I, Mr./Mrs. <span class="line line-lg">${escapeHtml(memberName)}</span> S/O or W/O or Guardian
        <span class="line line-md">${escapeHtml(guardianName)}</span> have borrowed a sum of Rs.
        <span class="line line-md"></span> (in words <span class="line line-lg"></span>
        thousand rupees only) from Navya Micro Credit Services. I received this amount in cash.
        I agree to repay this loan amount and interest totally paid in
        <span class="line line-sm"></span> installments on a weekly/monthly basis.
      </div>
      <br><br>
      <div class="borrower-sign">Borrower's signature / Thumb impression: <span class="line"></span></div>
      
      <div class="borrower">జామీను / Guarantee</div>

      <div class="section">
        <span class="line line-md"></span> ఈ ఋణము యొక్క మొత్తం
        <span class="line line-md"></span> రూపాయల కొరకు జామీనుగా ఉన్నాము.
      </div>

      <div class="section">
        We, the undersigned residents of the village <span class="line line-md"></span>, hereby agree
        to act as guarantors for the loan amount of Rs. <span class="line line-md"></span>.
      </div>

      <ol class="list-lines">
        <li><span class="line line-lg"></span></li>
        <li><span class="line line-lg"></span></li>
        <li><span class="line line-lg"></span></li>
      </ol>

      <div class="section">
        శ్రీ / శ్రీమతి <span class="line line-md">${escapeHtml(memberName)}</span>
        భర్త / తండ్రి / సంరక్షకుడు <span class="line line-md">${escapeHtml(guardianName)}</span>
        నవ్య మైక్రో క్రెడిట్ సర్వీసెస్ నుండి రూ. <span class="line line-sm"></span> మొత్తాన్ని అప్పుగా తీసుకున్నారు.
        అప్పు మరియు వడ్డీ చెల్లించని యెడల మేము జామీనుదారులముగా చెల్లించెదము.
      </div>

      <div class="section">
        Mr./Mrs. <span class="line line-md">${escapeHtml(memberName)}</span> S/o / D/o / W/o / Guardian:
        <span class="line line-md">${escapeHtml(guardianName)}</span> has borrowed a loan of Rs. <span class="line line-sm"></span>
        from Navya Micro Credit Services. In the event of failure to repay the principal amount and interest,
        we, the guarantors, agree to be fully responsible for repayment. This guarantee is given with our full consent.
      </div>

      <div class="row"><span>1st గ్యారంటర్ సంతకం (1st Guarantor Signature)</span><span class="line line-flex"></span></div>
      <div class="row"><span>2nd గ్యారంటర్ సంతకం (2nd Guarantor Signature)</span><span class="line line-flex"></span></div>
      <div class="row"><span>3rd గ్యారంటర్ సంతకం (3rd Guarantor Signature)</span><span class="line line-flex"></span></div>

      <div class="rule"></div>
      <div class="office-title">ఆఫీసు కొరకు / OFFICE USE ONLY</div>
      <br><br>
      <div class="office-signs">
        <div>
          <div>సిబ్బంది సంతకము</div>
          <div>(Staff Signature)</div>
        </div>
        <div>
          <div>క్యాషియర్ సంతకము</div>
          <div>(Cashier's Signature)</div>
        </div>
        <div>
          <div>మేనేజరు సంతకము</div>
          <div>(Manager Signature)</div>
        </div>
      </div>
      </div>
    </body>
    </html>
  `
}
