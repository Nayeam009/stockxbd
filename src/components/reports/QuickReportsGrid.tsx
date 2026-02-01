import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Package, Users, DollarSign, Calendar, Loader2 } from "lucide-react";

interface QuickReportsGridProps {
  onGenerateReport: (type: string) => void;
  isGenerating: boolean;
  userRole: string;
}

const reportTypes = [
  {
    id: 'daily-sales',
    title: 'Daily Sales',
    description: "Today's transactions",
    icon: Receipt,
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    roles: ['owner', 'manager']
  },
  {
    id: 'stock-status',
    title: 'Stock Status',
    description: 'Current inventory',
    icon: Package,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    roles: ['owner', 'manager']
  },
  {
    id: 'customer-analysis',
    title: 'Customer Dues',
    description: 'Outstanding balances',
    icon: Users,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    roles: ['owner', 'manager']
  },
  {
    id: 'financial-summary',
    title: 'Financial Summary',
    description: 'Income vs expenses',
    icon: DollarSign,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    roles: ['owner']
  },
  {
    id: 'monthly-report',
    title: 'Monthly Report',
    description: 'Month breakdown',
    icon: Calendar,
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
    roles: ['owner', 'manager']
  }
];

export const QuickReportsGrid = ({ 
  onGenerateReport, 
  isGenerating, 
  userRole 
}: QuickReportsGridProps) => {
  const filteredReports = reportTypes.filter(r => r.roles.includes(userRole));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          Quick Reports
        </CardTitle>
        <CardDescription className="text-xs">
          Generate instant business reports with one click
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {filteredReports.map((report) => (
            <Button
              key={report.id}
              variant="outline"
              className="h-auto py-4 px-3 flex flex-col items-center gap-2 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              onClick={() => onGenerateReport(report.id)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className={`h-10 w-10 rounded-xl ${report.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <report.icon className={`h-5 w-5 ${report.iconColor}`} />
                </div>
              )}
              <div className="text-center">
                <p className="text-xs font-medium">{report.title}</p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{report.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickReportsGrid;
