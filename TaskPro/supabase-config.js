import { createClient } from '@supabase/supabase-js';

// Note: In a production environment, use environment variables.
const SUPABASE_URL = "https://rvxcabyylfpzvxpisemb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGNhYnl5bGZwenZ4cGlzZW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODA5ODAsImV4cCI6MjA4MzM1Njk4MH0.qm6NrMhVyEnoEP7f_wVupd2-hMkq0W7TdVBK7RHu5mg"; 

// Initialize the client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Quick Test: Check Connection ---
// This will run in your browser console to confirm it's working
const testConnection = async () => {
    try {
        // We try to fetch the session as a simple "heartbeat" check
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        console.log("✅ Supabase connected successfully!");
    } catch (err) {
        console.error("❌ Supabase connection failed:", err.message);
    }
};

testConnection();