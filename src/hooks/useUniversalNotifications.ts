import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type NotificationType = 
  | "low_stock" 
  | "out_of_stock"
  | "new_order" 
  | "order_completed"
  | "order_cancelled"
  | "payment_received" 
  | "payment_overdue"
  | "expense_added"
  | "staff_payment"
  | "vehicle_cost"
  | "customer_credit_limit"
  | "exchange_pending"
  | "driver_assigned"
  | "delivery_complete"
  | "system_alert"
  | "info";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface UniversalNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  module?: string;
  action?: {
    label: string;
    moduleId: string;
  };
  data?: Record<string, any>;
  roles: ('owner' | 'manager' | 'driver')[];
}

// Helper to send browser push notification
const sendBrowserNotification = (title: string, body: string, tag: string) => {
  const isEnabled = localStorage.getItem("push-notifications-enabled") === "true";
  
  if (!isEnabled || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag,
    });
  } catch (error) {
    logger.error("Error sending notification", error, { component: 'UniversalNotifications' });
  }
};

export const useUniversalNotifications = (userRole: 'owner' | 'manager' | 'driver' = 'driver') => {
  const [notifications, setNotifications] = useState<UniversalNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check low stock for LPG, Stoves, Regulators
  const checkInventoryAlerts = useCallback(async (): Promise<UniversalNotification[]> => {
    const alerts: UniversalNotification[] = [];
    
    const [lpgResult, stoveResult, regulatorResult] = await Promise.all([
      supabase.from("lpg_brands").select("*").eq("is_active", true),
      supabase.from("stoves").select("*").eq("is_active", true),
      supabase.from("regulators").select("*").eq("is_active", true)
    ]);

    // LPG Cylinders
    lpgResult.data?.forEach((brand) => {
      const totalStock = brand.package_cylinder + brand.refill_cylinder;
      const brandInfo = `${brand.name} (${brand.size})`;
      
      if (totalStock === 0) {
        alerts.push({
          id: `out_of_stock_lpg_${brand.id}`,
          type: "out_of_stock",
          priority: "critical",
          title: "🔴 Out of Stock - Critical!",
          message: `${brandInfo} is completely out of stock. Order immediately.`,
          read: false,
          createdAt: new Date(),
          module: "lpg-stock",
          action: { label: "View Stock", moduleId: "lpg-stock" },
          data: { brandId: brand.id, brandName: brand.name, stock: totalStock, category: "lpg" },
          roles: ['owner', 'manager'],
        });
      } else if (totalStock < 10) {
        alerts.push({
          id: `critical_stock_lpg_${brand.id}`,
          type: "low_stock",
          priority: "high",
          title: "🟠 Critical Stock Level",
          message: `${brandInfo} has only ${totalStock} cylinders. Restock urgently.`,
          read: false,
          createdAt: new Date(),
          module: "lpg-stock",
          action: { label: "View Stock", moduleId: "lpg-stock" },
          data: { brandId: brand.id, brandName: brand.name, stock: totalStock, category: "lpg" },
          roles: ['owner', 'manager'],
        });
      } else if (totalStock < 30) {
        alerts.push({
          id: `low_stock_lpg_${brand.id}`,
          type: "low_stock",
          priority: "medium",
          title: "🟡 Low Stock Alert",
          message: `${brandInfo} has ${totalStock} cylinders remaining.`,
          read: false,
          createdAt: new Date(),
          module: "lpg-stock",
          action: { label: "View Stock", moduleId: "lpg-stock" },
          data: { brandId: brand.id, brandName: brand.name, stock: totalStock, category: "lpg" },
          roles: ['owner', 'manager'],
        });
      }

      // Check if Empty > Full (Critical for cash flow)
      if (brand.empty_cylinder > (brand.package_cylinder + brand.refill_cylinder) * 1.5) {
        alerts.push({
          id: `empty_imbalance_${brand.id}`,
          type: "system_alert",
          priority: "high",
          title: "⚠️ Empty Cylinder Imbalance",
          message: `${brandInfo}: ${brand.empty_cylinder} empties vs ${brand.package_cylinder + brand.refill_cylinder} full. Send empties to plant!`,
          read: false,
          createdAt: new Date(),
          module: "lpg-stock",
          action: { label: "View Stock", moduleId: "lpg-stock" },
          data: { brandId: brand.id, empty: brand.empty_cylinder, full: brand.package_cylinder + brand.refill_cylinder },
          roles: ['owner', 'manager'],
        });
      }
    });

    // Stoves
    stoveResult.data?.forEach((stove) => {
      const stoveInfo = `${stove.brand} (${stove.burners === 1 ? 'Single' : 'Double'} Burner)`;
      
      if (stove.quantity === 0) {
        alerts.push({
          id: `out_of_stock_stove_${stove.id}`,
          type: "out_of_stock",
          priority: "high",
          title: "🔴 Stove Out of Stock",
          message: `${stoveInfo} is out of stock.`,
          read: false,
          createdAt: new Date(),
          module: "stove-stock",
          action: { label: "View Stoves", moduleId: "stove-stock" },
          data: { stoveId: stove.id, stock: 0, category: "stove" },
          roles: ['owner', 'manager'],
        });
      } else if (stove.quantity < 5) {
        alerts.push({
          id: `low_stock_stove_${stove.id}`,
          type: "low_stock",
          priority: "medium",
          title: "🟡 Low Stove Stock",
          message: `${stoveInfo} has only ${stove.quantity} units.`,
          read: false,
          createdAt: new Date(),
          module: "stove-stock",
          action: { label: "View Stoves", moduleId: "stove-stock" },
          data: { stoveId: stove.id, stock: stove.quantity, category: "stove" },
          roles: ['owner', 'manager'],
        });
      }
    });

    // Regulators
    regulatorResult.data?.forEach((regulator) => {
      const regInfo = `${regulator.brand} (${regulator.type})`;
      
      if (regulator.quantity === 0) {
        alerts.push({
          id: `out_of_stock_reg_${regulator.id}`,
          type: "out_of_stock",
          priority: "high",
          title: "🔴 Regulator Out of Stock",
          message: `${regInfo} is out of stock.`,
          read: false,
          createdAt: new Date(),
          module: "regulators",
          action: { label: "View Regulators", moduleId: "regulators" },
          data: { regulatorId: regulator.id, stock: 0, category: "regulator" },
          roles: ['owner', 'manager'],
        });
      } else if (regulator.quantity < 5) {
        alerts.push({
          id: `low_stock_reg_${regulator.id}`,
          type: "low_stock",
          priority: "medium",
          title: "🟡 Low Regulator Stock",
          message: `${regInfo} has only ${regulator.quantity} units.`,
          read: false,
          createdAt: new Date(),
          module: "regulators",
          action: { label: "View Regulators", moduleId: "regulators" },
          data: { regulatorId: regulator.id, stock: regulator.quantity, category: "regulator" },
          roles: ['owner', 'manager'],
        });
      }
    });

    return alerts;
  }, []);

  // Check pending orders
  const checkOrderAlerts = useCallback(async (): Promise<UniversalNotification[]> => {
    const alerts: UniversalNotification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(10);

    orders?.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const hoursSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);

      if (order.status === "pending" && hoursSinceOrder > 2) {
        alerts.push({
          id: `pending_order_${order.id}`,
          type: "new_order",
          priority: "high",
          title: "⏰ Order Waiting",
          message: `Order #${order.order_number} from ${order.customer_name} pending for ${Math.floor(hoursSinceOrder)}h`,
          read: false,
          createdAt: orderDate,
          module: "orders",
          action: { label: "View Orders", moduleId: "orders" },
          data: { orderId: order.id, orderNumber: order.order_number },
          roles: ['owner', 'manager', 'driver'],
        });
      } else if (order.status === "pending") {
        alerts.push({
          id: `new_order_${order.id}`,
          type: "new_order",
          priority: "medium",
          title: "🛒 New Order",
          message: `Order #${order.order_number} from ${order.customer_name} - ৳${order.total_amount}`,
          read: false,
          createdAt: orderDate,
          module: "orders",
          action: { label: "View Orders", moduleId: "orders" },
          data: { orderId: order.id, orderNumber: order.order_number },
          roles: ['owner', 'manager', 'driver'],
        });
      }
    });

    return alerts;
  }, []);

  // Check customer dues
  const checkCustomerAlerts = useCallback(async (): Promise<UniversalNotification[]> => {
    const alerts: UniversalNotification[] = [];

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .or("total_due.gt.0,cylinders_due.gt.0")
      .order("total_due", { ascending: false })
      .limit(10);

    let totalDue = 0;
    let totalCylindersDue = 0;

    customers?.forEach((customer) => {
      totalDue += Number(customer.total_due) || 0;
      totalCylindersDue += customer.cylinders_due || 0;

      // High value dues
      if ((customer.total_due || 0) > 10000) {
        alerts.push({
          id: `high_due_${customer.id}`,
          type: "payment_overdue",
          priority: "high",
          title: "💰 High Outstanding Due",
          message: `${customer.name} owes ৳${customer.total_due?.toLocaleString()}`,
          read: false,
          createdAt: new Date(),
          module: "customers",
          action: { label: "Collect Due", moduleId: "customers" },
          data: { customerId: customer.id, due: customer.total_due },
          roles: ['owner', 'manager'],
        });
      }

      // Cylinder dues
      if ((customer.cylinders_due || 0) >= 3) {
        alerts.push({
          id: `cylinder_due_${customer.id}`,
          type: "payment_overdue",
          priority: "high",
          title: "📦 Cylinder Return Pending",
          message: `${customer.name} has ${customer.cylinders_due} cylinders to return`,
          read: false,
          createdAt: new Date(),
          module: "customers",
          action: { label: "View Customer", moduleId: "customers" },
          data: { customerId: customer.id, cylindersDue: customer.cylinders_due },
          roles: ['owner', 'manager'],
        });
      }

      // Credit limit exceeded
      if (customer.credit_limit && (customer.total_due || 0) > customer.credit_limit) {
        alerts.push({
          id: `credit_limit_${customer.id}`,
          type: "customer_credit_limit",
          priority: "critical",
          title: "🚫 Credit Limit Exceeded",
          message: `${customer.name} exceeded limit: ৳${customer.total_due?.toLocaleString()} / ৳${customer.credit_limit.toLocaleString()}`,
          read: false,
          createdAt: new Date(),
          module: "customers",
          action: { label: "View Customer", moduleId: "customers" },
          data: { customerId: customer.id, due: customer.total_due, limit: customer.credit_limit },
          roles: ['owner', 'manager'],
        });
      }
    });

    // Summary alert for total dues
    if (totalDue > 50000) {
      alerts.push({
        id: `total_due_summary`,
        type: "payment_overdue",
        priority: "medium",
        title: "📊 Total Dues Summary",
        message: `Total outstanding: ৳${totalDue.toLocaleString()} | ${totalCylindersDue} cylinders`,
        read: false,
        createdAt: new Date(),
        module: "customers",
        action: { label: "View Customers", moduleId: "customers" },
        data: { totalDue, totalCylindersDue },
        roles: ['owner'],
      });
    }

    return alerts;
  }, []);

  // Check pending exchanges
  const checkExchangeAlerts = useCallback(async (): Promise<UniversalNotification[]> => {
    const alerts: UniversalNotification[] = [];

    const { data: exchanges } = await supabase
      .from("cylinder_exchanges")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    exchanges?.forEach((exchange) => {
      alerts.push({
        id: `exchange_pending_${exchange.id}`,
        type: "exchange_pending",
        priority: "medium",
        title: "🔄 Pending Exchange",
        message: `${exchange.quantity}x ${exchange.from_brand} → ${exchange.to_brand}`,
        read: false,
        createdAt: new Date(exchange.created_at),
        module: "exchange",
        action: { label: "View Exchanges", moduleId: "exchange" },
        data: { exchangeId: exchange.id },
        roles: ['owner', 'manager', 'driver'],
      });
    });

    return alerts;
  }, []);

  // Check today's sales performance
  const checkSalesAlerts = useCallback(async (): Promise<UniversalNotification[]> => {
    const alerts: UniversalNotification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: transactions } = await supabase
      .from("pos_transactions")
      .select("total, payment_method")
      .gte("created_at", today.toISOString());

    if (transactions && transactions.length > 0) {
      const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
      const cashSales = transactions
        .filter(t => t.payment_method === 'cash')
        .reduce((sum, t) => sum + Number(t.total), 0);

      // Good sales day alert (celebratory)
      if (totalSales > 50000) {
        alerts.push({
          id: `good_sales_${today.toISOString().split('T')[0]}`,
          type: "info",
          priority: "low",
          title: "🎉 Great Sales Day!",
          message: `Today's sales: ৳${totalSales.toLocaleString()} from ${transactions.length} transactions`,
          read: false,
          createdAt: new Date(),
          module: "daily-sales",
          action: { label: "View Sales", moduleId: "daily-sales" },
          data: { totalSales, transactionCount: transactions.length },
          roles: ['owner', 'manager'],
        });
      }
    }

    return alerts;
  }, []);

  // Load all notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryAlerts, orderAlerts, customerAlerts, exchangeAlerts, salesAlerts] = await Promise.all([
        checkInventoryAlerts(),
        checkOrderAlerts(),
        checkCustomerAlerts(),
        checkExchangeAlerts(),
        checkSalesAlerts(),
      ]);

      const allNotifications = [
        ...inventoryAlerts,
        ...orderAlerts,
        ...customerAlerts,
        ...exchangeAlerts,
        ...salesAlerts,
      ];

      // Sort by priority then date
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      allNotifications.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Get read status from localStorage
      const readIds = JSON.parse(localStorage.getItem("universalReadNotifications") || "[]");
      const notificationsWithReadStatus = allNotifications.map((n) => ({
        ...n,
        read: readIds.includes(n.id),
      }));

      setNotifications(notificationsWithReadStatus);

      // Send browser push for critical unread
      const notifSettings = JSON.parse(localStorage.getItem("notification-settings") || "{}");
      if (notifSettings.lowStock !== false) {
        const criticalUnread = notificationsWithReadStatus.filter(
          n => n.priority === 'critical' && !n.read
        );
        criticalUnread.slice(0, 3).forEach(n => {
          sendBrowserNotification(n.title, n.message, n.id);
        });
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [checkInventoryAlerts, checkOrderAlerts, checkCustomerAlerts, checkExchangeAlerts, checkSalesAlerts]);

  // Filter notifications by role
  const roleFilteredNotifications = useMemo(() => {
    return notifications.filter(n => n.roles.includes(userRole));
  }, [notifications, userRole]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    const readIds = JSON.parse(localStorage.getItem("universalReadNotifications") || "[]");
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem("universalReadNotifications", JSON.stringify(readIds));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("universalReadNotifications", JSON.stringify(allIds));
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.setItem("universalReadNotifications", JSON.stringify([]));
  }, []);

  const unreadCount = useMemo(() => {
    return roleFilteredNotifications.filter((n) => !n.read).length;
  }, [roleFilteredNotifications]);

  const criticalCount = useMemo(() => {
    return roleFilteredNotifications.filter((n) => !n.read && n.priority === 'critical').length;
  }, [roleFilteredNotifications]);

  const highPriorityCount = useMemo(() => {
    return roleFilteredNotifications.filter((n) => !n.read && (n.priority === 'critical' || n.priority === 'high')).length;
  }, [roleFilteredNotifications]);

  // Setup realtime subscriptions
  useEffect(() => {
    loadNotifications();

    // Subscribe to orders
    const ordersChannel = supabase
      .channel("universal-notifications-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as any;
          const newNotification: UniversalNotification = {
            id: `new_order_${order.id}`,
            type: "new_order",
            priority: "medium",
            title: "🛒 New Order Received!",
            message: `Order #${order.order_number} from ${order.customer_name} - ৳${order.total_amount}`,
            read: false,
            createdAt: new Date(),
            module: "orders",
            action: { label: "View Order", moduleId: "orders" },
            data: { orderId: order.id, orderNumber: order.order_number },
            roles: ['owner', 'manager', 'driver'],
          };
          setNotifications((prev) => [newNotification, ...prev]);
          
          const notifSettings = JSON.parse(localStorage.getItem("notification-settings") || "{}");
          if (notifSettings.newOrders !== false) {
            sendBrowserNotification(
              "🛒 New Order",
              `#${order.order_number} - ${order.customer_name}`,
              `order-${order.id}`
            );
          }
        }
      )
      .subscribe();

    // Subscribe to payments
    const paymentsChannel = supabase
      .channel("universal-notifications-payments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_payments" },
        async (payload) => {
          const payment = payload.new as any;
          
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", payment.customer_id)
            .single();
          
          const customerName = customer?.name || "Customer";
          
          const newNotification: UniversalNotification = {
            id: `payment_${payment.id}`,
            type: "payment_received",
            priority: "low",
            title: "💰 Payment Received!",
            message: `${customerName} paid ৳${payment.amount}`,
            read: false,
            createdAt: new Date(),
            module: "customers",
            action: { label: "View Payments", moduleId: "customers" },
            data: { paymentId: payment.id, amount: payment.amount },
            roles: ['owner', 'manager'],
          };
          setNotifications((prev) => [newNotification, ...prev]);
          
          const notifSettings = JSON.parse(localStorage.getItem("notification-settings") || "{}");
          if (notifSettings.payments !== false) {
            sendBrowserNotification(
              "💰 Payment Received",
              `${customerName} paid ৳${payment.amount}`,
              `payment-${payment.id}`
            );
          }
        }
      )
      .subscribe();

    // Subscribe to POS transactions
    const posChannel = supabase
      .channel("universal-notifications-pos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pos_transactions" },
        (payload) => {
          const transaction = payload.new as any;
          
          const newNotification: UniversalNotification = {
            id: `pos_${transaction.id}`,
            type: "info",
            priority: "low",
            title: "✅ Sale Completed",
            message: `Transaction #${transaction.transaction_number} - ৳${transaction.total}`,
            read: false,
            createdAt: new Date(),
            module: "daily-sales",
            action: { label: "View Sales", moduleId: "daily-sales" },
            data: { transactionId: transaction.id },
            roles: ['owner', 'manager'],
          };
          setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50
        }
      )
      .subscribe();

    // Subscribe to stock changes (for critical alerts)
    const stockChannel = supabase
      .channel("universal-notifications-stock")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lpg_brands" },
        async () => {
          // Refresh inventory alerts when stock changes
          const alerts = await checkInventoryAlerts();
          const criticalAlerts = alerts.filter(a => a.priority === 'critical');
          
          if (criticalAlerts.length > 0) {
            setNotifications(prev => {
              const existingIds = prev.map(n => n.id);
              const newAlerts = criticalAlerts.filter(a => !existingIds.includes(a.id));
              return [...newAlerts, ...prev].slice(0, 50);
            });
          }
        }
      )
      .subscribe();

    // Real-time only - no polling interval needed
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(posChannel);
      supabase.removeChannel(stockChannel);
    };
  }, [loadNotifications, checkInventoryAlerts]);

  // Navigate to module handler
  const navigateToModule = useCallback((moduleId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-module', { detail: moduleId }));
  }, []);

  return {
    notifications: roleFilteredNotifications,
    loading,
    unreadCount,
    criticalCount,
    highPriorityCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh: loadNotifications,
    navigateToModule,
  };
};
