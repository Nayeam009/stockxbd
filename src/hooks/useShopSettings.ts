import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShopSettings {
  id: string;
  taxRate: number;
  currencySymbol: string;
  bkashNumber: string | null;
  nagadNumber: string | null;
  rocketNumber: string | null;
  shopName: string;
  phone: string;
  address: string;
}

const SHOP_SETTINGS_KEY = ['shop-settings'];

async function fetchShopSettings(): Promise<ShopSettings | null> {
  const { data } = await supabase
    .from('shop_profiles')
    .select('id, tax_rate, currency_symbol, bkash_number, nagad_number, rocket_number, shop_name, phone, address')
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    taxRate: Number(data.tax_rate ?? 0),
    currencySymbol: data.currency_symbol ?? '৳',
    bkashNumber: data.bkash_number,
    nagadNumber: data.nagad_number,
    rocketNumber: data.rocket_number,
    shopName: data.shop_name,
    phone: data.phone,
    address: data.address,
  };
}

export function useShopSettings() {
  return useQuery({
    queryKey: SHOP_SETTINGS_KEY,
    queryFn: fetchShopSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { tax_rate?: number; currency_symbol?: string }) => {
      const { error } = await supabase
        .from('shop_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('owner_id', (await supabase.auth.getUser()).data.user?.id ?? '');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOP_SETTINGS_KEY });
    },
  });
}
