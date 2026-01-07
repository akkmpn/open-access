// Initialize the Supabase Client
const supabaseUrl = 'https://rvxcabyylfpzvxpisemb.supabase.co'
const supabaseKey = 'sb_publishable_JzMPR2gsxWRrKnTrS7NtCA_eagXTGwx'

// CORRECTED LINE:
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// Global helper to get current user easily
const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};