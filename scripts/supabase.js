import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://pepyodordqrngumegchf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RUPB3gbNaE-ouMZFh-TBQw_SbH8Aamt";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);