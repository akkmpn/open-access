// 1. Use unique internal names for credentials to avoid any global overlap
const _supabaseUrl = 'https://rvxcabyylfpzvxpisemb.supabase.co';
const _supabaseKey = 'sb_publishable_JzMPR2gsxWRrKnTrS7NtCA_eagXTGwx';

// 2. Initialize the client using window.supabase (the library) 
// and assign it to the global 'supabase' variable.
// Using 'var' or simply 'window.supabase' ensures we don't trigger a 
// "const redeclaration" error if the name is already taken.
window.supabase = window.supabase.createClient(_supabaseUrl, _supabaseKey);

// 3. Global helper to get current user easily
const getCurrentUser = async () => {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) return null;
    return user;
};