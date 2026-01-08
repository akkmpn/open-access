// Global State
let currentUser = null;

// 1. Section Switcher (Navigation)
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById(`${sectionId}-section`);
    if (target) {
        target.classList.add('active');
    }

    // Update Sidebar UI active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        // Check if the link's onclick attribute contains the current sectionId
        if(link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
        }
    });

    // --- REFRESH LOGIC FOR ALL MODULES ---
    // This tells each module to fetch fresh data from Supabase when you open it
    if (sectionId === 'dashboard') typeof initDashboard === 'function' && initDashboard();
    if (sectionId === 'tasks') typeof loadTasks === 'function' && loadTasks();
    if (sectionId === 'habits') typeof loadHabits === 'function' && loadHabits();
    if (sectionId === 'notes') typeof loadNotes === 'function' && loadNotes();
    if (sectionId === 'calendar') typeof initCalendar === 'function' && initCalendar();
    if (sectionId === 'pomodoro') typeof initPomodoro === 'function' && initPomodoro();
    if (sectionId === 'timer') typeof initStopwatch === 'function' && initStopwatch();
    
    if (sectionId === 'community') {
        if (typeof loadChatHistory === 'function') loadChatHistory();
        if (typeof loadLeaderboard === 'function') loadLeaderboard();
    }
}

// 2. Real-time Presence Logic (Heartbeat)
async function updatePresence() {
    if (!currentUser) return;

    try {
        await supabase
            .from('user_status')
            .upsert({
                user_id: currentUser.id,
                username: currentUser.email.split('@')[0],
                status: 'online',
                last_seen: new Date().toISOString()
            });
    } catch (err) {
        console.error("Presence Error:", err);
    }
}

// 3. Authentication & App Initialization
supabase.auth.onAuthStateChange(async (event, session) => {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');

    if (session) {
        currentUser = session.user;
        authScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        
        // Start Presence heartbeat every 30 seconds
        updatePresence();
        setInterval(updatePresence, 30000); 
        
        // Load the default view
        showSection('dashboard'); 
    } else {
        currentUser = null;
        authScreen.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

// 4. Global Logout Helper
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    window.location.reload(); // Refresh to clear state
}