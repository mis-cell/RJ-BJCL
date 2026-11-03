const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const query = `
    CREATE TABLE IF NOT EXISTS mail_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT,
      error_message TEXT,
      message_id TEXT
    );
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });
  console.log('Result:', data, 'Error:', error);
}
run();
