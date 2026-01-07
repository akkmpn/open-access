let isSignUpMode = false;

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Welcome Back";
    document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Sign In";
    document.getElementById('toggle-text').innerHTML = isSignUpMode ? 
        `Already have an account? <a href="#" onclick="toggleAuthMode()">Sign In</a>` : 
        `Don't have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>`;
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isSignUpMode) {
        // SIGN UP
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Check your email for the confirmation link!");
    } else {
        // SIGN IN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else {
            // Success: Redirect to Dashboard or Refresh
            window.location.reload(); 
        }
    }
});

// Logout Function
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
}

// Session Observer
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        console.log("User is logged in:", session.user);
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app-content').style.display = 'block';
    } else {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('main-app-content').style.display = 'none';
    }
});