// Temporary stub for supabase - to be removed
// This file exists only to prevent build errors during transition

export const supabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
  }),
};

export default supabase;