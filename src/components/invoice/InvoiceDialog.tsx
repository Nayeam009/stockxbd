import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
}

export const InvoiceDialog = ({
  open,
  onOpenChange,
  invoiceData,
  businessName,
  businessPhone,
  businessAddress,
}: InvoiceDialogProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printContent = invoiceRef.current.innerHTML;
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice - ${invoiceData?.invoiceNumber}</title>
              <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Hind Siliguri', sans-serif; padding: 20px; }
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
                .border-black { border-color: #000; }
                .border-gray-300 { border-color: #d1d5db; }
                .border-collapse { border-collapse: collapse; }
                .p-2 { padding: 8px; }
                .p-3 { padding: 12px; }
                .p-8 { padding: 32px; }
                .py-1 { padding-top: 4px; padding-bottom: 4px; }
                .py-2 { padding-top: 8px; padding-bottom: 8px; }
                .px-8 { padding-left: 32px; padding-right: 32px; }
                .pb-4 { padding-bottom: 16px; }
                .pt-1 { padding-top: 4px; }
                .pt-4 { padding-top: 16px; }
                .mb-1 { margin-bottom: 4px; }
                .mb-4 { margin-bottom: 16px; }
                .mb-6 { margin-bottom: 24px; }
                .mt-6 { margin-top: 24px; }
                .mt-8 { margin-top: 32px; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .max-w-\\[800px\\] { max-width: 800px; }
                .w-full { width: 100%; }
                .w-12 { width: 48px; }
                .w-20 { width: 80px; }
                .w-28 { width: 112px; }
                .w-40 { width: 160px; }
                .w-72 { width: 288px; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .text-sm { font-size: 14px; }
                .text-lg { font-size: 18px; }
                .text-2xl { font-size: 24px; }
                .text-3xl { font-size: 30px; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .capitalize { text-transform: capitalize; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .justify-end { justify-content: flex-end; }
                .items-end { align-items: flex-end; }
                .inline-block { display: inline-block; }
                .bg-gray-50 { background-color: #f9fafb; }
                .bg-gray-100 { background-color: #f3f4f6; }
                .rounded { border-radius: 4px; }
                table { width: 100%; }
                th, td { border: 1px solid black; padding: 8px; }
                th { background-color: #f3f4f6; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t("invoice")} - {invoiceData.invoiceNumber}</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                {t("print_receipt")}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Invoice preview and print options
          </DialogDescription>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          <InvoiceTemplate
            ref={invoiceRef}
            data={invoiceData}
            businessName={businessName}
            businessPhone={businessPhone}
            businessAddress={businessAddress}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
