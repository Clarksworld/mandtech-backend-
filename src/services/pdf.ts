import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MANDTECH_LOGO_BASE64, DENAIR_LOGO_BASE64 } from './logoBase64';

export interface InvoicePdfData {
  id?: string;
  invoice_number: string;
  doc_type?: string;
  created_at?: string;
  company: string;
  contact_name: string;
  contact_phone?: string;
  email: string;
  billing_address?: string;
  sales_person?: string;
  client_ref?: string;
  line_items: Array<{
    sn?: number;
    part_number?: string;
    product_name?: string;
    description?: string;
    qty: number;
    unit_price: number;
    total?: number;
    cfm?: number;
    dailyRatePerCfm?: number;
  }>;
  subtotal: number;
  discount_pct?: number;
  discount_amount?: number;
  vat_rate_pct?: number;
  vat_amount?: number;
  total: number;
  delivery_terms?: string;
  bank_details?: string;
  amount_in_words?: string;
  terms?: string;
  notes?: string;
}

function fmtNaira(num: number): string {
  const val = Number(num || 0).toFixed(2);
  const [int, dec] = val.split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Document metadata
  pdfDoc.setTitle(`Mandtech-${data.invoice_number}`);
  pdfDoc.setAuthor('Mandtech Services Limited');
  pdfDoc.setSubject(`${data.doc_type === 'quotation' ? 'Quotation' : 'Invoice'} ${data.invoice_number}`);

  // Safe standard Helvetica fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Embed Brand Logos
  let logoImg: any = null;
  let denairImg: any = null;
  try {
    if (MANDTECH_LOGO_BASE64) {
      logoImg = await pdfDoc.embedPng(Buffer.from(MANDTECH_LOGO_BASE64, 'base64'));
    }
  } catch (e) {
    console.warn('Failed to embed Mandtech logo PNG', e);
  }

  try {
    if (DENAIR_LOGO_BASE64) {
      denairImg = await pdfDoc.embedPng(Buffer.from(DENAIR_LOGO_BASE64, 'base64'));
    }
  } catch (e) {
    console.warn('Failed to embed Denair logo PNG', e);
  }

  // A4 dimensions: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Outer Sheet Border (matches #mandtech-official-sheet border-2 border-black in admin)
  const sheetMargin = 18;
  const sheetW = width - sheetMargin * 2;
  const sheetH = height - sheetMargin * 2;
  const sheetBottom = sheetMargin;

  const cBlack = rgb(0, 0, 0);
  const cWhite = rgb(1, 1, 1);
  const cGrayHeaderBg = rgb(0.95, 0.95, 0.95);
  const cYellowNote = rgb(1, 1, 0); // #FFFF00
  const cBlueLink = rgb(0.114, 0.306, 0.85); // #1d4ed8
  const cBlueSig = rgb(0.118, 0.251, 0.686); // #1e40af
  const cDenairGreen = rgb(0, 0.659, 0.349); // #00A859
  const cTaglineBlue = rgb(0.2, 0.4, 0.6); // #336699

  page.drawRectangle({
    x: sheetMargin,
    y: sheetBottom,
    width: sheetW,
    height: sheetH,
    borderColor: cBlack,
    borderWidth: 1.8,
  });

  // Inner padding inside sheet matches admin p-6 / p-8
  const innerPad = 16;
  const margin = sheetMargin + innerPad;
  const contentWidth = width - margin * 2;

  let curY = height - margin;

  // ── 1. HEADER (Logo + RC / Tagline on Left, Mandtech Address on Right) ──
  const headerTopY = curY;
  if (logoImg) {
    const logoW = 145;
    const logoH = logoW * (logoImg.height / logoImg.width);
    page.drawImage(logoImg, {
      x: margin,
      y: headerTopY - logoH,
      width: logoW,
      height: logoH,
    });
    curY = headerTopY - logoH - 7;
  } else {
    page.drawText('MANDTECH', {
      x: margin,
      y: headerTopY - 20,
      size: 20,
      font: fontBold,
      color: cDenairGreen,
    });
    curY = headerTopY - 28;
  }

  // RC Number
  page.drawText('RC - 9324886', {
    x: margin,
    y: curY,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  // Tagline: DISTRIBUTORS OF DENAIR AIR COMPRESSORS IN NIGERIA
  curY -= 11;
  const t1 = 'DISTRIBUTORS OF ';
  const t2 = 'DENAIR';
  const t3 = ' AIR COMPRESSORS IN NIGERIA';
  page.drawText(t1, { x: margin, y: curY, size: 7, font: fontBoldOblique, color: cTaglineBlue });
  const w1 = fontBoldOblique.widthOfTextAtSize(t1, 7);
  page.drawText(t2, { x: margin + w1, y: curY, size: 7.5, font: fontBold, color: cDenairGreen });
  const w2 = fontBold.widthOfTextAtSize(t2, 7.5);
  page.drawText(t3, { x: margin + w1 + w2, y: curY, size: 7, font: fontBoldOblique, color: cTaglineBlue });

  // Right Header Address Block
  let rY = headerTopY - 2;
  const companyTitle = 'MANDTECH SERVICES LIMITED';
  page.drawText(companyTitle, { x: width - margin - fontBold.widthOfTextAtSize(companyTitle, 9), y: rY, size: 9, font: fontBold, color: cBlack });

  rY -= 11;
  const a1 = '54 Old Refinery road, Elelenwo, Port-Harcourt';
  page.drawText(a1, { x: width - margin - fontRegular.widthOfTextAtSize(a1, 7.5), y: rY, size: 7.5, font: fontRegular, color: cBlack });

  rY -= 10;
  const a2 = 'mandtechserviceslimited@gmail.com';
  page.drawText(a2, { x: width - margin - fontRegular.widthOfTextAtSize(a2, 7.5), y: rY, size: 7.5, font: fontRegular, color: cBlack });

  rY -= 10;
  const a3 = 'Sales/Service: 08186538644';
  page.drawText(a3, { x: width - margin - fontBold.widthOfTextAtSize(a3, 7.5), y: rY, size: 7.5, font: fontBold, color: cBlack });

  curY = Math.min(curY, rY) - 10;

  // ── 2. BLACK TITLE BAR (INVOICE / QUOTATION) ──
  const isQuotation = data.doc_type === 'quotation';
  const isLeasing = data.doc_type === 'leasing';
  const titleText = isLeasing
    ? (isQuotation ? 'EQUIPMENT LEASING CONTRACT - QUOTATION' : 'EQUIPMENT LEASING CONTRACT - INVOICE')
    : (isQuotation ? 'QUOTATION' : 'INVOICE');

  const titleBarH = 17;
  page.drawRectangle({
    x: margin,
    y: curY - titleBarH,
    width: contentWidth,
    height: titleBarH,
    color: cBlack,
  });

  const tWidth = fontBold.widthOfTextAtSize(titleText, 10);
  page.drawText(titleText, {
    x: margin + (contentWidth - tWidth) / 2,
    y: curY - titleBarH + 4.5,
    size: 10,
    font: fontBold,
    color: cWhite,
  });

  curY -= titleBarH;

  // ── 3. ATTENTION & DOCUMENT METADATA GRID BOX ──
  const metaBoxH = 75;
  const leftColW = contentWidth * 0.58;
  const metaBoxBottom = curY - metaBoxH;

  // Outer border of meta box
  page.drawRectangle({
    x: margin,
    y: metaBoxBottom,
    width: contentWidth,
    height: metaBoxH,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  // Vertical divider between left and right column
  page.drawLine({
    start: { x: margin + leftColW, y: curY },
    end: { x: margin + leftColW, y: metaBoxBottom },
    thickness: 1.5,
    color: cBlack,
  });

  // Left Column Content: Customer Info
  let cY = curY - 11;
  const attnLine = `ATTN: ${(data.contact_name || 'CUSTOMER').toUpperCase()}`;
  page.drawText(attnLine.slice(0, 48), { x: margin + 8, y: cY, size: 8, font: fontBold, color: cBlack });

  cY -= 11;
  const compLine = (data.company || 'ORGANIZATION').toUpperCase();
  page.drawText(compLine.slice(0, 48), { x: margin + 8, y: cY, size: 8.5, font: fontBold, color: cBlack });

  // Address lines
  const addrParts = (data.billing_address || '').split(',').map(s => s.trim()).filter(Boolean);
  if (addrParts.length > 0) {
    addrParts.slice(0, 3).forEach(part => {
      cY -= 9.5;
      page.drawText(part.toUpperCase().slice(0, 52), { x: margin + 8, y: cY, size: 7.5, font: fontRegular, color: cBlack });
    });
  } else {
    cY -= 9.5;
    page.drawText('PORT HARCOURT', { x: margin + 8, y: cY, size: 7.5, font: fontRegular, color: cBlack });
    cY -= 9.5;
    page.drawText('RIVERS STATE', { x: margin + 8, y: cY, size: 7.5, font: fontRegular, color: cBlack });
  }

  // Phone + Email line
  cY = metaBoxBottom + 6;
  const phoneText = data.contact_phone || '08012345678';
  page.drawText(phoneText, { x: margin + 8, y: cY, size: 7.5, font: fontRegular, color: cBlack });
  const pW = fontRegular.widthOfTextAtSize(phoneText, 7.5);

  if (data.email) {
    const emailStr = data.email;
    const emX = margin + 8 + pW + 12;
    page.drawText(emailStr, { x: emX, y: cY, size: 7.5, font: fontRegular, color: cBlueLink });
    // Underline
    page.drawLine({
      start: { x: emX, y: cY - 1 },
      end: { x: emX + fontRegular.widthOfTextAtSize(emailStr, 7.5), y: cY - 1 },
      thickness: 0.6,
      color: cBlueLink,
    });
  }

  // Right Column Content: 5-row table
  const metaRows = [
    { label: isLeasing ? 'DOCUMENT NO:' : 'DOC.NO.:', value: data.invoice_number, bold: true },
    { label: 'DATE:', value: data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'), bold: false },
    { label: 'YOUR REF:', value: data.client_ref || '—', bold: false },
    { label: 'TAX ID:', value: '33865000001', bold: false },
    {
      label: 'BANK DETAILS:',
      value: (data.bank_details || 'Mandtech Services Limited\nSterling Bank Plc -\n01433839162').trim(),
      bold: true,
      multi: true,
    },
  ];

  const rowH = metaBoxH / 5;
  const labelColW = 68;
  const rightX = margin + leftColW;

  metaRows.forEach((r, idx) => {
    const rBottom = curY - (idx + 1) * rowH;

    // Gray background for label cell
    page.drawRectangle({
      x: rightX,
      y: rBottom,
      width: labelColW,
      height: rowH,
      color: cGrayHeaderBg,
    });

    // Vertical line between label and value
    page.drawLine({
      start: { x: rightX + labelColW, y: rBottom + rowH },
      end: { x: rightX + labelColW, y: rBottom },
      thickness: 0.8,
      color: cBlack,
    });

    // Horizontal line between rows
    if (idx < 4) {
      page.drawLine({
        start: { x: rightX, y: rBottom },
        end: { x: margin + contentWidth, y: rBottom },
        thickness: 0.8,
        color: cBlack,
      });
    }

    // Label text
    page.drawText(r.label, {
      x: rightX + 5,
      y: rBottom + (r.multi ? rowH - 8 : 4.5),
      size: 6.8,
      font: fontBold,
      color: cBlack,
    });

    // Value text
    if (r.multi) {
      const lines = r.value.split('\n');
      lines.slice(0, 3).forEach((line, lIdx) => {
        page.drawText(line.trim(), {
          x: rightX + labelColW + 5,
          y: rBottom + rowH - 5.5 - (lIdx * 4.2),
          size: 5.2,
          font: fontBold,
          color: cBlack,
        });
      });
    } else {
      page.drawText(r.value.slice(0, 26), {
        x: rightX + labelColW + 5,
        y: rBottom + 4.5,
        size: 7.2,
        font: r.bold ? fontBold : fontRegular,
        color: cBlack,
      });
    }
  });

  curY = metaBoxBottom - 8;

  // ── 4. SALUTATION TEXT ──
  page.drawText('Dear Sir,', { x: margin, y: curY, size: 7.5, font: fontBold, color: cBlack });
  curY -= 9;
  page.drawText('Dear Sir,', { x: margin, y: curY, size: 7, font: fontRegular, color: cBlack });
  curY -= 9;
  const quoteSubject = data.notes && data.notes.includes('Scope:')
    ? data.notes.split('Scope:')[1].split('.')[0].trim()
    : (data.line_items?.[0]?.product_name || 'undefined');
  page.drawText(`Sequel to your request for ${quoteSubject.slice(0, 70)},`, {
    x: margin,
    y: curY,
    size: 7,
    font: fontRegular,
    color: cBlack,
  });
  curY -= 9;
  page.drawText(`Find below our ${isQuotation ? 'Quotation' : 'Invoice'}, as we look forward to offer the best of our service.`, {
    x: margin,
    y: curY,
    size: 7,
    font: fontRegular,
    color: cBlack,
  });

  curY -= 8;

  // ── 5. TABLE SCOPE HEADER BAND ──
  const scopeH = 15;
  const scopeTitle = `SUPPLY OF SPARES & SERVICE FOR ${(data.company || 'TEST COMPANY').toUpperCase()}`;
  page.drawRectangle({
    x: margin,
    y: curY - scopeH,
    width: contentWidth,
    height: scopeH,
    color: cGrayHeaderBg,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  const scopeW = fontBold.widthOfTextAtSize(scopeTitle, 7.5);
  page.drawText(scopeTitle, {
    x: margin + Math.max(8, (contentWidth - scopeW) / 2),
    y: curY - scopeH + 4.5,
    size: 7.5,
    font: fontBold,
    color: cBlack,
  });

  curY -= scopeH;

  // ── 6. LINE ITEMS TABLE ──
  const colWProduct = 75;
  const colWDesc = 230;
  const colWQty = 35;
  const colWUnit = 95;
  const colWAmount = contentWidth - (colWProduct + colWDesc + colWQty + colWUnit);

  const tableHeaderH = 15;
  page.drawRectangle({
    x: margin,
    y: curY - tableHeaderH,
    width: contentWidth,
    height: tableHeaderH,
    color: cWhite,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  const headers = [
    { title: 'Product No.', x: margin, w: colWProduct, align: 'left' },
    { title: 'Description', x: margin + colWProduct, w: colWDesc, align: 'left' },
    { title: 'Qty', x: margin + colWProduct + colWDesc, w: colWQty, align: 'center' },
    { title: 'Unit Price =N=', x: margin + colWProduct + colWDesc + colWQty, w: colWUnit, align: 'right' },
    { title: 'Amount =N=', x: margin + colWProduct + colWDesc + colWQty + colWUnit, w: colWAmount, align: 'right' },
  ];

  headers.forEach((h, i) => {
    if (i > 0) {
      page.drawLine({
        start: { x: h.x, y: curY },
        end: { x: h.x, y: curY - tableHeaderH },
        thickness: 0.8,
        color: cBlack,
      });
    }

    let textX = h.x + 5;
    const txtW = fontBold.widthOfTextAtSize(h.title, 7);
    if (h.align === 'center') textX = h.x + (h.w - txtW) / 2;
    if (h.align === 'right') textX = h.x + h.w - txtW - 6;

    page.drawText(h.title, {
      x: textX,
      y: curY - tableHeaderH + 4.5,
      size: 7,
      font: fontBold,
      color: cBlack,
    });
  });

  curY -= tableHeaderH;

  const rawItems = (data.line_items && data.line_items.length > 0)
    ? data.line_items
    : [{ sn: 1, part_number: 'ITEM-1', product_name: 'UNDEFINED', description: 'UNDEFINED', qty: 1, unit_price: data.total || 0, total: data.total || 0 }];

  // Limit to 7 rows on a single page so bottom partners always fit
  const items = rawItems.slice(0, 7);
  const rowHItem = 15;

  items.forEach((it, idx) => {
    const rBottom = curY - rowHItem;

    page.drawRectangle({
      x: margin,
      y: rBottom,
      width: contentWidth,
      height: rowHItem,
      borderColor: cBlack,
      borderWidth: 0.8,
    });

    [colWProduct, colWProduct + colWDesc, colWProduct + colWDesc + colWQty, colWProduct + colWDesc + colWQty + colWUnit].forEach(dx => {
      page.drawLine({
        start: { x: margin + dx, y: curY },
        end: { x: margin + dx, y: rBottom },
        thickness: 0.8,
        color: cBlack,
      });
    });

    // Product No
    const pNo = (it.part_number || `ITEM-${idx + 1}`).toUpperCase().slice(0, 16);
    page.drawText(pNo, { x: margin + 5, y: rBottom + 4.5, size: 7, font: fontBold, color: cBlack });

    // Description
    const desc = (it.description || it.product_name || 'UNDEFINED').toUpperCase().slice(0, 48);
    page.drawText(desc, { x: margin + colWProduct + 5, y: rBottom + 4.5, size: 7, font: fontBold, color: cBlack });

    // Qty
    const qStr = String(it.qty || 1);
    const qW = fontRegular.widthOfTextAtSize(qStr, 7);
    page.drawText(qStr, { x: margin + colWProduct + colWDesc + (colWQty - qW) / 2, y: rBottom + 4.5, size: 7, font: fontRegular, color: cBlack });

    // Unit Price
    const uStr = fmtNaira(it.unit_price);
    const uW = fontRegular.widthOfTextAtSize(uStr, 7);
    page.drawText(uStr, { x: margin + colWProduct + colWDesc + colWQty + colWUnit - uW - 6, y: rBottom + 4.5, size: 7, font: fontRegular, color: cBlack });

    // Amount
    const aVal = it.total !== undefined ? it.total : (it.qty || 1) * (it.unit_price || 0);
    const aStr = fmtNaira(aVal);
    const aW = fontBold.widthOfTextAtSize(aStr, 7);
    page.drawText(aStr, { x: margin + contentWidth - aW - 6, y: rBottom + 4.5, size: 7, font: fontBold, color: cBlack });

    curY = rBottom;
  });

  // ── 7. SUBTOTAL & AUTHORISED SIGNATURE BLOCK ──
  const totalsBlockH = 45;
  const totalsBlockBottom = curY - totalsBlockH;
  const leftSigW = colWProduct + colWDesc;
  const rightTotalsW = contentWidth - leftSigW;

  page.drawRectangle({
    x: margin,
    y: totalsBlockBottom,
    width: contentWidth,
    height: totalsBlockH,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  page.drawLine({
    start: { x: margin + leftSigW, y: curY },
    end: { x: margin + leftSigW, y: totalsBlockBottom },
    thickness: 1.5,
    color: cBlack,
  });

  // Left Signature Title
  page.drawText('AUTHORISED SIGNATURE:', {
    x: margin + 6,
    y: curY - 11,
    size: 7.5,
    font: fontBold,
    color: cBlack,
  });

  // Blue signature curve via SVG path matching the admin preview
  try {
    page.drawSvgPath('M 10 35 C 30 10, 45 40, 60 15 C 75 -5, 90 45, 105 25 C 120 10, 135 30, 150 15', {
      x: margin + 25,
      y: curY - 14,
      borderColor: cBlueSig,
      borderWidth: 1.8,
      scale: 0.85,
    });
    page.drawSvgPath('M 25 38 C 50 42, 100 45, 145 36', {
      x: margin + 25,
      y: curY - 14,
      borderColor: cBlueSig,
      borderWidth: 1.3,
      scale: 0.85,
    });
  } catch (e) {
    // Fallback if SVG path fails
    page.drawLine({ start: { x: margin + 25, y: curY - 25 }, end: { x: margin + 140, y: curY - 20 }, thickness: 1.5, color: cBlueSig });
  }

  // Right Totals Rows
  const tRowH = 15;
  const totRightX = margin + leftSigW;
  const totLabelW = colWQty + colWUnit;

  const subVal = data.subtotal || data.total;
  const vatVal = data.vat_amount ?? (subVal * 0.075);
  const totalVal = data.total;

  const totalLines = [
    { label: 'SUBTOTAL', val: fmtNaira(subVal), bold: false, bg: cWhite },
    { label: 'VAT (7.5%)', val: fmtNaira(vatVal), bold: false, bg: cWhite },
    { label: 'TOTAL', val: fmtNaira(totalVal), bold: true, bg: cGrayHeaderBg },
  ];

  totalLines.forEach((tl, idx) => {
    const tRowBottom = curY - (idx + 1) * tRowH;

    page.drawRectangle({
      x: totRightX,
      y: tRowBottom,
      width: rightTotalsW,
      height: tRowH,
      color: tl.bg,
    });

    if (idx < 2) {
      page.drawLine({
        start: { x: totRightX, y: tRowBottom },
        end: { x: margin + contentWidth, y: tRowBottom },
        thickness: 0.8,
        color: cBlack,
      });
    }

    page.drawLine({
      start: { x: totRightX + totLabelW, y: tRowBottom + tRowH },
      end: { x: totRightX + totLabelW, y: tRowBottom },
      thickness: 0.8,
      color: cBlack,
    });

    const lW = fontBold.widthOfTextAtSize(tl.label, 7.5);
    page.drawText(tl.label, {
      x: totRightX + totLabelW - lW - 6,
      y: tRowBottom + 4.5,
      size: 7.5,
      font: fontBold,
      color: cBlack,
    });

    const vW = (tl.bold ? fontBold : fontRegular).widthOfTextAtSize(tl.val, 7.5);
    page.drawText(tl.val, {
      x: margin + contentWidth - vW - 6,
      y: tRowBottom + 4.5,
      size: 7.5,
      font: tl.bold ? fontBold : fontRegular,
      color: cBlack,
    });
  });

  curY = totalsBlockBottom;

  // ── 8. AMOUNT IN WORDS BANNER ──
  const wordsH = 15;
  const wordsText = data.amount_in_words || 'Zero Naira Only';
  page.drawRectangle({
    x: margin,
    y: curY - wordsH,
    width: contentWidth,
    height: wordsH,
    color: cWhite,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  const wordsW = fontBold.widthOfTextAtSize(wordsText, 7.5);
  page.drawText(wordsText, {
    x: margin + Math.max(6, (contentWidth - wordsW) / 2),
    y: curY - wordsH + 4.5,
    size: 7.5,
    font: fontBold,
    color: cBlack,
  });

  curY -= wordsH;

  // ── 9. TERMS & CONDITIONS BOX (WITH YELLOW HIGHLIGHTED NOTE) ──
  const termsBoxH = 68;
  const termsBoxBottom = curY - termsBoxH;

  page.drawRectangle({
    x: margin,
    y: termsBoxBottom,
    width: contentWidth,
    height: termsBoxH,
    color: cWhite,
    borderColor: cBlack,
    borderWidth: 1.5,
  });

  let termY = curY - 11;
  const tLines = [
    'PAYMENT : 100% DOWN PAYMENT & ISSUE OF LPO',
    'DELIVERY : TO BE DELIVERED WITHIN 21 WORKING DAYS AFTER 100% PAYMENT RECEIPT',
    'SERVICE/COMMISSIONING/REPAIRS: TO BE CARRIED OUT ON DELIVERY OR AS AGREED UPON BY CUSOMER & VENDOR',
  ];

  tLines.forEach(tl => {
    page.drawText(tl, { x: margin + 6, y: termY, size: 6.8, font: fontBold, color: cBlack });
    termY -= 10;
  });

  // Yellow Highlight Box for NOTE
  const noteBoxH = 16;
  const noteY = termsBoxBottom + 6;
  page.drawRectangle({
    x: margin + 6,
    y: noteY,
    width: contentWidth - 12,
    height: noteBoxH,
    color: cYellowNote,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 0.6,
  });

  page.drawText('NOTE: Any item/items needed to close this order which is not included in this quote will be quoted for in a separate quote.', {
    x: margin + 10,
    y: noteY + 5,
    size: 6.5,
    font: fontBold,
    color: cBlack,
  });

  curY = termsBoxBottom - 14;

  // ── 10. PARTNER BRANDS FOOTER STRIP (ALL PARTNERS) ──
  // Top horizontal separator line
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: margin + contentWidth, y: curY },
    thickness: 1.2,
    color: cBlack,
  });

  // ROW 1: Atlas Copco | SULLAIR | DENAIR | KAESER | Atlas Copco (Red) | SOLLANT | Atlas Copco
  const r1Y = curY - 18;

  // 1. Atlas Copco (Cyan)
  page.drawText('Atlas Copco', {
    x: margin + 6,
    y: r1Y,
    size: 9.5,
    font: fontBoldOblique,
    color: rgb(0, 0.502, 0.627), // #0080a0
  });

  // 2. SULLAIR (Green)
  const sullairX = margin + 82;
  page.drawText('SULLAIR', {
    x: sullairX,
    y: r1Y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0.518, 0.239), // #00843D
  });

  // 3. DENAIR
  const denairX = margin + 172;
  if (denairImg) {
    const dH = 13;
    const dW = dH * (denairImg.width / denairImg.height);
    page.drawImage(denairImg, {
      x: denairX,
      y: r1Y - 2,
      width: dW,
      height: dH,
    });
  } else {
    page.drawText('DENAIR', {
      x: denairX,
      y: r1Y,
      size: 12,
      font: fontBoldOblique,
      color: cDenairGreen,
    });
  }

  // 4. KAESER COMPRESSORS Badge (Black Box with Yellow text)
  const kaeserX = margin + 266;
  page.drawRectangle({
    x: kaeserX,
    y: r1Y - 4,
    width: 62,
    height: 18,
    color: cBlack,
  });
  page.drawText('KAESER', {
    x: kaeserX + 8,
    y: r1Y + 4,
    size: 7.5,
    font: fontBold,
    color: cWhite,
  });
  page.drawText('COMPRESSORS', {
    x: kaeserX + 5,
    y: r1Y - 2,
    size: 5,
    font: fontBold,
    color: rgb(0.98, 0.8, 0.08), // #facc15 yellow
  });

  // 5. Atlas Copco (Red) with Top Red Line
  const acRedX = margin + 342;
  page.drawLine({
    start: { x: acRedX, y: r1Y + 9 },
    end: { x: acRedX + 55, y: r1Y + 9 },
    thickness: 1.5,
    color: rgb(0.851, 0.176, 0.125), // #D92D20
  });
  page.drawText('Atlas Copco', {
    x: acRedX,
    y: r1Y,
    size: 8,
    font: fontBold,
    color: rgb(0.851, 0.176, 0.125),
  });

  // 6. SOLLANT (Red Italic)
  const sollantX = margin + 412;
  page.drawText('SOLLANT', {
    x: sollantX,
    y: r1Y,
    size: 10,
    font: fontBoldOblique,
    color: rgb(0.89, 0.106, 0.137), // #E31B23
  });

  // 7. Atlas Copco (Script/serif)
  const acScriptX = margin + 482;
  page.drawText('Atlas Copco', {
    x: acScriptX,
    y: r1Y,
    size: 8,
    font: fontBoldOblique,
    color: rgb(0.851, 0.176, 0.125),
  });

  // ROW 2: DOOSAN | JMG | CompAir
  const r2Y = curY - 36;

  // 8. DOOSAN (Navy bold)
  page.drawText('DOOSAN', {
    x: margin + 6,
    y: r2Y,
    size: 10.5,
    font: fontBold,
    color: rgb(0, 0.22, 0.396), // #003865
  });

  // 9. JMG (Italic Navy with red underline)
  const jmgX = margin + (contentWidth - 30) / 2;
  page.drawText('JMG', {
    x: jmgX,
    y: r2Y,
    size: 11,
    font: fontBoldOblique,
    color: rgb(0.039, 0.145, 0.251), // #0A2540
  });
  page.drawLine({
    start: { x: jmgX, y: r2Y - 3 },
    end: { x: jmgX + 28, y: r2Y - 3 },
    thickness: 1.6,
    color: rgb(0.86, 0.15, 0.15),
  });

  // 10. CompAir (Blue Bold)
  const compAirX = margin + contentWidth - 45;
  page.drawText('CompAir', {
    x: compAirX,
    y: r2Y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0.333, 0.588), // #005596
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
