import { supabase } from './supabase';

export const authService = {
  async signUp(email: string, password: string, fullName?: string, gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Create profile after successful signup
    if (data.user) {
      await this.createProfile(data.user.id, email, fullName, gender);
    }
    
    return data;
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid')) {
          throw new Error('Account not found. The database was recently reset - please create a new account by signing up.');
        }
        throw error;
      }
      
      // Ensure profile exists for existing users
      if (data.user) {
        await this.ensureProfile(data.user.id, data.user.email || email);
      }
      
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async createProfile(userId: string, email: string, fullName?: string, gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say') {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: fullName || null,
          gender: gender,
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