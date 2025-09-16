import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  Package, 
  Plus, 
  Minus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { StockItem } from "@/hooks/useDashboardData";

interface LPGStockModuleProps {
  stockData: StockItem[];
  setStockData: (data: StockItem[]) => void;
}

export const LPGStockModule = ({ stockData, setStockData }: LPGStockModuleProps) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);

  // Filter only cylinder stock
  const cylinderStock = stockData.filter(item => item.type === 'cylinder');

  // Calculate analytics
  const analytics = useMemo(() => {
    const lowStock = cylinderStock.filter(item => item.currentStock <= item.minStock);
    const totalValue = cylinderStock.reduce((sum, item) => sum + (item.currentStock * item.price), 0);
    const totalStock = cylinderStock.reduce((sum, item) => sum + item.currentStock, 0);
    
    return {
      lowStockItems: lowStock.length,
      totalValue,
      totalStock,
      stockHealth: cylinderStock.length > 0 ? 
        ((cylinderStock.length - lowStock.length) / cylinderStock.length) * 100 : 0
    };
  }, [cylinderStock]);

  const getStockStatus = (item: StockItem) => {
    const percentage = (item.currentStock / item.maxStock) * 100;
    if (item.currentStock <= item.minStock) return { status: 'critical', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (percentage <= 30) return { status: 'low', color: 'text-warning', bg: 'bg-warning/10' };
    if (percentage <= 60) return { status: 'medium', color: 'text-info', bg: 'bg-info/10' };
    return { status: 'good', color: 'text-accent', bg: 'bg-accent/10' };
  };

  const adjustStock = (itemId: string, adjustment: number, type: 'in' | 'out') => {
    setStockData(stockData.map(item => {
      if (item.id === itemId) {
        const newStock = type === 'in' 
          ? item.currentStock + adjustment 
          : Math.max(0, item.currentStock - adjustment);
        
        return {
          ...item,
          currentStock: newStock,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    }));
    setAdjustmentQuantity(0);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">LPG Stock Management</h2>
          <p className="text-muted-foreground">Real-time tracking of cylinder inventory levels</p>
        </div>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Package className="h-4 w-4 mr-2" />
          Stock Report
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Value
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analytics.totalStock} cylinders in stock</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Health
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.stockHealth.toFixed(0)}%</div>
            <Progress value={analytics.stockHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{analytics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below minimum stock</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Updated
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">Just now</div>
            <p className="text-xs text-muted-foreground">Auto-sync enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items */}
      <div className="grid gap-6">
        {cylinderStock.map((item) => {
          const stockStatus = getStockStatus(item);
          const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100);
          
          return (
            <Card key={item.id} className="border-0 shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-primary">{item.name}</CardTitle>
                    <CardDescription>
                      Price: {BANGLADESHI_CURRENCY_SYMBOL}{item.price} | Min: {item.minStock} | Max: {item.maxStock}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${stockStatus.color} ${stockStatus.bg} border-current/20`}
                  >
                    {stockStatus.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Current Stock Display */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-primary">{item.currentStock}</p>
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.currentStock * item.price).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock Level</span>
                      <span>{stockPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={stockPercentage} 
                      className={`h-3 ${
                        stockStatus.status === 'critical' ? 'bg-destructive/20' :
                        stockStatus.status === 'low' ? 'bg-warning/20' : 'bg-accent/20'
                      }`}
                    />
                  </div>

                  {/* Stock Adjustment */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedItem === item.id) {
                          setSelectedItem(null);
                        } else {
                          setSelectedItem(item.id);
                          setAdjustmentQuantity(0);
                        }
                      }}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      {selectedItem === item.id ? 'Cancel' : 'Adjust Stock'}
                    </Button>

                    {selectedItem === item.id && (
                      <>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={adjustmentQuantity}
                          onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                        />
                        <Button
                          size="sm"
                          onClick={() => adjustStock(item.id, adjustmentQuantity, 'in')}
                          disabled={adjustmentQuantity <= 0}
                          className="bg-accent hover:bg-accent-dark text-accent-foreground"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Stock In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adjustStock(item.id, adjustmentQuantity, 'out')}
                          disabled={adjustmentQuantity <= 0 || adjustmentQuantity > item.currentStock}
                          className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Stock Out
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Last Updated */}
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(item.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Movement History */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-primary">Recent Stock Movements</CardTitle>
          <CardDescription>Latest stock in/out activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Mock recent activities */}
            {[
              { type: 'in', product: '12kg LPG Cylinder', quantity: 50, time: '2 hours ago', staff: 'Manager' },
              { type: 'out', product: '5kg LPG Cylinder', quantity: 15, time: '3 hours ago', staff: 'Sale - Raj Kumar' },
              { type: 'out', product: '35kg Commercial Cylinder', quantity: 5, time: '5 hours ago', staff: 'Sale - Suresh Singh' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-surface rounded-lg">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  activity.type === 'in' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
                }`}>
                  {activity.type === 'in' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {activity.type === 'in' ? 'Stock In' : 'Stock Out'}: {activity.product}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quantity: {activity.quantity} | {activity.staff} | {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};