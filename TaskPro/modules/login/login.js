import { supabase } from '../../supabase-config.js';

async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Login failed: " + error.message);
    } else {
        window.location.href = "/"; // Redirect to dashboard/home
    }
}