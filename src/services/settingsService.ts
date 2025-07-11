import { supabase } from './supabase';
import { UserProfile } from '../types';

export const settingsService = {
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateMotivation(motivation: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ motivation_text: motivation })
      .eq('id', user.id);

    if (error) throw error;
  },

  async resetApplication(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start a transaction-like approach
    // 1. Update profile reset date to current time
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ reset_date: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // 2. Delete all drink entries
    const { error: drinkError } = await supabase
      .from('drink_entries')
      .delete()
      .eq('user_id', user.id);

    if (drinkError) throw drinkError;

    // 3. Delete all goals
    const { error: goalsError } = await supabase
      .from('user_goals')
      .delete()
      .eq('user_id', user.id);

    if (goalsError) throw goalsError;

    // 4. Delete all health assessments
    const { error: healthError } = await supabase
      .from('health_assessments')
      .delete()
      .eq('user_id', user.id);

    if (healthError) throw healthError;

    // 5. Delete all user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id);

    if (settingsError) throw settingsError;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};