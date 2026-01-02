import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncOptions {
  productType: "lpg" | "stove" | "regulator";
  productName: string;
  brandId?: string;
  size?: string;
  variant?: string;
}

/**
 * Auto-sync inventory items to product_prices table
 * Creates a pricing entry if one doesn't exist
 */
export const syncToProductPricing = async ({
  productType,
  productName,
  brandId,
  size,
  variant,
}: SyncOptions): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.warn("No user found for syncing to product pricing");
      return false;
    }

    // Check if product already exists in product_prices
    let query = supabase
      .from("product_prices")
      .select("id")
      .eq("product_type", productType)
      .eq("product_name", productName)
      .eq("is_active", true);

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    if (size) {
      query = query.eq("size", size);
    }

    if (variant) {
      query = query.eq("variant", variant);
    }

    const { data: existing, error: checkError } = await query.maybeSingle();

    if (checkError) {
      console.error("Error checking existing product price:", checkError);
      return false;
    }

    // If product doesn't exist in pricing, create it
    if (!existing) {
      const { error: insertError } = await supabase.from("product_prices").insert({
        product_type: productType,
        product_name: productName,
        brand_id: brandId || null,
        size: size || null,
        variant: variant || null,
        company_price: 0,
        distributor_price: 0,
        retail_price: 0,
        package_price: 0,
        created_by: userData.user.id,
        is_active: true,
      });

      if (insertError) {
        console.error("Error syncing to product pricing:", insertError);
        return false;
      }

      console.log(`Synced ${productName} to product pricing`);
      return true;
    }

    return false; // Already exists
  } catch (error) {
    console.error("Error in syncToProductPricing:", error);
    return false;
  }
};

/**
 * Sync LPG brand to product pricing with weight variants
 */
export const syncLpgBrandToPricing = async (
  brandName: string,
  brandId: string,
  size: string,
  weight: string
): Promise<void> => {
  const variants = ["Refill", "Package"];

  for (const variant of variants) {
    const productName = `${brandName} LP Gas ${weight} Cylinder (${size}) ${variant}`;
    const synced = await syncToProductPricing({
      productType: "lpg",
      productName,
      brandId,
      size: weight,
      variant,
    });

    if (synced) {
      toast.success(`Added ${brandName} ${weight} ${variant} to pricing`, {
        duration: 2000,
      });
    }
  }
};

/**
 * Sync stove to product pricing
 */
export const syncStoveToPricing = async (
  brand: string,
  burnerType: string
): Promise<void> => {
  const productName = `${brand} Gas Stove - ${burnerType}`;
  const synced = await syncToProductPricing({
    productType: "stove",
    productName,
    size: burnerType,
  });

  if (synced) {
    toast.success(`Added ${productName} to pricing`, {
      duration: 2000,
    });
  }
};

/**
 * Sync regulator to product pricing
 */
export const syncRegulatorToPricing = async (
  brand: string,
  type: string
): Promise<void> => {
  const productName = `${brand} Regulator - ${type}`;
  const synced = await syncToProductPricing({
    productType: "regulator",
    productName,
    size: type,
  });

  if (synced) {
    toast.success(`Added ${productName} to pricing`, {
      duration: 2000,
    });
  }
};
