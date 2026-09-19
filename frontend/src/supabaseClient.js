import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mubpxnznhwmiaezzcogt.supabase.co";
const supabaseAnonKey = "sb_publishable_ZhVVlg0Aclvu48zqkbh07g_kE1Dn7u3";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
