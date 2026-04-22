// src/lib/supabase.js
// Install: npm install @supabase/supabase-js
// Add to your .env file:
//   SUPABASE_URL=https://your-project.supabase.co
//   SUPABASE_ANON_KEY=your-anon-key

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Auth helpers ──

export const signUpBrand = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'brand', name } },
  });
  if (error) throw error;
  // Create brand_profile row
  if (data.user) {
    await supabase.from('profiles').update({ name }).eq('id', data.user.id);
    await supabase.from('brand_profiles').insert({ id: data.user.id });
  }
  return data;
};

export const signUpCreator = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'creator', name } },
  });
  if (error) throw error;
  if (data.user) {
    await supabase.from('profiles').update({ name }).eq('id', data.user.id);
    await supabase.from('creator_profiles').insert({ id: data.user.id });
  }
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
