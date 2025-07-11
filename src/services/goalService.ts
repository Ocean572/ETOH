import { supabase } from './supabase';
import { UserGoal } from '../types';

export const goalService = {
  async getCurrentGoal(): Promise<UserGoal | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('goal_type', 'daily')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return data || null;
  },

  async setDailyGoal(targetDrinks: number): Promise<UserGoal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Deactivate any existing daily goals
    await supabase
      .from('user_goals')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('goal_type', 'daily');

    // Create new persistent daily goal (no end date = ongoing)
    const { data, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: user.id,
        goal_type: 'daily',
        target_drinks: targetDrinks,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null, // No end date - persistent goal
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDailyGoal(targetDrinks: number): Promise<UserGoal> {
    const currentGoal = await this.getCurrentGoal();
    
    if (currentGoal) {
      const { data, error } = await supabase
        .from('user_goals')
        .update({ target_drinks: targetDrinks })
        .eq('id', currentGoal.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      return this.setDailyGoal(targetDrinks);
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  },
};