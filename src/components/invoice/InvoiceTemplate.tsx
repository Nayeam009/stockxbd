import { forwardRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod?: string;
  notes?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ data, businessName = "Stock-X LPG", businessPhone = "+880 1234-567890", businessAddress = "Dhaka, Bangladesh" }, ref) => {
    const { t, language } = useLanguage();

    const formatCurrency = (amount: number) => {
      return language === "bn" 
        ? `৳${amount.toLocaleString("bn-BD")}`
        : `৳${amount.toLocaleString()}`;
    };

    const toBanglaNumber = (num: number) => {
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return num.toString().split('').map(d => banglaDigits[parseInt(d)] || d).join('');
    };

    const formatNumber = (num: number) => {
      return language === "bn" ? toBanglaNumber(num) : num.toString();
    };

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-[800px] mx-auto font-sans print:p-4" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold text-primary mb-1">{businessName}</h1>
          <p className="text-sm text-gray-600">{businessAddress}</p>
          <p className="text-sm text-gray-600">{language === "bn" ? "ফোন" : "Phone"}: {businessPhone}</p>
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold border-2 border-black inline-block px-8 py-2">
            {language === "bn" ? "চালান / Invoice" : "Invoice / চালান"}
          </h2>
        </div>

        {/* Invoice Details */}
        <div className="flex justify-between mb-6">
          <div>
            <p className="font-semibold">{language === "bn" ? "গ্রাহক" : "Customer"}:</p>
            <p className="font-bold text-lg">{data.customerName}</p>
            {data.customerPhone && <p>{data.customerPhone}</p>}
            {data.customerAddress && <p className="text-sm text-gray-600">{data.customerAddress}</p>}
          </div>
          <div className="text-right">
            <p>
              <span className="font-semibold">{language === "bn" ? "চালান নং" : "Invoice No"}:</span>{" "}
              <span className="font-bold">{data.invoiceNumber}</span>
            </p>
            <p>
              <span className="font-semibold">{language === "bn" ? "তারিখ" : "Date"}:</span>{" "}
              {format(data.date, "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border-2 border-black mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">
                {language === "bn" ? "ক্রম" : "SL"}
              </th>
              <th className="border border-black p-2 text-left">
                {language === "bn" ? "পণ্যের বিবরণ" : "Item Description"}
              </th>
              <th className="border border-black p-2 text-center w-20">
                {language === "bn" ? "পরিমাণ" : "Qty"}
              </th>
              <th className="border border-black p-2 text-right w-28">
                {language === "bn" ? "একক মূল্য" : "Unit Price"}
              </th>
              <th className="border border-black p-2 text-right w-28">
                {language === "bn" ? "মোট" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-black p-2 text-center">{formatNumber(index + 1)}</td>
                <td className="border border-black p-2">{item.name}</td>
                <td className="border border-black p-2 text-center">{formatNumber(item.quantity)}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.price)}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-72">
            <div className="flex justify-between py-1 border-b border-gray-300">
              <span>{language === "bn" ? "উপমোট" : "Subtotal"}:</span>
              <span>{formatCurrency(data.subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-300 text-green-600">
                <span>{language === "bn" ? "ছাড়" : "Discount"}:</span>
                <span>-{formatCurrency(data.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-black font-bold text-lg">
              <span>{language === "bn" ? "সর্বমোট" : "Grand Total"}:</span>
              <span>{formatCurrency(data.total)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>{language === "bn" ? "পরিশোধিত" : "Paid"}:</span>
              <span className="text-green-600">{formatCurrency(data.paid)}</span>
            </div>
            {data.due > 0 && (
              <div className="flex justify-between py-1 font-bold text-red-600">
                <span>{language === "bn" ? "বাকি" : "Due"}:</span>
                <span>{formatCurrency(data.due)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        {data.paymentMethod && (
          <div className="mb-4">
            <span className="font-semibold">{language === "bn" ? "পেমেন্ট পদ্ধতি" : "Payment Method"}: </span>
            <span className="capitalize">{data.paymentMethod}</span>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="mb-6 p-3 bg-gray-50 rounded border">
            <p className="font-semibold">{language === "bn" ? "নোট" : "Notes"}:</p>
            <p className="text-sm">{data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-8">
          <div className="flex justify-between items-end">
            <div className="text-center">
              <div className="border-t border-black w-40 pt-1">
                {language === "bn" ? "গ্রাহকের স্বাক্ষর" : "Customer Signature"}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-40 pt-1">
                {language === "bn" ? "বিক্রেতার স্বাক্ষর" : "Seller Signature"}
              </div>
            </div>
          </div>
          <p className="text-center mt-6 text-sm text-gray-500">
            {language === "bn" 
              ? "আপনার ব্যবসার জন্য ধন্যবাদ! | Thank you for your business!"
              : "Thank you for your business! | আপনার ব্যবসার জন্য ধন্যবাদ!"}
          </p>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";
