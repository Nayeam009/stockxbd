import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { GatePassTemplate } from "./GatePassTemplate";
import { Printer, FileDown, Receipt, Truck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { escapeHtml } from "@/lib/validationSchemas";

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
  customerPhone?: string;
  customerAddress?: string;
  driver?: string;
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

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  onExportPDF?: () => void;
}

export const InvoiceDialog = ({
  open,
  onOpenChange,
  invoiceData,
  businessName,
  businessPhone,
  businessAddress,
  onExportPDF,
}: InvoiceDialogProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const gatePassRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [printType, setPrintType] = useState<'bill' | 'gatepass'>('bill');

  const handlePrint = (type: 'bill' | 'gatepass') => {
    const ref = type === 'bill' ? invoiceRef : gatePassRef;
    const title = type === 'bill' ? 'Invoice' : 'Gate Pass';
    
    if (ref.current) {
      // Use outerHTML so the top-level container (with sizing/padding/fonts) is preserved.
      // Also strip any embedded <style> tags from the template to avoid print CSS that can hide content.
      const cloned = ref.current.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('style').forEach((s) => s.remove());

      const printContent = cloned.outerHTML;
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        // Use escapeHtml for dynamic title content to prevent XSS
        const safeTitle = escapeHtml(title);
        const safeInvoiceNumber = escapeHtml(invoiceData?.invoiceNumber || '');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${safeTitle} - ${safeInvoiceNumber}</title>
              <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', Arial, sans-serif; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                  body { padding: 0; }
                }
                .bg-white { background: white; }
                .text-black { color: black; }
                .text-gray-600 { color: #666; }
                .text-gray-500 { color: #888; }
                .text-green-600 { color: #16a34a; }
                .text-red-600 { color: #dc2626; }
                .text-primary { color: #1e3a8a; }
                .border { border: 1px solid #000; }
                .border-2 { border: 2px solid #000; }
                .border-b { border-bottom: 1px solid #000; }
                .border-b-2 { border-bottom: 2px solid #000; }
                .border-t { border-top: 1px solid #000; }
                .border-t-2 { border-top: 2px solid #000; }
                .border-dashed { border-style: dashed; }
                .border-black { border-color: #000; }
                .border-gray-300 { border-color: #d1d5db; }
                .border-gray-400 { border-color: #9ca3af; }
                .border-collapse { border-collapse: collapse; }
                .p-2 { padding: 8px; }
                .p-3 { padding: 12px; }
                .p-6 { padding: 24px; }
                .p-8 { padding: 32px; }
                .py-1 { padding-top: 4px; padding-bottom: 4px; }
                .py-2 { padding-top: 8px; padding-bottom: 8px; }
                .px-4 { padding-left: 16px; padding-right: 16px; }
                .px-8 { padding-left: 32px; padding-right: 32px; }
                .pb-3 { padding-bottom: 12px; }
                .pb-4 { padding-bottom: 16px; }
                .pt-1 { padding-top: 4px; }
                .pt-4 { padding-top: 16px; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .mb-6 { margin-bottom: 24px; }
                .mt-4 { margin-top: 16px; }
                .mt-6 { margin-top: 24px; }
                .mt-8 { margin-top: 32px; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .max-w-600 { max-width: 600px; }
                .max-w-800 { max-width: 800px; }
                .w-full { width: 100%; }
                .w-12 { width: 48px; }
                .w-20 { width: 80px; }
                .w-28 { width: 112px; }
                .w-32 { width: 128px; }
                .w-40 { width: 160px; }
                .w-72 { width: 288px; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .text-xs { font-size: 12px; }
                .text-sm { font-size: 14px; }
                .text-lg { font-size: 18px; }
                .text-xl { font-size: 20px; }
                .text-2xl { font-size: 24px; }
                .text-3xl { font-size: 30px; }
                .text-10px { font-size: 10px; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .capitalize { text-transform: capitalize; }
                .flex { display: flex; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-4 { gap: 16px; }
                .justify-between { justify-content: space-between; }
                .justify-end { justify-content: flex-end; }
                .items-end { align-items: flex-end; }
                .inline-block { display: inline-block; }
                .bg-white { background-color: white; }
                .bg-black { background-color: black; color: white; }
                .bg-gray-50 { background-color: #f9fafb; }
                .bg-gray-100 { background-color: #f3f4f6; }
                .bg-gray-200 { background-color: #e5e7eb; }
                .rounded { border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; }
                th { background-color: #f3f4f6; }
                tfoot td { background-color: #f3f4f6; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for content and fonts to load before printing
        printWindow.onload = () => {
          // Wait for fonts to be ready
          if (printWindow.document.fonts && printWindow.document.fonts.ready) {
            printWindow.document.fonts.ready.then(() => {
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
                printWindow.close();
              }, 100);
            }).catch(() => {
              // Fallback if fonts.ready fails
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
                printWindow.close();
              }, 500);
            });
          } else {
            // Fallback for older browsers
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }
        };
      }
    }
  };

  if (!invoiceData) return null;

  // Prepare gate pass data (no prices)
  const gatePassData = {
    invoiceNumber: invoiceData.invoiceNumber,
    date: invoiceData.date,
    customer: invoiceData.customer || {
      name: invoiceData.customerName || 'Walk-in Customer',
      phone: invoiceData.customerPhone,
      address: invoiceData.customerAddress
    },
    driver: invoiceData.driver,
    items: invoiceData.items.map(item => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity
    }))
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>{t("invoice")} - {invoiceData.invoiceNumber}</span>
            <div className="flex gap-2 flex-wrap">
              {onExportPDF && (
                <Button onClick={onExportPDF} size="sm" variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Print Customer Bill or Driver Gate Pass
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="bill" className="w-full" onValueChange={(val) => setPrintType(val as 'bill' | 'gatepass')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="bill" className="gap-2">
              <Receipt className="h-4 w-4" />
              Customer Bill
            </TabsTrigger>
            <TabsTrigger value="gatepass" className="gap-2">
              <Truck className="h-4 w-4" />
              Driver Gate Pass
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bill">
            <div className="border rounded-lg overflow-hidden">
              <InvoiceTemplate
                ref={invoiceRef}
                data={invoiceData}
                businessName={businessName}
                businessPhone={businessPhone}
                businessAddress={businessAddress}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => handlePrint('bill')} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Customer Bill
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="gatepass">
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <GatePassTemplate
                ref={gatePassRef}
                data={gatePassData}
                businessName={businessName}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => handlePrint('gatepass')} className="gap-2" variant="secondary">
                <Printer className="h-4 w-4" />
                Print Gate Pass (Driver)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};