import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, FileSpreadsheet, X } from "lucide-react";
import { generateReportPDF } from "@/lib/pdfExport";
import { toast } from "sonner";

interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: { label: string; value: string }[];
}

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportData | null;
}

export const ReportPreviewDialog = ({ 
  open, 
  onOpenChange, 
  report 
}: ReportPreviewDialogProps) => {
  if (!report) return null;

  const handleExportCSV = () => {
    const csvContent = [
      report.headers.join(','),
      ...report.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${report.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    toast.success('Report exported to CSV');
  };

  const handleExportPDF = async () => {
    try {
      await generateReportPDF(report);
      toast.success('Report exported to PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {report.title}
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="preview" className="text-sm">Preview</TabsTrigger>
              <TabsTrigger value="export" className="text-sm">Export</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="m-0 p-4 pt-3">
            {/* Summary Cards */}
            {report.summary && report.summary.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {report.summary.map((item, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-bold mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <ScrollArea className="h-[350px] rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <TableRow>
                    {report.headers.map((header, idx) => (
                      <TableHead key={idx} className="text-xs font-semibold whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.length > 0 ? (
                    report.rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="hover:bg-muted/30">
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="text-xs py-2 whitespace-nowrap">
                            {typeof cell === 'string' && (cell.includes('Out of Stock') || cell.includes('Low Stock')) ? (
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] ${
                                  cell.includes('Out of Stock') 
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-200' 
                                    : cell.includes('Low Stock')
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                }`}
                              >
                                {cell}
                              </Badge>
                            ) : (
                              cell
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={report.headers.length} className="text-center py-8 text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="export" className="m-0 p-4 pt-3">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a format to download this report:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group"
                  onClick={handleExportCSV}
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Export CSV</p>
                    <p className="text-xs text-muted-foreground">Spreadsheet format</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-3 border-2 hover:border-rose-500 hover:bg-rose-500/5 transition-all group"
                  onClick={handleExportPDF}
                >
                  <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-rose-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Export PDF</p>
                    <p className="text-xs text-muted-foreground">Printable document</p>
                  </div>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center pt-2">
                {report.rows.length} records will be included in the export
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewDialog;
