import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isEnabled: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "default",
    isEnabled: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = "Notification" in window;
    const permission = isSupported ? Notification.permission : "default";
    const isEnabled = localStorage.getItem("push-notifications-enabled") === "true";
    
    setState({
      isSupported,
      permission,
      isEnabled: isEnabled && permission === "granted",
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return false;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({
        ...prev,
        permission,
        isEnabled: permission === "granted",
      }));
      
      if (permission === "granted") {
        localStorage.setItem("push-notifications-enabled", "true");
        // Show a test notification
        new Notification("Stock-X Notifications Enabled", {
          body: "You will now receive alerts for low stock, new orders, and payments.",
          icon: "/favicon.ico",
          tag: "test-notification",
        });
      }
      
      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disableNotifications = useCallback(() => {
    localStorage.setItem("push-notifications-enabled", "false");
    setState(prev => ({
      ...prev,
      isEnabled: false,
    }));
  }, []);

  const enableNotifications = useCallback(() => {
    if (state.permission === "granted") {
      localStorage.setItem("push-notifications-enabled", "true");
      setState(prev => ({
        ...prev,
        isEnabled: true,
      }));
    }
  }, [state.permission]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isEnabled || state.permission !== "granted") {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      return null;
    }
  }, [state.isEnabled, state.permission]);

  // Listen for low stock alerts and send push notifications
  const sendLowStockAlert = useCallback((productName: string, currentStock: number) => {
    return sendNotification("⚠️ Low Stock Alert", {
      body: `${productName} has only ${currentStock} units remaining`,
      tag: `low-stock-${productName}`,
    });
  }, [sendNotification]);

  const sendNewOrderAlert = useCallback((orderNumber: string, customerName: string, amount: number) => {
    return sendNotification("🛒 New Order Received", {
      body: `Order #${orderNumber} from ${customerName} - ৳${amount}`,
      tag: `order-${orderNumber}`,
    });
  }, [sendNotification]);

  const sendPaymentAlert = useCallback((customerName: string, amount: number) => {
    return sendNotification("💰 Payment Received", {
      body: `${customerName} paid ৳${amount}`,
      tag: `payment-${Date.now()}`,
    });
  }, [sendNotification]);

  const sendDuePaymentReminder = useCallback((customerName: string, dueAmount: number) => {
    return sendNotification("📢 Payment Reminder", {
      body: `${customerName} has ৳${dueAmount} due payment`,
      tag: `reminder-${customerName}`,
    });
  }, [sendNotification]);

  return {
    ...state,
    loading,
    requestPermission,
    enableNotifications,
    disableNotifications,
    sendNotification,
    sendLowStockAlert,
    sendNewOrderAlert,
    sendPaymentAlert,
    sendDuePaymentReminder,
  };
};
