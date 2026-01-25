import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface CylinderProfile {
  id: string;
  user_id: string;
  brand_name: string;
  weight: string;
  valve_size: '22mm' | '20mm';
  cylinder_photo_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useCylinderProfile = () => {
  const [profile, setProfile] = useState<CylinderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customer_cylinder_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as CylinderProfile | null);
    } catch (error) {
      logger.error('Error fetching cylinder profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (profileData: {
    brand_name: string;
    weight: string;
    valve_size: '22mm' | '20mm';
    cylinder_photo_url: string | null;
  }): Promise<boolean> => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('customer_cylinder_profiles')
        .upsert({
          user_id: user.id,
          brand_name: profileData.brand_name,
          weight: profileData.weight,
          valve_size: profileData.valve_size,
          cylinder_photo_url: profileData.cylinder_photo_url,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id' 
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data as CylinderProfile);
      return true;
    } catch (error) {
      logger.error('Error saving cylinder profile:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const verifyProfile = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;
    
    try {
      const { error } = await supabase
        .from('customer_cylinder_profiles')
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, is_verified: true });
      return true;
    } catch (error) {
      logger.error('Error verifying cylinder profile:', error);
      return false;
    }
  }, [profile]);

  useEffect(() => {
    fetchProfile();

    // Real-time subscription
    const channel = supabase
      .channel('cylinder-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_cylinder_profiles'
        },
        () => {
          fetchProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile]);

  return {
    profile,
    loading,
    saving,
    fetchProfile,
    saveProfile,
    verifyProfile,
    hasProfile: !!profile,
    isProfileComplete: !!(profile?.brand_name && profile?.weight && profile?.valve_size && profile?.cylinder_photo_url)
  };
};
