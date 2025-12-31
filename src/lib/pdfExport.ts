import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

// Generate PDF from Invoice Data
export const generateInvoicePDF = async (
  invoiceData: InvoiceData,
  business: BusinessInfo = defaultBusiness
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Colors
  const primaryColor: [number, number, number] = [16, 163, 127]; // Green
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  // Header with gradient effect
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name, margin, y + 10);

  // Business Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(business.address, margin, y + 18);
  doc.text(`Phone: ${business.phone}`, margin, y + 25);

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin - 35, y + 15);
  
  y = 55;

  // Invoice Details Section
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details', margin, y);
  
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const customerName = invoiceData.customerName || invoiceData.customer?.name || 'Walk-in Customer';
  const invoiceDate = invoiceData.date instanceof Date 
    ? invoiceData.date.toLocaleDateString('en-BD') 
    : new Date(invoiceData.date).toLocaleDateString('en-BD');

  // Two column layout for details
  doc.text(`Invoice No: ${invoiceData.invoiceNumber}`, margin, y);
  doc.text(`Date: ${invoiceDate}`, pageWidth / 2 + 10, y);
  
  y += 6;
  doc.text(`Customer: ${customerName}`, margin, y);
  if (invoiceData.customer?.phone) {
    doc.text(`Phone: ${invoiceData.customer.phone}`, pageWidth / 2 + 10, y);
  }
  
  if (invoiceData.customer?.address) {
    y += 6;
    doc.text(`Address: ${invoiceData.customer.address}`, margin, y);
  }

  y += 15;

  // Items Table
  const tableHeaders = ['#', 'Item Description', 'Qty', 'Unit Price', 'Total'];
  const colWidths = [15, 80, 20, 35, 35];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = margin;

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y - 5, tableWidth, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  
  let xPos = tableX + 2;
  tableHeaders.forEach((header, i) => {
    doc.text(header, xPos, y);
    xPos += colWidths[i];
  });

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  invoiceData.items.forEach((item, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    xPos = tableX + 2;
    const unitPrice = item.price ?? item.unitPrice ?? 0;
    const itemTotal = item.total || (unitPrice * item.quantity);
    const itemName = item.description ? `${item.name} - ${item.description}` : item.name;

    doc.text(String(index + 1), xPos, y);
    xPos += colWidths[0];
    
    // Truncate long names
    const truncatedName = itemName.length > 35 ? itemName.substring(0, 35) + '...' : itemName;
    doc.text(truncatedName, xPos, y);
    xPos += colWidths[1];
    
    doc.text(String(item.quantity), xPos, y);
    xPos += colWidths[2];
    
    doc.text(`৳${unitPrice.toLocaleString()}`, xPos, y);
    xPos += colWidths[3];
    
    doc.text(`৳${itemTotal.toLocaleString()}`, xPos, y);

    // Draw bottom border
    doc.setDrawColor(220, 220, 220);
    doc.line(tableX, y + 3, tableX + tableWidth, y + 3);

    y += 8;
  });

  y += 10;

  // Totals Section (Right aligned)
  const totalsX = pageWidth - margin - 80;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.text(`৳${invoiceData.subtotal.toLocaleString()}`, totalsX + 50, y);
  
  if (invoiceData.discount > 0) {
    y += 7;
    doc.setTextColor(16, 163, 127);
    doc.text('Discount:', totalsX, y);
    doc.text(`-৳${invoiceData.discount.toLocaleString()}`, totalsX + 50, y);
  }
  
  y += 10;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y - 3, totalsX + 80, y - 3);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, y);
  doc.text(`৳${invoiceData.total.toLocaleString()}`, totalsX + 50, y);

  // Payment Status
  y += 15;
  doc.setFontSize(10);
  
  const isPaid = invoiceData.paymentStatus === 'paid' || invoiceData.paymentStatus === 'completed';
  const statusColor: [number, number, number] = isPaid ? [16, 163, 127] : [220, 38, 38];
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(totalsX, y - 5, 80, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(isPaid ? 'PAID' : 'PAYMENT DUE', totalsX + 25, y + 2);

  // Notes
  if (invoiceData.notes) {
    y += 25;
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Notes:', margin, y);
    y += 5;
    doc.text(invoiceData.notes, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated by ${business.name}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save PDF
  const fileName = `Invoice_${invoiceData.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Generate PDF from Report Data
export const generateReportPDF = async (
  reportData: ReportData,
  business: BusinessInfo = defaultBusiness
): Promise<void> => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // Colors
  const primaryColor: [number, number, number] = [16, 163, 127];
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name, margin, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(business.address + ' | ' + business.phone, margin, y + 16);

  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportData.title, pageWidth - margin, y + 12, { align: 'right' });

  y = 45;

  // Summary Cards (if available)
  if (reportData.summary && reportData.summary.length > 0) {
    const cardWidth = (pageWidth - margin * 2 - 10 * (reportData.summary.length - 1)) / reportData.summary.length;
    let cardX = margin;

    reportData.summary.forEach((item) => {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(cardX, y, cardWidth, 20, 3, 3, 'F');
      
      doc.setTextColor(...mutedColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, cardX + 5, y + 7);
      
      doc.setTextColor(...textColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, cardX + 5, y + 15);
      
      cardX += cardWidth + 10;
    });

    y += 30;
  }

  // Table
  const colCount = reportData.headers.length;
  const colWidth = (pageWidth - margin * 2) / colCount;
  const tableX = margin;

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y, pageWidth - margin * 2, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);

  let xPos = tableX + 3;
  reportData.headers.forEach((header) => {
    const truncatedHeader = header.length > 12 ? header.substring(0, 12) + '..' : header;
    doc.text(truncatedHeader, xPos, y + 6);
    xPos += colWidth;
  });

  y += 12;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const maxRowsPerPage = Math.floor((pageHeight - y - 30) / 7);
  let rowCount = 0;

  reportData.rows.forEach((row) => {
    if (rowCount >= maxRowsPerPage) {
      doc.addPage();
      y = 20;
      rowCount = 0;
      
      // Redraw header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, y, pageWidth - margin * 2, 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      xPos = tableX + 3;
      reportData.headers.forEach((header) => {
        const truncatedHeader = header.length > 12 ? header.substring(0, 12) + '..' : header;
        doc.text(truncatedHeader, xPos, y + 6);
        xPos += colWidth;
      });
      
      y += 12;
      doc.setFont('helvetica', 'normal');
    }

    xPos = tableX + 3;
    doc.setTextColor(...textColor);

    row.forEach((cell) => {
      const cellStr = String(cell ?? '');
      const truncatedCell = cellStr.length > 15 ? cellStr.substring(0, 15) + '..' : cellStr;
      doc.text(truncatedCell, xPos, y);
      xPos += colWidth;
    });

    // Row separator
    doc.setDrawColor(230, 230, 230);
    doc.line(tableX, y + 2, pageWidth - margin, y + 2);

    y += 7;
    rowCount++;
  });

  // Footer
  const footerY = pageHeight - 10;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(7);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-BD')} | ${business.name}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save PDF
  const fileName = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Export from HTML element (for complex layouts)
export const exportElementToPDF = async (
  element: HTMLElement,
  fileName: string,
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<void> => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = 10;
  let remainingHeight = imgHeight;

  while (remainingHeight > 0) {
    if (y > 10) {
      pdf.addPage();
      y = 10;
    }

    const sourceY = (imgHeight - remainingHeight) * (canvas.height / imgHeight);
    const heightToDraw = Math.min(pageHeight - 20, remainingHeight);

    pdf.addImage(
      imgData,
      'PNG',
      10,
      y,
      imgWidth,
      imgHeight,
      undefined,
      'FAST',
      0
    );

    remainingHeight -= heightToDraw;
    y += heightToDraw;
  }

  pdf.save(`${fileName}.pdf`);
};
