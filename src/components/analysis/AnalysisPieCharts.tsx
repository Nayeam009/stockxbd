import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CreditCard, Wallet } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

interface AnalysisPieChartsProps {
  paymentData: PieDataItem[];
  expenseData: PieDataItem[];
  isMobile?: boolean;
}

const PieChartCard = ({ 
  title, 
  icon: Icon, 
  data, 
  isMobile,
  emptyMessage 
}: { 
  title: string; 
  icon: React.ElementType; 
  data: PieDataItem[]; 
  isMobile?: boolean;
  emptyMessage: string;
}) => (
  <Card className="border-0 shadow-lg">
    <CardHeader className="pb-2 px-3 pt-3">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-2 pb-3">
      <div className="h-[200px] sm:h-[240px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 30 : 45}
                outerRadius={isMobile ? 55 : 75}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`,
                  ''
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs">{value}</span>}
                wrapperStyle={{ paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export const AnalysisPieCharts = ({ paymentData, expenseData, isMobile }: AnalysisPieChartsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PieChartCard
        title="Payment Methods"
        icon={CreditCard}
        data={paymentData}
        isMobile={isMobile}
        emptyMessage="No payment data"
      />
      <PieChartCard
        title="Expense Categories"
        icon={Wallet}
        data={expenseData}
        isMobile={isMobile}
        emptyMessage="No expense data"
      />
    </div>
  );
};

export default AnalysisPieCharts;
