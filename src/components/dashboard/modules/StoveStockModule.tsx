import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChefHat, 
  Plus, 
  Minus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { StockItem } from "@/hooks/useDashboardData";

interface StoveStockModuleProps {
  stockData: StockItem[];
  setStockData: (data: StockItem[]) => void;
}

export const StoveStockModule = ({ stockData, setStockData }: StoveStockModuleProps) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);

  // Filter only stove stock
  const stoveStock = stockData.filter(item => item.type === 'stove');

  // Calculate analytics
  const analytics = useMemo(() => {
    const lowStock = stoveStock.filter(item => item.currentStock <= item.minStock);
    const totalValue = stoveStock.reduce((sum, item) => sum + (item.currentStock * item.price), 0);
    const totalStock = stoveStock.reduce((sum, item) => sum + item.currentStock, 0);
    
    return {
      lowStockItems: lowStock.length,
      totalValue,
      totalStock,
      stockHealth: stoveStock.length > 0 ? 
        ((stoveStock.length - lowStock.length) / stoveStock.length) * 100 : 0
    };
  }, [stoveStock]);

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
          <h2 className="text-3xl font-bold text-primary">LPG Gas Stove Stock Management</h2>
          <p className="text-muted-foreground">Manage inventory of LPG gas stoves and accessories</p>
        </div>
        <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
          <ChefHat className="h-4 w-4 mr-2" />
          Stove Report
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stove Value
            </CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analytics.totalStock} stoves in stock</p>
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
            <div className="text-2xl font-bold text-secondary">{analytics.stockHealth.toFixed(0)}%</div>
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
              Models Available
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stoveStock.length}</div>
            <p className="text-xs text-muted-foreground">Different stove models</p>
          </CardContent>
        </Card>
      </div>

      {/* Stove Stock Items */}
      <div className="grid gap-6">
        {stoveStock.map((item) => {
          const stockStatus = getStockStatus(item);
          const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100);
          
          return (
            <Card key={item.id} className="border-0 shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-secondary flex items-center">
                      <ChefHat className="h-5 w-5 mr-2" />
                      {item.name}
                    </CardTitle>
                    <CardDescription>
                      Price: {BANGLADESHI_CURRENCY_SYMBOL}{item.price.toLocaleString()} | Min: {item.minStock} | Max: {item.maxStock}
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
                      <p className="text-2xl font-bold text-secondary">{item.currentStock}</p>
                      <p className="text-sm text-muted-foreground">Units Available</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-lg font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.currentStock * item.price).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Inventory Value</p>
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
                        stockStatus.status === 'low' ? 'bg-warning/20' : 'bg-secondary/20'
                      }`}
                    />
                  </div>

                  {/* Stock Features */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-surface rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-secondary">{item.name.includes('2') ? '2' : item.name.includes('3') ? '3' : '4'}</p>
                      <p className="text-xs text-muted-foreground">Burners</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-secondary">
                        {item.name.includes('2') ? 'Compact' : item.name.includes('3') ? 'Medium' : 'Large'}
                      </p>
                      <p className="text-xs text-muted-foreground">Size</p>
                    </div>
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
                      className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
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
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adjustStock(item.id, adjustmentQuantity, 'out')}
                          disabled={adjustmentQuantity <= 0 || adjustmentQuantity > item.currentStock}
                          className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove
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

      {/* Recent Stove Activities */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="text-secondary">Recent Stove Activities</CardTitle>
          <CardDescription>Latest stove inventory movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'sale', product: '3 Burner Gas Stove', quantity: 2, customer: 'Priya Singh', time: '1 hour ago' },
              { type: 'in', product: '2 Burner Gas Stove', quantity: 10, supplier: 'ABC Appliances', time: '4 hours ago' },
              { type: 'sale', product: '4 Burner Gas Stove', quantity: 1, customer: 'Rohit Gupta', time: '6 hours ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-surface rounded-lg">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  activity.type === 'in' ? 'bg-accent/10 text-accent' : 'bg-secondary/10 text-secondary'
                }`}>
                  {activity.type === 'in' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {activity.type === 'in' ? 'Stock In' : 'Sale'}: {activity.product}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quantity: {activity.quantity} | {activity.type === 'in' ? activity.supplier : activity.customer} | {activity.time}
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