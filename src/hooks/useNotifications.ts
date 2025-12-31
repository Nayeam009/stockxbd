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

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const checkLowStock = useCallback(async () => {
    const { data: brands } = await supabase
      .from("lpg_brands")
      .select("*")
      .eq("is_active", true);

    if (brands) {
      const lowStockNotifications: Notification[] = [];
      brands.forEach((brand) => {
        const totalStock = brand.package_cylinder + brand.refill_cylinder;
        const brandInfo = `${brand.name} (${brand.size} - ${brand.weight})`;
        
        if (totalStock === 0) {
          // Out of Stock - Red
          lowStockNotifications.push({
            id: `out_of_stock_${brand.id}`,
            type: "low_stock",
            title: "🔴 Out of Stock",
            message: `${brandInfo} is out of stock!`,
            read: false,
            createdAt: new Date(),
            data: { brandId: brand.id, brandName: brand.name, stock: totalStock, status: "out_of_stock" },
          });
        } else if (totalStock < 30) {
          // Low Stock - Yellow
          lowStockNotifications.push({
            id: `low_stock_${brand.id}`,
            type: "low_stock",
            title: "🟡 Low Stock Alert",
            message: `${brandInfo} has only ${totalStock} cylinders remaining`,
            read: false,
            createdAt: new Date(),
            data: { brandId: brand.id, brandName: brand.name, stock: totalStock, status: "low_stock" },
          });
        }
      });
      return lowStockNotifications;
    }
    return [];
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
    const channel = supabase
      .channel("notifications")
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
        }
      )
      .subscribe();

    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
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
