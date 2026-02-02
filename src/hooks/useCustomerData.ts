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

const SAVED_ADDRESSES_KEY = 'lpg-saved-addresses';
const ORDER_PREFERENCES_KEY = 'lpg-order-preferences';

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

  // Load data from Supabase + localStorage
  const loadCustomerData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoaded(true);
        return;
      }

      // Fetch profile with address columns from DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url, default_division, default_district, default_thana, street_address')
        .eq('user_id', user.id)
        .single();

      // Load savedAddresses from localStorage
      let savedAddresses: SavedAddress[] = [];
      try {
        const savedAddressesStr = localStorage.getItem(SAVED_ADDRESSES_KEY);
        if (savedAddressesStr) {
          savedAddresses = JSON.parse(savedAddressesStr);
        }
      } catch (e) {
        console.error('Error parsing saved addresses:', e);
      }

      // Load order preferences from localStorage
      let orderPreferences: CustomerData['lastOrderPreferences'] = {};
      try {
        const prefsStr = localStorage.getItem(ORDER_PREFERENCES_KEY);
        if (prefsStr) {
          orderPreferences = JSON.parse(prefsStr);
        }
      } catch (e) {
        console.error('Error parsing order preferences:', e);
      }

      if (profile) {
        setCustomerData({
          profile: {
            name: profile.full_name || '',
            phone: profile.phone || '',
            email: user.email || ''
          },
          defaultAddress: {
            division: profile.default_division || '',
            district: profile.default_district || '',
            thana: profile.default_thana || '',
            streetAddress: profile.street_address || ''
          },
          savedAddresses,
          lastOrderPreferences: orderPreferences
        });
      } else if (user.email) {
        setCustomerData(prev => ({
          ...prev,
          profile: { ...prev.profile, email: user.email || '' },
          savedAddresses,
          lastOrderPreferences: orderPreferences
        }));
      }

      setIsLoaded(true);
      setIsSynced(true);
    } catch (error) {
      console.error('Error loading customer data:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save customer data to Supabase and localStorage
  const saveCustomerData = useCallback(async (data: Partial<CustomerData>, syncToServer = true) => {
    const updated = { 
      ...customerData, 
      ...data,
      profile: data.profile ? { ...customerData.profile, ...data.profile } : customerData.profile,
      defaultAddress: data.defaultAddress ? { ...customerData.defaultAddress, ...data.defaultAddress } : customerData.defaultAddress,
      savedAddresses: data.savedAddresses ?? customerData.savedAddresses,
      lastOrderPreferences: data.lastOrderPreferences ? { ...customerData.lastOrderPreferences, ...data.lastOrderPreferences } : customerData.lastOrderPreferences
    };
    setCustomerData(updated);

    // Persist savedAddresses to localStorage
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updated.savedAddresses));
    
    // Persist order preferences to localStorage
    localStorage.setItem(ORDER_PREFERENCES_KEY, JSON.stringify(updated.lastOrderPreferences));

    // Sync profile & address to Supabase
    if (syncToServer) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              full_name: updated.profile.name,
              phone: updated.profile.phone,
              default_division: updated.defaultAddress.division,
              default_district: updated.defaultAddress.district,
              default_thana: updated.defaultAddress.thana,
              street_address: updated.defaultAddress.streetAddress,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        }
      } catch (error) {
        console.error('Error syncing to server:', error);
      }
    }
  }, [customerData]);

  // Save address - updates default address
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
    
    // Update state
    const updatedData: Partial<CustomerData> = {
      savedAddresses: updatedAddresses
    };
    
    if (address.isDefault) {
      updatedData.defaultAddress = { 
        division: address.division,
        district: address.district,
        thana: address.thana,
        streetAddress: address.streetAddress
      };
    }

    setCustomerData(prev => ({
      ...prev,
      ...updatedData
    }));
    
    // Persist to localStorage
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updatedAddresses));
    
    return newAddress.id;
  }, [customerData.savedAddresses]);

  // Remove a saved address
  const removeSavedAddress = useCallback((addressId: string) => {
    const updatedAddresses = customerData.savedAddresses.filter(a => a.id !== addressId);
    setCustomerData(prev => ({
      ...prev,
      savedAddresses: updatedAddresses
    }));
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updatedAddresses));
  }, [customerData.savedAddresses]);

  // Set default address from saved addresses
  const setDefaultAddress = useCallback((addressId: string) => {
    const address = customerData.savedAddresses.find(a => a.id === addressId);
    if (!address) return;
    
    const updatedAddresses = customerData.savedAddresses.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));

    setCustomerData(prev => ({
      ...prev,
      savedAddresses: updatedAddresses,
      defaultAddress: {
        division: address.division,
        district: address.district,
        thana: address.thana,
        streetAddress: address.streetAddress
      }
    }));
    
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updatedAddresses));
  }, [customerData.savedAddresses]);

  // Save order preferences
  const saveOrderPreferences = useCallback((prefs: CustomerData['lastOrderPreferences']) => {
    const updated = { ...customerData.lastOrderPreferences, ...prefs };
    setCustomerData(prev => ({
      ...prev,
      lastOrderPreferences: updated
    }));
    localStorage.setItem(ORDER_PREFERENCES_KEY, JSON.stringify(updated));
  }, [customerData.lastOrderPreferences]);

  // Clear all saved data
  const clearSavedData = useCallback(() => {
    setCustomerData(defaultCustomerData);
    localStorage.removeItem(SAVED_ADDRESSES_KEY);
    localStorage.removeItem(ORDER_PREFERENCES_KEY);
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
