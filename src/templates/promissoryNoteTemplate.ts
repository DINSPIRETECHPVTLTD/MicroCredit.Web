function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildPromissoryNoteHtml(memberName: string, memberId: string, date: string): string {
  return `
    <!DOCTYPE html>
    <html lang="te">
    <head>
      <meta charset="UTF-8" />
      <title>Promissory Note - Navya Micro Credit Services</title>
      <style>
        body { font-family: Arial, "Noto Sans Telugu", sans-serif; line-height: 1.6; margin: 20px; }
        .center { text-align: center; }
        .underline { text-decoration: underline; }
        .section-title { font-weight: bold; text-decoration: underline; }
        .sign-line { margin-top: 20px; }
        .borrower-sign-photo-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 8px; }
        .borrower-signature-block { flex: 1; }
        .photo-placeholder {
          width: 130px;
          height: 160px;
          border: 1px dashed #333;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          padding: 8px;
          box-sizing: border-box;
        }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h2>NAVYA MICRO CREDIT SERVICES</h2>
        <p><strong>Reg Off: Door No. 20-93/1, Sarada Nagar, Road No.6,</strong></p>
        <p><strong>Near Reddy Brothers, Saroor Nagar, R.R. Dist., Telangana-500060.</strong></p>
        <p><strong>Reg No:4040/2025</strong></p>
      </div>

      <h3 class="center">
        <span class="underline">ప్రామిసరీ నోటు/</span>
        <span class="underline">Promissory note</span>
      </h3>

      <p>
        సభ్యత్వ సంఖ్య/ Membership number :
        <strong>${escapeHtml(memberId)}</strong>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        తేది/Date :
        <strong>${escapeHtml(date)}</strong>
      </p>

      <p>
        నేను అనగా శ్రీ / శ్రీమతి <strong>${escapeHtml(memberName)}</strong>
        భర్త/తండ్రి/సంరక్షకుడు ....................................................
      </p>

      <p>
        నవ్య మైక్రో క్రెడిట్ సర్వీసెస్ నుండి రూ.
        ....................................................
        (అక్షరాల ........................................................ వేల రూపాయలు మాత్రమే) అప్పుగా తీసుకున్నాను.
        ఈ మొత్తము నాకు నగదు రూపములో ముట్టినది. ఈ ఋణమును
        ....................................నెలకు నూటికి రూ.. ............ వడ్డీ చొప్పున
        ............. వాయిదాలలో ప్రతి వారము / నెల క్రమము తప్పక చెల్లించెదను.
      </p>

      <p>
        I, Mr./Mrs. <strong>${escapeHtml(memberName)}</strong>
        S/O or W/O or Guardian ................................................ have borrowed
        a sum of Rs. ......................................... (in words
        ............................................. thousand rupees only) from Navya Micro
        Credit Services. I received this amount in cash. I will repay this loan
        ..................... at the rate of Rs. ............ per hundred rupees per month
        at the rate of interest of ............. in installments every week/monthly basis.
      </p>

      <hr />

      <br />
      <br />
      <div class="borrower-sign-photo-row">
        <p class="section-title borrower-signature-block">
          ఋణగ్రహిత సంతకము / వేలిముద్ర<br />
          (Borrower signature/fingerprint)
        </p>
        <div class="photo-placeholder">
          STICK PHOTO HERE
        </div>
      </div>

      <h3 class="center sign-line">జామీను/ Guarantee</h3>

      <p>
        ........................................................ ఈ ఋణము యొక్క మొత్తము
        ................................  రూపాయల కొరకు జామీనుగా ఉన్నాము .
      </p>

      <p>
        We, the undersigned residents of the village ....................................................,
        hereby agree to act as guarantors for the loan amount of Rs. ..................................
      </p>

      <ol>
        <li>....................................................................................</li>
        <li>....................................................................................</li>
        <li>....................................................................................</li>
      </ol>

      <p>
        శ్రీ / శ్రీమతి....................................................................................
        భర్త / తండ్రి / సంరక్షకుడు ............................................................
        నవ్య మైక్రో క్రెడిట్ సర్వీసెస్ నుండి రూ.. ................................ మొత్తాన్ని అప్పుగా తీసుకున్నారు.
        అప్పు మరియు వడ్డీ చెల్లించని యెడల మేము చెల్లించెదము.
        ఇది మా సమ్మతితో వ్రాసి ఇవ్వడమైనది..
      </p>

      <p>
        Mr./Mrs. ........................................................................ S/o / D/o / W/o /
        Guardian: ........................................... has borrowed a loan of Rs.
        ....................... from Navya Micro Credit Services. In the event of failure to
        repay the principal amount and interest, we, the guarantors, agree to be fully
        responsible for repayment. This guarantee is given with our full consent.
      </p>

      <p>
        1st గ్యారంటర్ సంతకం/ 1st Guarantor Signature:
        ........................................................................
      </p>
      <p>
        2nd గ్యారంటర్ సంతకం/ 2nd Guarantor Signature:
        ........................................................................
      </p>
      <p>
        3rd గ్యారంటర్ సంతకం/ 3rd Guarantor Signature:
        ........................................................................
      </p>
      <hr />
      <h3 class="center">ఆఫీసు కొరకు/ OFFICE USE ONLY</h3>

      <div style="display:flex; justify-content:space-between; width:100%;">
        <div style="text-align:left;">
          <div>సిబ్బంది సంతకము</div>
          <div>(Staff Signature)</div>
        </div>
        <div style="text-align:center;">
          <div>క్యాషియర్ సంతకము</div>
          <div>(Cashier's Signature)</div>
        </div>
        <div style="text-align:right;">
          <div>మేనేజరు సంతకము</div>
          <div>(Manager Signature)</div>
        </div>
      </div>
    </body>
    </html>
  `
}
