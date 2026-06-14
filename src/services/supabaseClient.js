import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Supabase URL e Anon Key não foram encontradas no arquivo .env")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)