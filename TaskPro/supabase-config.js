// Note: In a production environment, use environment variables.
// For local development/testing, you can use these strings.
const SUPABASE_URL = "https://rvxcabyylfpzvxpisemb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGNhYnl5bGZwenZ4cGlzZW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODA5ODAsImV4cCI6MjA4MzM1Njk4MH0.qm6NrMhVyEnoEP7f_wVupd2-hMkq0W7TdVBK7RHu5mg"; // Your full key here

// Initialize the client
export const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);