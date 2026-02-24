import { createClient } from '@supabase/supabase-js';

// ✅ Replace with your own keys from Supabase → Settings → API
const supabaseUrl = 'https://pffdrheqhqwxooyysoow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZmRyaGVxaHF3eG9veXlzb293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjU1ODAsImV4cCI6MjA4NzQwMTU4MH0.OB7-TedidpTl7oA_qTfi85hJOTQYWAX3w5UNHHytJb8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
