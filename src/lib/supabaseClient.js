import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_i_u2xeBeomYmIqQ2XhD66Q_jD0bb4XN';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
