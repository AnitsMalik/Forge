import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface InvoicePdfData {
  invoiceNumber: string;
  date: Date | string;
  paidAt?: Date | string | null;
  amountPaidCents: number;
  currency: string;
  status: string;
  provider: string;
  providerInvoiceId?: string | null;
  tenantName: string;
  tenantSlug?: string;
  customerEmail?: string;
  planName?: string;
  billingInterval?: string;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  taxId?: string | null;
  taxCents?: number;
  subtotalCents?: number;
  isGstApplicable?: boolean;
  billingAddress?: string | null;
}

export class InvoicePdfGenerator {
  public static async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 45,
          info: {
            Title: `HoaspForge Invoice ${data.invoiceNumber}`,
            Author: 'HoaspForge Technologies Inc.',
            Subject: `Billing Receipt ${data.invoiceNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const amountFormatted = (data.amountPaidCents / 100).toFixed(2);
        const curr = (data.currency || 'USD').toUpperCase();
        const invoiceDate = data.date ? new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
        const paidDate = data.paidAt ? new Date(data.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : invoiceDate;
        const cycleRange = data.periodStart && data.periodEnd
          ? `${new Date(data.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(data.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : 'Monthly Subscription';

        // 1. Brand Header Banner
        doc.rect(45, 45, 505, 55).fill('#0f172a');

        doc.fillColor('#8b5cf6').fontSize(20).font('Helvetica-Bold').text('SOCIALFORGE', 60, 58);
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('Multi-Tenant Enterprise Social Automation', 60, 80);

        doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('OFFICIAL INVOICE & RECEIPT', 300, 58, { align: 'right', width: 235 });
        doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text(`STATUS: ${data.status.toUpperCase()}`, 300, 78, { align: 'right', width: 235 });

        // 2. Invoice Meta & Customer Details
        let y = 120;
        doc.fillColor('#0f172a');

        // Left Column: Bill To
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('BILLED TO', 45, y);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(data.tenantName, 45, y + 14);
        let leftY = y + 30;
        if (data.customerEmail) {
          doc.fontSize(9).font('Helvetica').fillColor('#475569').text(data.customerEmail, 45, leftY);
          leftY += 14;
        }
        if (data.tenantSlug) {
          doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(`Workspace: @${data.tenantSlug}`, 45, leftY);
          leftY += 14;
        }
        if (data.taxId) {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#7c3aed').text(`GSTIN / Tax ID: ${data.taxId}`, 45, leftY);
          leftY += 14;
        }
        if (data.billingAddress) {
          doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(data.billingAddress, 45, leftY, { width: 260 });
        }

        // Right Column: Invoice Details
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('INVOICE DETAILS', 340, y);
        doc.fontSize(9).font('Helvetica').fillColor('#334155');
        doc.text(`Invoice Number:`, 340, y + 14);
        doc.font('Helvetica-Bold').text(data.invoiceNumber, 430, y + 14, { align: 'right', width: 120 });

        doc.font('Helvetica').text(`Invoice Date:`, 340, y + 28);
        doc.font('Helvetica-Bold').text(invoiceDate, 430, y + 28, { align: 'right', width: 120 });

        doc.font('Helvetica').text(`Date Paid:`, 340, y + 42);
        doc.font('Helvetica-Bold').text(paidDate, 430, y + 42, { align: 'right', width: 120 });

        doc.font('Helvetica').text(`Payment Gateway:`, 340, y + 56);
        doc.font('Helvetica-Bold').text((data.provider || 'Stripe').toUpperCase(), 430, y + 56, { align: 'right', width: 120 });

        if (data.providerInvoiceId) {
          doc.font('Helvetica').text(`Provider Ref:`, 340, y + 70);
          doc.fontSize(7.5).font('Helvetica').text(data.providerInvoiceId, 400, y + 70, { align: 'right', width: 150 });
        }

        // 3. Line Items Table Header
        y = 230;
        doc.rect(45, y, 505, 24).fill('#f1f5f9');
        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
        doc.text('ITEM DESCRIPTION', 55, y + 7);
        doc.text('BILLING PERIOD', 280, y + 7);
        doc.text('UNIT PRICE', 400, y + 7, { align: 'right', width: 60 });
        doc.text('AMOUNT', 475, y + 7, { align: 'right', width: 65 });

        // Table Row: Primary Subscription
        y += 32;
        doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
        const planTitle = data.planName ? `${data.planName} Plan Subscription` : 'Commercial SaaS Platform Subscription';
        doc.text(planTitle, 55, y);

        doc.fontSize(8).font('Helvetica').fillColor('#64748b');
        doc.text(`Recurring ${data.billingInterval || 'monthly'} multi-brand marketing automation quotas & API entitlements.`, 55, y + 14);
        if (data.isGstApplicable || data.taxId) {
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#6d28d9').text('HSN/SAC: 998313 • Cloud Computing & Information Technology Software Services', 55, y + 26);
        }

        const subtotalCents = data.subtotalCents || (data.isGstApplicable ? Math.round(data.amountPaidCents / 1.18) : data.amountPaidCents);
        const subtotalFormatted = (subtotalCents / 100).toFixed(2);
        const taxCents = data.taxCents || (data.amountPaidCents - subtotalCents);
        const taxFormatted = (taxCents / 100).toFixed(2);

        doc.fontSize(9).font('Helvetica').fillColor('#334155');
        doc.text(cycleRange, 280, y + 4);
        doc.text(`$${subtotalFormatted}`, 400, y + 4, { align: 'right', width: 60 });
        doc.font('Helvetica-Bold').text(`$${subtotalFormatted} ${curr}`, 465, y + 4, { align: 'right', width: 75 });

        // Divider
        y += 50;
        doc.moveTo(45, y).lineTo(550, y).strokeColor('#e2e8f0').lineWidth(1).stroke();

        // 4. Totals Summary Table
        y += 15;
        const totalX = 340;
        const valX = 450;
        const valW = 90;

        doc.fontSize(9).font('Helvetica').fillColor('#475569');
        doc.text('Subtotal (Exclusive of Tax):', totalX, y);
        doc.text(`$${subtotalFormatted}`, valX, y, { align: 'right', width: valW });

        if (data.isGstApplicable && taxCents > 0) {
          const halfTaxFormatted = ((taxCents / 2) / 100).toFixed(2);
          y += 18;
          doc.text('CGST (9.0% Central GST):', totalX, y);
          doc.text(`$${halfTaxFormatted}`, valX, y, { align: 'right', width: valW });

          y += 18;
          doc.text('SGST (9.0% State GST):', totalX, y);
          doc.text(`$${halfTaxFormatted}`, valX, y, { align: 'right', width: valW });
        } else {
          y += 18;
          doc.text('Tax / VAT (0% Included):', totalX, y);
          doc.text('$0.00', valX, y, { align: 'right', width: valW });
        }

        y += 18;
        doc.moveTo(totalX, y).lineTo(550, y).strokeColor('#cbd5e1').lineWidth(1).stroke();

        y += 8;
        doc.rect(totalX - 10, y - 4, 220, 32).fill('#f8fafc').strokeColor('#8b5cf6').lineWidth(1).stroke();
        doc.fillColor('#8b5cf6').fontSize(11).font('Helvetica-Bold');
        doc.text('TOTAL PAID:', totalX, y + 6);
        doc.text(`$${amountFormatted} ${curr}`, valX - 10, y + 6, { align: 'right', width: 100 });

        // 5. Payment Security Badge Box
        y += 60;
        doc.rect(45, y, 505, 45).fill('#faf5ff').strokeColor('#d8b4fe').lineWidth(1).stroke();
        doc.fillColor('#6b21a8').fontSize(9).font('Helvetica-Bold');
        doc.text('PAYMENT PROCESSED & VERIFIED VIA STRIPE', 55, y + 10);
        doc.fontSize(8).font('Helvetica').fillColor('#581c87');
        doc.text('This receipt confirms payment for automated social workflows. Transaction secured via 256-bit encryption.', 55, y + 24);

        // 6. Footer
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
        doc.text('HoaspForge Technologies Inc. • 100 Enterprise Way • Wilmington, DE • USA', 45, 750, { align: 'center', width: 505 });
        doc.text('Questions or custom invoicing? Contact billing@socialforge.io • All rights reserved.', 45, 764, { align: 'center', width: 505 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
