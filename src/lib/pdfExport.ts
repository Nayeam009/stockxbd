import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  tagline?: string;
}

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: Date | string;
  customerName?: string;
  customer?: {
    name: string;
    phone?: string;
    address?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid?: number;
  due?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
}

interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: { label: string; value: string }[];
}

const defaultBusiness: BusinessInfo = {
  name: 'Stock-X LPG',
  phone: '+880 1234-567890',
  address: 'Dhaka, Bangladesh',
  tagline: 'Your Trusted LPG Partner'
};

// Colors
const primaryColor = rgb(16 / 255, 163 / 255, 127 / 255);
const textColor = rgb(30 / 255, 30 / 255, 30 / 255);
const mutedColor = rgb(100 / 255, 100 / 255, 100 / 255);
const headerBgColor = rgb(240 / 255, 240 / 255, 240 / 255);
const lightBorderColor = rgb(220 / 255, 220 / 255, 220 / 255);

// Helper to draw text
const drawText = (
  page: PDFPage, 
  text: string, 
  x: number, 
  y: number, 
  font: PDFFont, 
  size: number, 
  color = textColor
) => {
  page.drawText(text, { x, y, size, font, color });
};

// Helper to truncate text
const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// Generate PDF from Invoice Data
export const generateInvoicePDF = async (
  invoiceData: InvoiceData,
  business: BusinessInfo = defaultBusiness
): Promise<void> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  let y = height - 50;

  // Header with background
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: primaryColor,
  });

  // Business Name
  drawText(page, business.name, margin, height - 35, fontBold, 22, rgb(1, 1, 1));
  drawText(page, business.address, margin, height - 52, fontRegular, 10, rgb(1, 1, 1));
  drawText(page, `Phone: ${business.phone}`, margin, height - 65, fontRegular, 10, rgb(1, 1, 1));

  // Invoice Title
  drawText(page, 'INVOICE', width - margin - 70, height - 45, fontBold, 16, rgb(1, 1, 1));

  y = height - 110;

  // Invoice Details Section
  drawText(page, 'Invoice Details', margin, y, fontBold, 12, textColor);
  y -= 20;

  const customerName = invoiceData.customerName || invoiceData.customer?.name || 'Walk-in Customer';
  const invoiceDate = invoiceData.date instanceof Date 
    ? invoiceData.date.toLocaleDateString('en-BD') 
    : new Date(invoiceData.date).toLocaleDateString('en-BD');

  drawText(page, `Invoice No: ${invoiceData.invoiceNumber}`, margin, y, fontRegular, 10, textColor);
  drawText(page, `Date: ${invoiceDate}`, width / 2 + 30, y, fontRegular, 10, textColor);
  y -= 15;
  
  drawText(page, `Customer: ${customerName}`, margin, y, fontRegular, 10, textColor);
  if (invoiceData.customer?.phone) {
    drawText(page, `Phone: ${invoiceData.customer.phone}`, width / 2 + 30, y, fontRegular, 10, textColor);
  }
  
  if (invoiceData.customer?.address) {
    y -= 15;
    drawText(page, `Address: ${invoiceData.customer.address}`, margin, y, fontRegular, 10, textColor);
  }

  y -= 35;

  // Items Table Header
  const tableHeaders = ['#', 'Item Description', 'Qty', 'Unit Price', 'Total'];
  const colWidths = [30, 220, 50, 80, 80];
  const tableX = margin;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Table Header Background
  page.drawRectangle({
    x: tableX,
    y: y - 5,
    width: tableWidth,
    height: 20,
    color: headerBgColor,
  });

  let xPos = tableX + 5;
  tableHeaders.forEach((header, i) => {
    drawText(page, header, xPos, y, fontBold, 9, textColor);
    xPos += colWidths[i];
  });

  y -= 25;

  // Table Rows
  invoiceData.items.forEach((item, index) => {
    if (y < 100) return; // Prevent overflow

    xPos = tableX + 5;
    const unitPrice = item.price ?? item.unitPrice ?? 0;
    const itemTotal = item.total || (unitPrice * item.quantity);
    const itemName = item.description ? `${item.name} - ${item.description}` : item.name;

    drawText(page, String(index + 1), xPos, y, fontRegular, 9, textColor);
    xPos += colWidths[0];
    
    drawText(page, truncateText(itemName, 40), xPos, y, fontRegular, 9, textColor);
    xPos += colWidths[1];
    
    drawText(page, String(item.quantity), xPos, y, fontRegular, 9, textColor);
    xPos += colWidths[2];
    
    drawText(page, `Tk ${unitPrice.toLocaleString()}`, xPos, y, fontRegular, 9, textColor);
    xPos += colWidths[3];
    
    drawText(page, `Tk ${itemTotal.toLocaleString()}`, xPos, y, fontRegular, 9, textColor);

    // Draw row border
    page.drawLine({
      start: { x: tableX, y: y - 8 },
      end: { x: tableX + tableWidth, y: y - 8 },
      thickness: 0.5,
      color: lightBorderColor,
    });

    y -= 18;
  });

  y -= 20;

  // Totals Section
  const totalsX = width - margin - 150;
  
  drawText(page, 'Subtotal:', totalsX, y, fontRegular, 10, textColor);
  drawText(page, `Tk ${invoiceData.subtotal.toLocaleString()}`, totalsX + 80, y, fontRegular, 10, textColor);
  
  if (invoiceData.discount > 0) {
    y -= 15;
    drawText(page, 'Discount:', totalsX, y, fontRegular, 10, primaryColor);
    drawText(page, `-Tk ${invoiceData.discount.toLocaleString()}`, totalsX + 80, y, fontRegular, 10, primaryColor);
  }
  
  y -= 20;
  
  // Total line
  page.drawLine({
    start: { x: totalsX, y: y + 12 },
    end: { x: totalsX + 140, y: y + 12 },
    thickness: 1,
    color: primaryColor,
  });

  drawText(page, 'Total:', totalsX, y, fontBold, 12, primaryColor);
  drawText(page, `Tk ${invoiceData.total.toLocaleString()}`, totalsX + 80, y, fontBold, 12, primaryColor);

  // Payment Status Badge
  y -= 30;
  const isPaid = invoiceData.paymentStatus === 'paid' || invoiceData.paymentStatus === 'completed';
  const statusColor = isPaid ? primaryColor : rgb(220 / 255, 38 / 255, 38 / 255);
  
  page.drawRectangle({
    x: totalsX,
    y: y - 5,
    width: 100,
    height: 20,
    color: statusColor,
  });
  
  drawText(page, isPaid ? 'PAID' : 'PAYMENT DUE', totalsX + 20, y, fontBold, 10, rgb(1, 1, 1));

  // Notes
  if (invoiceData.notes) {
    y -= 40;
    drawText(page, 'Notes:', margin, y, fontRegular, 9, mutedColor);
    y -= 12;
    drawText(page, invoiceData.notes, margin, y, fontRegular, 9, mutedColor);
  }

  // Footer
  const footerY = 40;
  page.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: width - margin, y: footerY + 15 },
    thickness: 0.5,
    color: lightBorderColor,
  });
  
  const thankYouText = 'Thank you for your business!';
  const thankYouWidth = fontRegular.widthOfTextAtSize(thankYouText, 9);
  drawText(page, thankYouText, (width - thankYouWidth) / 2, footerY, fontRegular, 9, mutedColor);

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${invoiceData.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Generate PDF from Report Data
export const generateReportPDF = async (
  reportData: ReportData,
  business: BusinessInfo = defaultBusiness
): Promise<void> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 Landscape
  const { width, height } = page.getSize();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 40;
  let y = height - 40;

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 60,
    width: width,
    height: 60,
    color: primaryColor,
  });

  drawText(page, business.name, margin, height - 30, fontBold, 16, rgb(1, 1, 1));
  drawText(page, `${business.address} | ${business.phone}`, margin, height - 45, fontRegular, 9, rgb(1, 1, 1));
  
  // Report Title (right aligned)
  const titleWidth = fontBold.widthOfTextAtSize(reportData.title, 12);
  drawText(page, reportData.title, width - margin - titleWidth, height - 35, fontBold, 12, rgb(1, 1, 1));

  y = height - 80;

  // Summary Cards
  if (reportData.summary && reportData.summary.length > 0) {
    const cardWidth = (width - margin * 2 - 15 * (reportData.summary.length - 1)) / reportData.summary.length;
    let cardX = margin;

    reportData.summary.forEach((item) => {
      page.drawRectangle({
        x: cardX,
        y: y - 35,
        width: cardWidth,
        height: 40,
        color: headerBgColor,
      });
      
      drawText(page, item.label, cardX + 10, y - 12, fontRegular, 8, mutedColor);
      drawText(page, item.value, cardX + 10, y - 28, fontBold, 11, textColor);
      
      cardX += cardWidth + 15;
    });

    y -= 55;
  }

  // Table
  const colCount = reportData.headers.length;
  const colWidth = (width - margin * 2) / colCount;
  const tableX = margin;

  // Table Header
  page.drawRectangle({
    x: tableX,
    y: y - 5,
    width: width - margin * 2,
    height: 20,
    color: headerBgColor,
  });

  let xPos = tableX + 5;
  reportData.headers.forEach((header) => {
    drawText(page, truncateText(header, 15), xPos, y, fontBold, 8, textColor);
    xPos += colWidth;
  });

  y -= 25;

  // Table Rows
  const maxRows = Math.min(reportData.rows.length, 20); // Limit rows per page
  
  for (let i = 0; i < maxRows; i++) {
    const row = reportData.rows[i];
    
    if (y < 50) break;

    xPos = tableX + 5;
    row.forEach((cell) => {
      const cellStr = String(cell ?? '');
      drawText(page, truncateText(cellStr, 18), xPos, y, fontRegular, 8, textColor);
      xPos += colWidth;
    });

    // Row separator
    page.drawLine({
      start: { x: tableX, y: y - 5 },
      end: { x: width - margin, y: y - 5 },
      thickness: 0.5,
      color: lightBorderColor,
    });

    y -= 15;
  }

  // Footer
  const footerText = `Generated on ${new Date().toLocaleString('en-BD')} | ${business.name}`;
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 7);
  drawText(page, footerText, (width - footerWidth) / 2, 20, fontRegular, 7, mutedColor);

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export from HTML element using browser print
export const exportElementToPDF = async (
  element: HTMLElement,
  fileName: string,
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<void> => {
  // Use browser's print functionality for HTML elements
  // This provides better styling support than canvas-based approaches
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.');
  }

  // Get computed styles
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  const orientation = options?.orientation || 'portrait';
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          ${styles}
          @page {
            size: A4 ${orientation};
            margin: 1cm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
};
