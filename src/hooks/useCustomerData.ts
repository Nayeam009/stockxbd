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

  // Load data directly from Supabase
  const loadCustomerData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoaded(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCustomerData(prev => ({
          ...prev,
          profile: {
            name: profile.full_name || prev.profile.name,
            phone: profile.phone || prev.profile.phone,
            email: user.email || prev.profile.email
          }
        }));
      } else if (user.email) {
        setCustomerData(prev => ({
          ...prev,
          profile: { ...prev.profile, email: user.email || '' }
        }));
      }

      setIsLoaded(true);
      setIsSynced(true);
    } catch (error) {
      console.error('Error loading customer data:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save customer data to Supabase
  const saveCustomerData = useCallback(async (data: Partial<CustomerData>, syncToServer = true) => {
    const updated = { ...customerData, ...data };
    setCustomerData(updated);

    // Sync profile to Supabase
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

  // Save address
  const saveAddress = useCallback((address: Omit<SavedAddress, 'id' | 'label' | 'isDefault'>) => {
    setCustomerData(prev => ({
      ...prev,
      defaultAddress: address
    }));
  }, []);

  // Add a new saved address
  const addSavedAddress = useCallback((address: Omit<SavedAddress, 'id'>) => {
    const newAddress: SavedAddress = {
      ...address,
      id: crypto.randomUUID()
    };
    
    const updatedAddresses = [...customerData.savedAddresses];
    
    if (address.isDefault) {
      updatedAddresses.forEach(addr => addr.isDefault = false);
    }
    
    updatedAddresses.push(newAddress);
    
    setCustomerData(prev => ({
      ...prev,
      savedAddresses: updatedAddresses,
      ...(address.isDefault && { 
        defaultAddress: { 
          division: address.division,
          district: address.district,
          thana: address.thana,
          streetAddress: address.streetAddress
        }
      })
    }));
    
    return newAddress.id;
  }, [customerData.savedAddresses]);

  // Remove a saved address
  const removeSavedAddress = useCallback((addressId: string) => {
    setCustomerData(prev => ({
      ...prev,
      savedAddresses: prev.savedAddresses.filter(a => a.id !== addressId)
    }));
  }, []);

  // Set default address from saved addresses
  const setDefaultAddress = useCallback((addressId: string) => {
    const address = customerData.savedAddresses.find(a => a.id === addressId);
    if (!address) return;
    
    setCustomerData(prev => ({
      ...prev,
      savedAddresses: prev.savedAddresses.map(a => ({
        ...a,
        isDefault: a.id === addressId
      })),
      defaultAddress: {
        division: address.division,
        district: address.district,
        thana: address.thana,
        streetAddress: address.streetAddress
      }
    }));
  }, [customerData.savedAddresses]);

  // Save order preferences
  const saveOrderPreferences = useCallback((prefs: CustomerData['lastOrderPreferences']) => {
    setCustomerData(prev => ({
      ...prev,
      lastOrderPreferences: { ...prev.lastOrderPreferences, ...prefs }
    }));
  }, []);

  // Clear all saved data
  const clearSavedData = useCallback(() => {
    setCustomerData(defaultCustomerData);
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
