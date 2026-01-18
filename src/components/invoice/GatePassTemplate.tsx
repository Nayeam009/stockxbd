import { forwardRef } from "react";
import { format } from "date-fns";

interface GatePassItem {
  name: string;
  description?: string;
  quantity: number;
}

interface GatePassData {
  invoiceNumber: string;
  date: Date | string;
  customer?: {
    name: string;
    phone?: string;
    address?: string;
  };
  driver?: string;
  items: GatePassItem[];
}

interface GatePassTemplateProps {
  data: GatePassData;
  businessName?: string;
}

export const GatePassTemplate = forwardRef<HTMLDivElement, GatePassTemplateProps>(
  ({ data, businessName = "Stock-X LPG" }, ref) => {
    const customerName = data.customer?.name || "Customer";
    const customerAddress = data.customer?.address;
    const customerPhone = data.customer?.phone;
    
    const gatePassDate = data.date instanceof Date ? data.date : new Date(data.date);

    return (
      <div ref={ref} className="bg-white text-black p-6 max-w-[600px] mx-auto font-sans print:p-4" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-black pb-3 mb-4">
          <h1 className="text-xl font-bold mb-1">{businessName}</h1>
          <h2 className="text-lg font-bold bg-black text-white px-4 py-1 inline-block">
            🚛 GATE PASS / ডেলিভারি চালান
          </h2>
        </div>

        {/* Gate Pass Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p><strong>Gate Pass No:</strong> {data.invoiceNumber}</p>
            <p><strong>Date:</strong> {isNaN(gatePassDate.getTime()) ? 'N/A' : format(gatePassDate, "dd/MM/yyyy HH:mm")}</p>
            {data.driver && <p><strong>Driver:</strong> {data.driver}</p>}
          </div>
          <div className="text-right">
            <p><strong>Deliver To:</strong></p>
            <p className="font-semibold">{customerName}</p>
            {customerPhone && <p>{customerPhone}</p>}
            {customerAddress && <p className="text-xs">{customerAddress}</p>}
          </div>
        </div>

        {/* Items Table - NO PRICES */}
        <table className="w-full border-collapse border-2 border-black mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 text-center w-12">SL</th>
              <th className="border border-black p-2 text-left">Item Description</th>
              <th className="border border-black p-2 text-center w-20">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item, index) => {
              const itemName = item.description ? `${item.name} - ${item.description}` : item.name;
              return (
                <tr key={index}>
                  <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                  <td className="border border-black p-2">{itemName}</td>
                  <td className="border border-black p-2 text-center font-bold text-lg">{item.quantity}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-black p-2 text-right">Total Items:</td>
              <td className="border border-black p-2 text-center text-lg">
                {data.items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Verification Section */}
        <div className="border-2 border-dashed border-gray-400 p-3 mb-4 bg-gray-50">
          <p className="text-xs text-center text-gray-600 mb-2">
            ⚠️ This is a DELIVERY SLIP for driver verification only. No prices shown.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><strong>Empty Collected:</strong> ________ pcs</p>
              <p><strong>Leaked/Problem:</strong> ________ pcs</p>
            </div>
            <div>
              <p><strong>Cash Collected:</strong> ৳ ____________</p>
              <p><strong>bKash/Nagad:</strong> ৳ ____________</p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-4 border-t border-black">
          <div className="text-center">
            <div className="border-t border-black w-32 pt-1 text-xs">
              Warehouse Keeper
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-32 pt-1 text-xs">
              Driver Signature
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-32 pt-1 text-xs">
              Customer Signature
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center mt-4 text-[10px] text-gray-500">
          Driver must verify items before leaving • Customer must check items before signing
        </p>
      </div>
    );
  }
);

GatePassTemplate.displayName = "GatePassTemplate";