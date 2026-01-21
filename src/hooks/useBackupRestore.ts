import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export interface BackupData {
  version: string;
  createdAt: string;
  createdBy: string;
  tables: {
    lpg_brands: any[];
    stoves: any[];
    regulators: any[];
    customers: any[];
    orders: any[];
    order_items: any[];
    daily_expenses: any[];
    staff: any[];
    staff_payments: any[];
    vehicles: any[];
    vehicle_costs: any[];
    product_prices: any[];
    products: any[];
    pos_transactions: any[];
    pos_transaction_items: any[];
    customer_payments: any[];
    cylinder_exchanges: any[];
  };
  settings: {
    business: any;
    notifications: any;
  };
}

export const useBackupRestore = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  const createBackup = useCallback(async (): Promise<BackupData | null> => {
    setLoading(true);
    setProgress(0);
    setStatus("Starting backup...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", variant: "destructive" });
        return null;
      }

      const tables = [
        "lpg_brands",
        "stoves",
        "regulators",
        "customers",
        "orders",
        "order_items",
        "daily_expenses",
        "staff",
        "staff_payments",
        "vehicles",
        "vehicle_costs",
        "product_prices",
        "products",
        "pos_transactions",
        "pos_transaction_items",
        "customer_payments",
        "cylinder_exchanges",
      ];

      const backupData: BackupData = {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        createdBy: user.email || user.id,
        tables: {} as any,
        settings: {
          business: JSON.parse(localStorage.getItem("business-settings") || "{}"),
          notifications: JSON.parse(localStorage.getItem("notification-settings") || "{}"),
        },
      };

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setStatus(`Backing up ${table}...`);
        setProgress(Math.round(((i + 1) / tables.length) * 100));

        const { data, error } = await supabase
          .from(table as any)
          .select("*");

        if (error) {
          logger.warn(`Error backing up ${table}`, error, { component: 'BackupRestore' });
          backupData.tables[table as keyof BackupData["tables"]] = [];
        } else {
          backupData.tables[table as keyof BackupData["tables"]] = data || [];
        }
      }

      setStatus("Backup complete!");
      setProgress(100);

      return backupData;
    } catch (error) {
      logger.error("Backup failed", error, { component: 'BackupRestore' });
      toast({ title: "Backup failed", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadBackup = useCallback(async () => {
    const backupData = await createBackup();
    if (!backupData) return;

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `stock-x-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Backup downloaded successfully" });
  }, [createBackup]);

  const validateBackup = (data: any): data is BackupData => {
    if (!data || typeof data !== "object") return false;
    if (!data.version || !data.createdAt || !data.tables) return false;
    return true;
  };

  const restoreBackup = useCallback(async (file: File): Promise<boolean> => {
    setLoading(true);
    setProgress(0);
    setStatus("Reading backup file...");

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!validateBackup(backupData)) {
        toast({ title: "Invalid backup file format", variant: "destructive" });
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", variant: "destructive" });
        return false;
      }

      // Restore order matters - parent tables first
      const restoreOrder = [
        "customers",
        "staff",
        "vehicles",
        "lpg_brands",
        "stoves",
        "regulators",
        "products",
        "product_prices",
        "orders",
        "order_items",
        "daily_expenses",
        "staff_payments",
        "vehicle_costs",
        "pos_transactions",
        "pos_transaction_items",
        "customer_payments",
        "cylinder_exchanges",
      ];

      for (let i = 0; i < restoreOrder.length; i++) {
        const table = restoreOrder[i];
        const tableData = backupData.tables[table as keyof BackupData["tables"]];

        if (!tableData || tableData.length === 0) continue;

        setStatus(`Restoring ${table}...`);
        setProgress(Math.round(((i + 1) / restoreOrder.length) * 100));

        // For each record, upsert to handle duplicates
        for (const record of tableData) {
          // Remove generated fields that might conflict
          const cleanRecord = { ...record };
          
          // Try to upsert the record
          const { error } = await supabase
            .from(table as any)
            .upsert(cleanRecord, { 
              onConflict: "id",
              ignoreDuplicates: true 
            });

          if (error) {
            logger.warn(`Warning restoring ${table}`, { message: error.message }, { component: 'BackupRestore' });
          }
        }
      }

      // Restore local settings
      if (backupData.settings?.business) {
        localStorage.setItem("business-settings", JSON.stringify(backupData.settings.business));
      }
      if (backupData.settings?.notifications) {
        localStorage.setItem("notification-settings", JSON.stringify(backupData.settings.notifications));
      }

      setStatus("Restore complete!");
      setProgress(100);
      toast({ title: "Backup restored successfully" });

      return true;
    } catch (error) {
      logger.error("Restore failed", error, { component: 'BackupRestore' });
      toast({ title: "Failed to restore backup", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBackupInfo = useCallback(async (file: File): Promise<Partial<BackupData> | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!validateBackup(data)) {
        return null;
      }

      // Return metadata without full table data
      return {
        version: data.version,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      };
    } catch {
      return null;
    }
  }, []);

  return {
    loading,
    progress,
    status,
    createBackup,
    downloadBackup,
    restoreBackup,
    getBackupInfo,
  };
};
