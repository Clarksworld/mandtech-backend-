import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  
  // Set metadata
  pdfDoc.setTitle(`Mandtech-${data.invoice_number}`);
  pdfDoc.setAuthor('Mandtech Services Limited');
  pdfDoc.setSubject(`${data.doc_type === 'invoice' ? 'Invoice' : 'Quotation'} ${data.invoice_number}`);

  // Embed standard safe fonts (no external file dependencies)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // A4 dimensions: 595.28 x 841.89 points
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 36;
  const contentWidth = width - margin * 2;

  // Colors
  const greenBrand = rgb(0.086, 0.502, 0.239);    // #16803d
  const greenLight = rgb(0.863, 0.988, 0.906);    // #dcfce7
  const darkCharcoal = rgb(0.059, 0.09, 0.165);   // #0f172a
  const slateDark = rgb(0.2, 0.255, 0.333);       // #334155
  const slateLight = rgb(0.392, 0.455, 0.545);     // #64748b
  const bgLight = rgb(0.973, 0.98, 0.988);        // #f8fafc
  const borderLight = rgb(0.886, 0.91, 0.941);    // #e2e8f0

  // Top accent bar
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 6,
    color: rgb(0.086, 0.639, 0.29),
  });

  // Top company header
  let curY = height - 36;
  page.drawText('MANDTECH SERVICES LIMITED', {
    x: margin,
    y: curY,
    size: 16,
    font: fontBold,
    color: greenBrand,
  });

  curY -= 16;
  page.drawText('RC - 9324886  |  DISTRIBUTORS OF DENAIR AIR COMPRESSORS IN NIGERIA', {
    x: margin,
    y: curY,
    size: 8,
    font: fontBold,
    color: slateDark,
  });

  curY -= 12;
  page.drawText('54 Old Refinery Road, Elelenwo, Port-Harcourt | mandtechserviceslimited@gmail.com | 08186538644', {
    x: margin,
    y: curY,
    size: 7.5,
    font: fontRegular,
    color: slateLight,
  });

  // Divider line
  curY -= 10;
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: width - margin, y: curY },
    thickness: 0.8,
    color: borderLight,
  });

  // Document Badge (Quotation / Invoice)
  curY -= 28;
  page.drawRectangle({
    x: margin,
    y: curY,
    width: contentWidth,
    height: 24,
    color: bgLight,
  });

  const docTitle = data.doc_type === 'invoice' ? 'COMMERCIAL TAX INVOICE' : 'FORMAL COMMERCIAL QUOTATION';
  page.drawText(docTitle, {
    x: margin + 8,
    y: curY + 7,
    size: 10,
    font: fontBold,
    color: darkCharcoal,
  });

  const refText = `REF: ${data.invoice_number}`;
  const refWidth = fontBold.widthOfTextAtSize(refText, 10);
  page.drawText(refText, {
    x: width - margin - refWidth - 8,
    y: curY + 7,
    size: 10,
    font: fontBold,
    color: greenBrand,
  });

  // Two-column Client & Document meta box
  curY -= 82;
  const colW = (contentWidth - 12) / 2;
  const boxH = 74;

  // Left: Client Box
  page.drawRectangle({
    x: margin,
    y: curY,
    width: colW,
    height: boxH,
    borderColor: borderLight,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: margin,
    y: curY + boxH - 16,
    width: colW,
    height: 16,
    color: bgLight,
  });
  page.drawText('CLIENT & SITE INFORMATION', {
    x: margin + 6,
    y: curY + boxH - 12,
    size: 7.5,
    font: fontBold,
    color: slateDark,
  });

  let clientY = curY + boxH - 28;
  page.drawText((data.company || 'Customer Organization').slice(0, 40), {
    x: margin + 6,
    y: clientY,
    size: 8.5,
    font: fontBold,
    color: darkCharcoal,
  });
  clientY -= 11;
  page.drawText(`Attn: ${(data.contact_name || 'Procurement Team').slice(0, 36)}`, {
    x: margin + 6,
    y: clientY,
    size: 7.5,
    font: fontRegular,
    color: slateLight,
  });
  clientY -= 10;
  page.drawText(`Phone: ${data.contact_phone || '—'}  |  Email: ${data.email || '—'}`.slice(0, 48), {
    x: margin + 6,
    y: clientY,
    size: 7,
    font: fontRegular,
    color: slateLight,
  });
  if (data.billing_address) {
    clientY -= 10;
    page.drawText(`Site: ${data.billing_address.slice(0, 46)}`, {
      x: margin + 6,
      y: clientY,
      size: 7,
      font: fontRegular,
      color: slateLight,
    });
  }

  // Right: Document Specs Box
  const rightX = margin + colW + 12;
  page.drawRectangle({
    x: rightX,
    y: curY,
    width: colW,
    height: boxH,
    borderColor: borderLight,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: rightX,
    y: curY + boxH - 16,
    width: colW,
    height: 16,
    color: bgLight,
  });
  page.drawText('DOCUMENT SPECIFICATIONS', {
    x: rightX + 6,
    y: curY + boxH - 12,
    size: 7.5,
    font: fontBold,
    color: slateDark,
  });

  let metaY = curY + boxH - 28;
  const dateStr = data.created_at
    ? new Date(data.created_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const metaRows: [string, string][] = [
    ['Date of Issue:', dateStr],
    ['Delivery Terms:', (data.delivery_terms || 'EXW Yard / Site').slice(0, 26)],
    ['Currency:', 'Nigerian Naira (NGN =N=)'],
    ['Prepared by:', (data.sales_person || 'Mandtech Commercial').slice(0, 26)],
  ];

  metaRows.forEach(([lbl, val]) => {
    page.drawText(lbl, { x: rightX + 6, y: metaY, size: 7.5, font: fontRegular, color: slateLight });
    page.drawText(val, { x: rightX + 85, y: metaY, size: 7.5, font: fontBold, color: darkCharcoal });
    metaY -= 11;
  });

  // Line items table
  curY -= 28;
  const colSn = 22;
  const colPart = 76;
  const colQty = 32;
  const colPrice = 82;
  const colTotal = 82;
  const colDesc = contentWidth - (colSn + colPart + colQty + colPrice + colTotal);

  // Table header bar
  page.drawRectangle({
    x: margin,
    y: curY,
    width: contentWidth,
    height: 18,
    color: darkCharcoal,
  });

  let thX = margin;
  page.drawText('S/N', { x: thX + 3, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) }); thX += colSn;
  page.drawText('PART / CODE', { x: thX + 3, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) }); thX += colPart;
  page.drawText('DESCRIPTION / SPECIFICATIONS', { x: thX + 3, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) }); thX += colDesc;
  page.drawText('QTY', { x: thX + 8, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) }); thX += colQty;
  page.drawText('UNIT (=N=)', { x: thX + 18, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) }); thX += colPrice;
  page.drawText('TOTAL (=N=)', { x: thX + 14, y: curY + 5, size: 7, font: fontBold, color: rgb(1, 1, 1) });

  const items = (data.line_items && data.line_items.length > 0) ? data.line_items : [
    { sn: 1, part_number: 'GENUINE', product_name: 'Equipment / Requisition Item', description: '', qty: 1, unit_price: data.total || 0, total: data.total || 0 }
  ];

  // Draw rows
  items.slice(0, 10).forEach((item, idx) => {
    curY -= 18;
    const isEven = idx % 2 === 0;
    if (!isEven) {
      page.drawRectangle({
        x: margin,
        y: curY,
        width: contentWidth,
        height: 18,
        color: bgLight,
      });
    }

    page.drawLine({
      start: { x: margin, y: curY },
      end: { x: width - margin, y: curY },
      thickness: 0.4,
      color: borderLight,
    });

    let trX = margin;
    page.drawText(String(item.sn ?? idx + 1), { x: trX + 4, y: curY + 5, size: 7, font: fontRegular, color: slateDark }); trX += colSn;
    page.drawText((item.part_number || 'OEM').slice(0, 14), { x: trX + 3, y: curY + 5, size: 7, font: fontBold, color: slateDark }); trX += colPart;
    const descText = (item.product_name || item.description || 'Industrial Machinery Equipment').slice(0, 52);
    page.drawText(descText, { x: trX + 3, y: curY + 5, size: 7, font: fontRegular, color: slateDark }); trX += colDesc;
    page.drawText(String(item.qty || 1), { x: trX + 12, y: curY + 5, size: 7, font: fontRegular, color: slateDark }); trX += colQty;
    
    const uPrice = fmtNaira(item.unit_price);
    page.drawText(uPrice, { x: trX + 10, y: curY + 5, size: 7, font: fontRegular, color: slateDark }); trX += colPrice;

    const lineTotal = item.total !== undefined ? item.total : (item.qty || 1) * (item.unit_price || 0);
    const totPrice = fmtNaira(lineTotal);
    page.drawText(totPrice, { x: trX + 10, y: curY + 5, size: 7, font: fontBold, color: darkCharcoal });
  });

  // Bottom border of table
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: width - margin, y: curY },
    thickness: 0.8,
    color: darkCharcoal,
  });

  // Totals Summary Block
  curY -= 16;
  const sw = 220;
  const sx = width - margin - sw;

  const sub = data.subtotal || data.total;
  const disc = data.discount_amount || (data.discount_pct ? (sub * (data.discount_pct / 100)) : 0);
  const vat = data.vat_amount ?? ((sub - disc) * 0.075);
  const grand = data.total;

  // Subtotal row
  curY -= 12;
  page.drawText('SUBTOTAL:', { x: sx + 6, y: curY, size: 8, font: fontRegular, color: slateLight });
  page.drawText(`=N= ${fmtNaira(sub)}`, { x: sx + 110, y: curY, size: 8, font: fontRegular, color: darkCharcoal });

  if (disc > 0) {
    curY -= 12;
    page.drawText(`DISCOUNT (${data.discount_pct ?? 0}%):`, { x: sx + 6, y: curY, size: 8, font: fontRegular, color: slateLight });
    page.drawText(`-=N= ${fmtNaira(disc)}`, { x: sx + 110, y: curY, size: 8, font: fontRegular, color: darkCharcoal });
  }

  curY -= 12;
  page.drawText('VAT (7.5%):', { x: sx + 6, y: curY, size: 8, font: fontRegular, color: slateLight });
  page.drawText(`=N= ${fmtNaira(vat)}`, { x: sx + 110, y: curY, size: 8, font: fontRegular, color: darkCharcoal });

  // Grand Total highlight box
  curY -= 24;
  page.drawRectangle({
    x: sx,
    y: curY,
    width: sw,
    height: 20,
    color: greenLight,
    borderColor: greenBrand,
    borderWidth: 0.8,
  });
  page.drawText('TOTAL CONTRACT:', { x: sx + 6, y: curY + 6, size: 8.5, font: fontBold, color: greenBrand });
  page.drawText(`=N= ${fmtNaira(grand)}`, { x: sx + 105, y: curY + 6, size: 9, font: fontBold, color: greenBrand });

  // Amount in words
  if (data.amount_in_words) {
    page.drawText(`In Words: ${data.amount_in_words}`.slice(0, 75), {
      x: margin,
      y: curY + 6,
      size: 7,
      font: fontBold,
      color: slateDark,
    });
  }

  // Sterling Bank payment info
  curY -= 58;
  page.drawRectangle({
    x: margin,
    y: curY,
    width: contentWidth,
    height: 50,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 0.8,
  });

  page.drawText('DESIGNATED STERLING BANK SETTLEMENT ACCOUNT:', {
    x: margin + 8,
    y: curY + 36,
    size: 7.5,
    font: fontBold,
    color: darkCharcoal,
  });

  page.drawText('Account Name: MANDTECH SERVICES LIMITED', { x: margin + 8, y: curY + 24, size: 7.5, font: fontRegular, color: slateDark });
  page.drawText('Bank: STERLING BANK PLC', { x: margin + 8, y: curY + 13, size: 7.5, font: fontRegular, color: slateDark });
  page.drawText('Account Number: 01433839162 (NGN Current)', { x: margin + 8, y: curY + 2, size: 7.5, font: fontBold, color: greenBrand });

  page.drawText('TIN: 33865000001', { x: margin + 280, y: curY + 24, size: 7.5, font: fontRegular, color: slateLight });
  page.drawText('Payment Terms: 100% Upfront with Purchase Order (LPO)', { x: margin + 280, y: curY + 13, size: 7.5, font: fontRegular, color: slateLight });
  page.drawText('Validity: 14 Calendar Days from Date of Quotation', { x: margin + 280, y: curY + 2, size: 7.5, font: fontRegular, color: slateLight });

  // Commercial Terms
  curY -= 48;
  page.drawText('STANDARD COMMERCIAL TERMS & CONDITIONS:', {
    x: margin,
    y: curY + 36,
    size: 7.5,
    font: fontBold,
    color: darkCharcoal,
  });

  const termsLine1 = '1. Equipment & parts delivery is Ex-Works Port Harcourt base or as expressly agreed upon with customer.';
  const termsLine2 = '2. Spares and components are factory OEM certified and guaranteed against manufacturing defects.';
  const termsLine3 = '3. Remittance must be made directly to Mandtech Services Limited designated Sterling Bank account only.';
  page.drawText(termsLine1, { x: margin, y: curY + 24, size: 6.8, font: fontRegular, color: slateLight });
  page.drawText(termsLine2, { x: margin, y: curY + 14, size: 6.8, font: fontRegular, color: slateLight });
  page.drawText(termsLine3, { x: margin, y: curY + 4, size: 6.8, font: fontRegular, color: slateLight });

  // Footer bar
  page.drawLine({
    start: { x: margin, y: 34 },
    end: { x: width - margin, y: 34 },
    thickness: 0.5,
    color: borderLight,
  });

  const foot1 = 'MANDTECH SERVICES LIMITED — OFFSHORE & ONSHORE AIR COMPRESSOR FLEET ENGINEERING';
  const foot1W = fontBold.widthOfTextAtSize(foot1, 7);
  page.drawText(foot1, {
    x: (width - foot1W) / 2,
    y: 22,
    size: 7,
    font: fontBold,
    color: greenBrand,
  });

  const foot2 = 'Computer-generated commercial document. Port-Harcourt • Lagos • Warri • Abuja';
  const foot2W = fontRegular.widthOfTextAtSize(foot2, 6.5);
  page.drawText(foot2, {
    x: (width - foot2W) / 2,
    y: 12,
    size: 6.5,
    font: fontRegular,
    color: slateLight,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
