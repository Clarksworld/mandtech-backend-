import PDFDocument from 'pdfkit';

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

function formatNaira(num: number): string {
  return Number(num || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: `Mandtech-${data.invoice_number}`,
          Author: 'Mandtech Services Limited',
          Subject: `${data.doc_type === 'invoice' ? 'Invoice' : 'Quotation'} ${data.invoice_number}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // ── Top Brand Accent Strip ──
      doc.rect(0, 0, pageWidth, 6).fill('#16a34a');

      // ── Company Header ──
      let y = 28;
      doc.fillColor('#15803d').fontSize(18).font('Helvetica-Bold')
        .text('MANDTECH SERVICES LIMITED', margin, y);
      
      y += 22;
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold')
        .text('RC - 9324886  •  DISTRIBUTORS OF DENAIR AIR COMPRESSORS IN NIGERIA', margin, y);

      y += 14;
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b')
        .text('54 Old Refinery Road, Elelenwo, Port-Harcourt  |  mandtechserviceslimited@gmail.com  |  Sales/Service: 08186538644', margin, y);

      y += 14;
      doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(1).strokeColor('#cbd5e1').stroke();

      // ── Document Badge & Meta ──
      y += 12;
      const docTitle = data.doc_type === 'invoice' ? 'COMMERCIAL TAX INVOICE' : 'FORMAL COMMERCIAL QUOTATION';
      
      doc.rect(margin, y, contentWidth, 26).fill('#f8fafc');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12)
        .text(docTitle, margin + 10, y + 7);

      doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(11)
        .text(`REF: ${data.invoice_number}`, margin, y + 7, { align: 'right', width: contentWidth - 10 });

      // ── Two-Column Client & Order Details ──
      y += 34;
      const colWidth = (contentWidth - 16) / 2;

      // Left Column: Customer Bill To
      doc.rect(margin, y, colWidth, 75).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
      doc.rect(margin, y, colWidth, 18).fill('#f1f5f9');
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('CLIENT & SITE INFORMATION', margin + 8, y + 5);

      let clientY = y + 24;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(data.company || 'Customer Company', margin + 8, clientY);
      clientY += 12;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text(`Attention: ${data.contact_name || 'Procurement Team'}`, margin + 8, clientY);
      clientY += 11;
      if (data.contact_phone || data.email) {
        doc.text(`Phone: ${data.contact_phone || '—'}  |  Email: ${data.email || '—'}`, margin + 8, clientY);
        clientY += 11;
      }
      if (data.billing_address) {
        doc.text(`Site: ${data.billing_address.slice(0, 55)}`, margin + 8, clientY);
      }

      // Right Column: Quotation Meta
      const rightX = margin + colWidth + 16;
      doc.rect(rightX, y, colWidth, 75).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
      doc.rect(rightX, y, colWidth, 18).fill('#f1f5f9');
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5).text('DOCUMENT SPECIFICATIONS', rightX + 8, y + 5);

      let metaY = y + 24;
      const dateStr = data.created_at ? new Date(data.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text('Date of Issue:', rightX + 8, metaY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(dateStr, rightX + 90, metaY);

      metaY += 12;
      doc.font('Helvetica').fillColor('#475569').text('Delivery Terms:', rightX + 8, metaY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(data.delivery_terms || 'EXW Yard / Site Delivery', rightX + 90, metaY);

      metaY += 12;
      doc.font('Helvetica').fillColor('#475569').text('Currency:', rightX + 8, metaY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text('Nigerian Naira (NGN =N=)', rightX + 90, metaY);

      metaY += 12;
      doc.font('Helvetica').fillColor('#475569').text('Representative:', rightX + 8, metaY);
      doc.font('Helvetica-Bold').fillColor('#16a34a').text(data.sales_person || 'Mandtech Commercial Desk', rightX + 90, metaY);

      // ── Line Items Table ──
      y += 86;
      const tableX = margin;
      const colSn = 24;
      const colPart = 85;
      const colQty = 34;
      const colPrice = 85;
      const colTotal = 85;
      const colDesc = contentWidth - (colSn + colPart + colQty + colPrice + colTotal);

      // Table Header
      doc.rect(tableX, y, contentWidth, 20).fill('#0f172a');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.text('S/N', tableX + 4, y + 6);
      doc.text('PART / CODE', tableX + colSn + 4, y + 6);
      doc.text('DESCRIPTION / SPECIFICATIONS', tableX + colSn + colPart + 6, y + 6);
      doc.text('QTY', tableX + colSn + colPart + colDesc, y + 6, { width: colQty, align: 'center' });
      doc.text('UNIT PRICE (=N=)', tableX + colSn + colPart + colDesc + colQty, y + 6, { width: colPrice - 6, align: 'right' });
      doc.text('TOTAL (=N=)', tableX + colSn + colPart + colDesc + colQty + colPrice, y + 6, { width: colTotal - 6, align: 'right' });

      y += 20;

      // Table Rows
      const items = data.line_items && data.line_items.length > 0 ? data.line_items : [
        { sn: 1, part_number: 'GENUINE', product_name: 'Equipment / Part Requisition', qty: 1, unit_price: data.total || 0, total: data.total || 0 }
      ];

      items.forEach((item, idx) => {
        const rowHeight = 22;
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(tableX, y, contentWidth, rowHeight).fill(bg);
        doc.rect(tableX, y, contentWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        doc.font('Helvetica').fontSize(8).fillColor('#334155');
        doc.text(String(item.sn || idx + 1), tableX + 4, y + 6);
        doc.font('Helvetica-Bold').text(item.part_number || 'OEM', tableX + colSn + 4, y + 6, { width: colPart - 6, ellipsis: true });
        
        const title = item.product_name || item.description || 'Industrial Machinery Equipment';
        doc.font('Helvetica').text(title, tableX + colSn + colPart + 6, y + 6, { width: colDesc - 12, ellipsis: true });

        doc.text(String(item.qty), tableX + colSn + colPart + colDesc, y + 6, { width: colQty, align: 'center' });
        doc.text(formatNaira(item.unit_price), tableX + colSn + colPart + colDesc + colQty, y + 6, { width: colPrice - 6, align: 'right' });
        
        const lineTotal = item.total !== undefined ? item.total : item.qty * item.unit_price;
        doc.font('Helvetica-Bold').text(formatNaira(lineTotal), tableX + colSn + colPart + colDesc + colQty + colPrice, y + 6, { width: colTotal - 6, align: 'right' });

        y += rowHeight;
      });

      // ── Summary & Totals ──
      y += 6;
      const summaryWidth = 240;
      const summaryX = pageWidth - margin - summaryWidth;

      const subtotalVal = data.subtotal || data.total;
      const discountVal = data.discount_amount || (data.discount_pct ? (subtotalVal * (data.discount_pct / 100)) : 0);
      const vatVal = data.vat_amount || ((subtotalVal - discountVal) * 0.075);
      const grandTotal = data.total;

      const drawSummaryRow = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
        if (isHighlight) {
          doc.rect(summaryX, y, summaryWidth, 20).fill('#dcfce7');
          doc.rect(summaryX, y, summaryWidth, 20).strokeColor('#16a34a').lineWidth(1).stroke();
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#15803d');
          doc.text(label, summaryX + 8, y + 5);
          doc.text(`=N= ${value}`, summaryX, y + 5, { width: summaryWidth - 8, align: 'right' });
          y += 23;
        } else {
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(isBold ? '#0f172a' : '#475569');
          doc.text(label, summaryX + 4, y);
          doc.text(`=N= ${value}`, summaryX, y, { width: summaryWidth - 4, align: 'right' });
          y += 14;
        }
      };

      drawSummaryRow('SUBTOTAL', formatNaira(subtotalVal));
      if (discountVal > 0) {
        drawSummaryRow(`DISCOUNT (${data.discount_pct || 0}%)`, `-${formatNaira(discountVal)}`);
      }
      drawSummaryRow('VAT (7.5%)', formatNaira(vatVal));
      drawSummaryRow('TOTAL CONTRACT VALUE', formatNaira(grandTotal), true, true);

      // Amount in Words
      if (data.amount_in_words) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b')
          .text(`Amount in Words: ${data.amount_in_words}`, margin, y - 48, { width: contentWidth - summaryWidth - 16 });
      }

      // ── Banking Details Box ──
      y = Math.max(y + 8, 520);
      doc.rect(margin, y, contentWidth, 54).fill('#f8fafc');
      doc.rect(margin, y, contentWidth, 54).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('DESIGNATED STERLING BANK SETTLEMENT ACCOUNT:', margin + 10, y + 6);
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      doc.text('Account Name: MANDTECH SERVICES LIMITED', margin + 10, y + 20);
      doc.text('Bank Name: STERLING BANK PLC', margin + 10, y + 32);
      doc.font('Helvetica-Bold').fillColor('#15803d').text('Account Number: 01433839162 (NGN Current)', margin + 10, y + 43);

      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text('TIN: 33865000001', margin + 300, y + 20);
      doc.text('Payment Terms: 100% Upfront with Purchase Order (LPO)', margin + 300, y + 32);
      doc.text('Validity: 14 Calendar Days from Date of Quotation', margin + 300, y + 43);

      // ── Commercial Terms & Clauses ──
      y += 62;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text('STANDARD COMMERCIAL CLAUSES:', margin, y);
      y += 11;
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
      const termsText = data.terms || [
        '1. Equipment/parts delivery is Ex-Works Port Harcourt base or as expressly agreed upon with customer.',
        '2. Spares and components are factory OEM certified and guaranteed against manufacturing defects.',
        '3. Remittance must be made directly to Mandtech Services Limited designated Sterling Bank account only.',
      ].join('\n');

      doc.text(termsText, margin, y, { width: contentWidth, lineGap: 1.5 });

      // ── Footer / Signature Block ──
      const bottomY = doc.page.height - 48;
      doc.moveTo(margin, bottomY).lineTo(pageWidth - margin, bottomY).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#15803d')
        .text('MANDTECH SERVICES LIMITED — OFFSHORE & ONSHORE AIR COMPRESSOR FLEET ENGINEERING', margin, bottomY + 5, { align: 'center', width: contentWidth });
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
        .text('This is a verified computer-generated commercial document. Port-Harcourt • Lagos • Warri', margin, bottomY + 16, { align: 'center', width: contentWidth });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
