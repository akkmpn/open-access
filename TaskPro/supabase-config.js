// Internal credentials
const _supabaseUrl = 'https://rvxcabyylfpzvxpisemb.supabase.co';
const _supabaseKey = 'sb_publishable_JzMPR2gsxWRrKnTrS7NtCA_eagXTGwx';

// Initialize the client on the window object to avoid "already declared" errors
window.supabase = window.supabase.createClient(_supabaseUrl, _supabaseKey);

// Create a global shortcut for your other scripts
var supabase = window.supabase;

// Global helper to get current user easily
const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
};