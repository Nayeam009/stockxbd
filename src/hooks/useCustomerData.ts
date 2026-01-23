import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SavedAddress {
  id: string;
  label: string;
  division: string;
  district: string;
  thana: string;
  streetAddress: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
}

export interface CustomerData {
  profile: CustomerProfile;
  defaultAddress: Omit<SavedAddress, 'id' | 'label' | 'isDefault'>;
  savedAddresses: SavedAddress[];
  lastOrderPreferences: {
    paymentMethod?: string;
    returnCylinderType?: 'empty' | 'leaked';
  };
}

const STORAGE_KEY = 'lpg-customer-data';

const defaultCustomerData: CustomerData = {
  profile: { name: '', phone: '', email: '' },
  defaultAddress: { division: '', district: '', thana: '', streetAddress: '' },
  savedAddresses: [],
  lastOrderPreferences: {}
};

export const useCustomerData = () => {
  const [customerData, setCustomerData] = useState<CustomerData>(defaultCustomerData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Load data from localStorage first, then sync with Supabase
  const loadCustomerData = useCallback(async () => {
    try {
      // 1. Load from localStorage (instant)
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData) as CustomerData;
        setCustomerData(parsed);
      }
      setIsLoaded(true);

      // 2. Sync with Supabase profile (background)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCustomerData(prev => {
          const updated = {
            ...prev,
            profile: {
              name: profile.full_name || prev.profile.name,
              phone: profile.phone || prev.profile.phone,
              email: user.email || prev.profile.email
            }
          };
          // Persist the synced data
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else if (user.email) {
        setCustomerData(prev => ({
          ...prev,
          profile: { ...prev.profile, email: user.email || '' }
        }));
      }

      setIsSynced(true);
    } catch (error) {
      console.error('Error loading customer data:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save customer data to localStorage and optionally to Supabase
  const saveCustomerData = useCallback(async (data: Partial<CustomerData>, syncToServer = false) => {
    const updated = { ...customerData, ...data };
    
    // Update state
    setCustomerData(updated);
    
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Optionally sync profile to Supabase
    if (syncToServer && (data.profile?.name || data.profile?.phone)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              full_name: updated.profile.name,
              phone: updated.profile.phone,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        }
      } catch (error) {
        console.error('Error syncing to server:', error);
      }
    }
  }, [customerData]);

  // Save address only
  const saveAddress = useCallback((address: Omit<SavedAddress, 'id' | 'label' | 'isDefault'>) => {
    const updated = {
      ...customerData,
      defaultAddress: address
    };
    setCustomerData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customerData]);

  // Add a new saved address
  const addSavedAddress = useCallback((address: Omit<SavedAddress, 'id'>) => {
    const newAddress: SavedAddress = {
      ...address,
      id: crypto.randomUUID()
    };
    
    const updatedAddresses = [...customerData.savedAddresses];
    
    // If this is set as default, update other addresses
    if (address.isDefault) {
      updatedAddresses.forEach(addr => addr.isDefault = false);
    }
    
    updatedAddresses.push(newAddress);
    
    const updated = {
      ...customerData,
      savedAddresses: updatedAddresses,
      // Also update default address if this is the default
      ...(address.isDefault && { defaultAddress: { 
        division: address.division,
        district: address.district,
        thana: address.thana,
        streetAddress: address.streetAddress
      }})
    };
    
    setCustomerData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    return newAddress.id;
  }, [customerData]);

  // Remove a saved address
  const removeSavedAddress = useCallback((addressId: string) => {
    const updated = {
      ...customerData,
      savedAddresses: customerData.savedAddresses.filter(a => a.id !== addressId)
    };
    setCustomerData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customerData]);

  // Set default address from saved addresses
  const setDefaultAddress = useCallback((addressId: string) => {
    const address = customerData.savedAddresses.find(a => a.id === addressId);
    if (!address) return;
    
    const updatedAddresses = customerData.savedAddresses.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));
    
    const updated = {
      ...customerData,
      savedAddresses: updatedAddresses,
      defaultAddress: {
        division: address.division,
        district: address.district,
        thana: address.thana,
        streetAddress: address.streetAddress
      }
    };
    
    setCustomerData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customerData]);

  // Save order preferences (like return cylinder type)
  const saveOrderPreferences = useCallback((prefs: CustomerData['lastOrderPreferences']) => {
    const updated = {
      ...customerData,
      lastOrderPreferences: { ...customerData.lastOrderPreferences, ...prefs }
    };
    setCustomerData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [customerData]);

  // Clear all saved data
  const clearSavedData = useCallback(() => {
    setCustomerData(defaultCustomerData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if customer has saved data
  const hasSavedData = useCallback(() => {
    return !!(customerData.profile.name || customerData.profile.phone || customerData.defaultAddress.division);
  }, [customerData]);

  // Load on mount
  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  return {
    // Data
    profile: customerData.profile,
    defaultAddress: customerData.defaultAddress,
    savedAddresses: customerData.savedAddresses,
    lastOrderPreferences: customerData.lastOrderPreferences,
    
    // State
    isLoaded,
    isSynced,
    hasSavedData: hasSavedData(),
    
    // Actions
    loadCustomerData,
    saveCustomerData,
    saveAddress,
    addSavedAddress,
    removeSavedAddress,
    setDefaultAddress,
    saveOrderPreferences,
    clearSavedData
  };
};
