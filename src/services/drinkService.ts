import { supabase } from './supabase';
import { DrinkEntry } from '../types';

export const drinkService = {
  async addDrinkEntry(drinkCount: number, drinkType?: string, notes?: string): Promise<DrinkEntry | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error('Authentication error: ' + authError.message);
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('drink_entries')
      .insert({
        user_id: user.id,
        drink_count: drinkCount,
        drink_type: drinkType,
        notes: notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDrinkEntries(startDate?: string, endDate?: string): Promise<DrinkEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('drink_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    if (startDate) {
      query = query.gte('logged_at', startDate);
    }
    if (endDate) {
      query = query.lte('logged_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getTodaysDrinks(): Promise<DrinkEntry[]> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.getDrinkEntries(today, tomorrow);
  },

  async getWeeklyTotal(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const entries = await this.getDrinkEntries(oneWeekAgo);
    
    return entries.reduce((total, entry) => total + entry.drink_count, 0);
  },

  async getMonthlyTotal(): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const entries = await this.getDrinkEntries(oneMonthAgo.toISOString());
    return entries.reduce((total, entry) => total + entry.drink_count, 0);
  },

  async deleteDrinkEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('drink_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateDrinkEntry(id: string, updates: { drink_count?: number; logged_at?: string }): Promise<DrinkEntry> {
    const { data, error } = await supabase
      .from('drink_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAverageDrinksPerDay(): Promise<{ average: number; daysSinceJoined: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's profile to find when they joined and last reset date
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at, reset_date')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('Profile not found');

    // Use reset date if available, otherwise use profile creation date
    const resetDate = profile.reset_date ? new Date(profile.reset_date).getTime() : new Date(profile.created_at).getTime();
    
    // Get the earliest drink entry date after reset
    const { data: firstEntry, error: firstEntryError } = await supabase
      .from('drink_entries')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', new Date(resetDate).toISOString())
      .order('logged_at', { ascending: true })
      .limit(1)
      .single();

    // Use the later of reset date or first drink entry after reset
    const firstEntryDate = firstEntry ? new Date(firstEntry.logged_at).getTime() : resetDate;
    const startDate = new Date(Math.max(resetDate, firstEntryDate)).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Calculate days since reset/joining
    const daysSinceJoined = Math.ceil((Date.now() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000));

    // Get all drink entries since reset
    const { data, error } = await supabase
      .from('drink_entries')
      .select('drink_count, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', startDate)
      .lte('logged_at', endDate + 'T23:59:59');

    if (error) throw error;
    if (!data || data.length === 0) return { average: 0, daysSinceJoined };

    // Group by date and sum drinks per day
    const dailyTotals: { [date: string]: number } = {};
    data.forEach(entry => {
      const date = entry.logged_at.split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + entry.drink_count;
    });

    // Calculate average including days with 0 drinks since reset
    const totalDrinks = Object.values(dailyTotals).reduce((sum, drinks) => sum + drinks, 0);
    const average = Math.round((totalDrinks / daysSinceJoined) * 10) / 10;

    return { average, daysSinceJoined };
  },
};