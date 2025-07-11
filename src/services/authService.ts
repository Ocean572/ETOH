import { supabase } from './supabase';

export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Create profile after successful signup
    if (data.user) {
      await this.createProfile(data.user.id, email);
    }
    
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Provide more helpful error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials or sign up for a new account.');
      }
      throw error;
    }
    
    // Ensure profile exists for existing users
    if (data.user) {
      await this.ensureProfile(data.user.id, data.user.email || email);
    }
    
    return data;
  },

  async createProfile(userId: string, email: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: null,
        });
      
      if (error) {
        console.error('Error creating profile:', error);
        // Don't throw here as the user is already created in auth
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  },

  async ensureProfile(userId: string, email: string) {
    try {
      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // Create profile if it doesn't exist (ignore PGRST116 error which means no rows found)
      if (!existingProfile && selectError?.code === 'PGRST116') {
        await this.createProfile(userId, email);
      }
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};