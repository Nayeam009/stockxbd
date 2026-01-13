import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "low_stock" | "new_order" | "payment" | "info";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
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
    console.error("Error sending notification:", error);
  }
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const checkLowStock = useCallback(async () => {
    const [lpgResult, stoveResult, regulatorResult] = await Promise.all([
      supabase.from("lpg_brands").select("*").eq("is_active", true),
      supabase.from("stoves").select("*").eq("is_active", true),
      supabase.from("regulators").select("*").eq("is_active", true)
    ]);

    const lowStockNotifications: Notification[] = [];

    // Check LPG cylinders
    lpgResult.data?.forEach((brand) => {
      const totalStock = brand.package_cylinder + brand.refill_cylinder;
      const brandInfo = `${brand.name} (${brand.size} - ${brand.weight})`;
      
      if (totalStock === 0) {
        lowStockNotifications.push({
          id: `out_of_stock_lpg_${brand.id}`,
          type: "low_stock",
          title: "🔴 Out of Stock",
          message: `${brandInfo} is out of stock!`,
          read: false,
          createdAt: new Date(),
          data: { brandId: brand.id, brandName: brand.name, stock: totalStock, status: "out_of_stock", category: "lpg" },
        });
      } else if (totalStock < 30) {
        lowStockNotifications.push({
          id: `low_stock_lpg_${brand.id}`,
          type: "low_stock",
          title: "🟡 Low Stock Alert",
          message: `${brandInfo} has only ${totalStock} cylinders remaining`,
          read: false,
          createdAt: new Date(),
          data: { brandId: brand.id, brandName: brand.name, stock: totalStock, status: "low_stock", category: "lpg" },
        });
      }
    });

    // Check Stoves
    stoveResult.data?.forEach((stove) => {
      const stoveInfo = `${stove.brand} (${stove.burners === 1 ? 'Single' : 'Double'} Burner)`;
      
      if (stove.quantity === 0) {
        lowStockNotifications.push({
          id: `out_of_stock_stove_${stove.id}`,
          type: "low_stock",
          title: "🔴 Stove Out of Stock",
          message: `${stoveInfo} is out of stock!`,
          read: false,
          createdAt: new Date(),
          data: { stoveId: stove.id, stoveName: stove.brand, stock: stove.quantity, status: "out_of_stock", category: "stove" },
        });
      } else if (stove.quantity < 30) {
        lowStockNotifications.push({
          id: `low_stock_stove_${stove.id}`,
          type: "low_stock",
          title: "🟡 Stove Low Stock",
          message: `${stoveInfo} has only ${stove.quantity} units remaining`,
          read: false,
          createdAt: new Date(),
          data: { stoveId: stove.id, stoveName: stove.brand, stock: stove.quantity, status: "low_stock", category: "stove" },
        });
      }
    });

    // Check Regulators
    regulatorResult.data?.forEach((regulator) => {
      const regulatorInfo = `${regulator.brand} (${regulator.type})`;
      
      if (regulator.quantity === 0) {
        lowStockNotifications.push({
          id: `out_of_stock_regulator_${regulator.id}`,
          type: "low_stock",
          title: "🔴 Regulator Out of Stock",
          message: `${regulatorInfo} is out of stock!`,
          read: false,
          createdAt: new Date(),
          data: { regulatorId: regulator.id, regulatorName: regulator.brand, stock: regulator.quantity, status: "out_of_stock", category: "regulator" },
        });
      } else if (regulator.quantity < 30) {
        lowStockNotifications.push({
          id: `low_stock_regulator_${regulator.id}`,
          type: "low_stock",
          title: "🟡 Regulator Low Stock",
          message: `${regulatorInfo} has only ${regulator.quantity} units remaining`,
          read: false,
          createdAt: new Date(),
          data: { regulatorId: regulator.id, regulatorName: regulator.brand, stock: regulator.quantity, status: "low_stock", category: "regulator" },
        });
      }
    });

    // Send push notifications for critical stock levels
    const notifSettings = JSON.parse(localStorage.getItem("notification-settings") || "{}");
    if (notifSettings.lowStock !== false) {
      // Only send push for out of stock items (avoid spam for low stock)
      const outOfStock = lowStockNotifications.filter(n => n.data?.status === "out_of_stock");
      outOfStock.forEach(n => {
        sendBrowserNotification(
          "🔴 Out of Stock Alert",
          n.message,
          n.id
        );
      });
    }

    return lowStockNotifications;
  }, []);

  const checkNewOrders = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", today.toISOString())
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (orders) {
      return orders.map((order) => ({
        id: `new_order_${order.id}`,
        type: "new_order" as const,
        title: "New Order",
        message: `Order #${order.order_number} from ${order.customer_name} - ৳${order.total_amount}`,
        read: false,
        createdAt: new Date(order.created_at),
        data: { orderId: order.id, orderNumber: order.order_number },
      }));
    }
    return [];
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [lowStockNotifs, orderNotifs] = await Promise.all([
        checkLowStock(),
        checkNewOrders(),
      ]);

      // Combine and sort by date
      const allNotifications = [...lowStockNotifs, ...orderNotifs].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // Get read status from localStorage
      const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
      const notificationsWithReadStatus = allNotifications.map((n) => ({
        ...n,
        read: readIds.includes(n.id),
      }));

      setNotifications(notificationsWithReadStatus);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [checkLowStock, checkNewOrders]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Persist to localStorage
    const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem("readNotifications", JSON.stringify(readIds));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Persist to localStorage
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem("readNotifications", JSON.stringify(allIds));
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem("readNotifications");
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    loadNotifications();

    // Set up realtime subscription for new orders
    const ordersChannel = supabase
      .channel("notifications-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as any;
          const newNotification: Notification = {
            id: `new_order_${order.id}`,
            type: "new_order",
            title: "New Order Received!",
            message: `Order #${order.order_number} from ${order.customer_name}`,
            read: false,
            createdAt: new Date(),
            data: { orderId: order.id, orderNumber: order.order_number },
          };
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Send browser push notification
          const notifSettings = JSON.parse(localStorage.getItem("notification-settings") || "{}");
          if (notifSettings.newOrders !== false) {
            sendBrowserNotification(
              "🛒 New Order Received",
              `Order #${order.order_number} from ${order.customer_name} - ৳${order.total_amount}`,
              `order-${order.id}`
            );
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for customer payments
    const paymentsChannel = supabase
      .channel("notifications-payments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_payments" },
        async (payload) => {
          const payment = payload.new as any;
          
          // Fetch customer name
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", payment.customer_id)
            .single();
          
          const customerName = customer?.name || "Customer";
          
          const newNotification: Notification = {
            id: `payment_${payment.id}`,
            type: "payment",
            title: "Payment Received!",
            message: `${customerName} paid ৳${payment.amount}`,
            read: false,
            createdAt: new Date(),
            data: { paymentId: payment.id, customerId: payment.customer_id, amount: payment.amount },
          };
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Send browser push notification
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

    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh: loadNotifications,
  };
};
