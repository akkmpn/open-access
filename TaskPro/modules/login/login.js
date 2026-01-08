import { supabase } from '../../supabase-config.js';

export async function init() {
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('login-btn');

        // UI Feedback
        submitBtn.innerText = "Authenticating...";
        submitBtn.disabled = true;
        authError.style.display = "none";

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            authError.innerText = error.message;
            authError.style.display = "block";
            submitBtn.innerText = "Sign In";
            submitBtn.disabled = false;
        } else {
            console.log("Login successful!", data);
            // app.js will automatically detect the session change and load the dashboard
        }
    });
}