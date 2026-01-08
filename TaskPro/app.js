import { supabase } from './supabase-config.js';

const contentArea = document.getElementById('main-content');

// --- 1. Base Path Helper ---
// Optimized for GitHub Pages subfolder compatibility
const BASE_URL = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');

// --- 2. Offline Indicator Logic ---
window.addEventListener('online', () => {
    document.body.style.filter = "none";
    showStatusMessage("Back online!", "success");
});

window.addEventListener('offline', () => {
    document.body.style.filter = "grayscale(0.3)";
    showStatusMessage("You are offline. Changes may not save.", "error");
});

function showStatusMessage(text, type) {
    let msg = document.getElementById('offline-toast');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'offline-toast';
        document.body.appendChild(msg);
    }
    msg.innerText = text;
    msg.className = `show ${type}`;
    setTimeout(() => msg.className = msg.className.replace("show", ""), 3000);
}

// --- 3. Dynamic Module Loader ---
async function loadModule(moduleName) {
    try {
        // UI Updates: Set Active Nav Link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.module === moduleName);
        });

        document.title = `TaskPro | ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;

        // Load Module CSS
        const cssId = `css-${moduleName}`;
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = `${BASE_URL}modules/${moduleName}/${moduleName}.css`;
            document.head.appendChild(link);
        }

        // Fetch Module HTML
        const response = await fetch(`${BASE_URL}modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) throw new Error(`Module ${moduleName} not found`);
        const html = await response.text();
        contentArea.innerHTML = html;

        // Import Module JS with Cache Busting
        const modulePath = `${BASE_URL}modules/${moduleName}/${moduleName}.js?t=${Date.now()}`;
        const moduleJS = await import(modulePath);
        
        if (moduleJS.init) {
            await moduleJS.init();
        }
        
        // Save state for refresh
        if (moduleName !== 'login') {
            localStorage.setItem('currentModule', moduleName);
        }

    } catch (err) {
        contentArea.innerHTML = `
            <div class="error-state" style="padding: 2rem; color: white; text-align: center;">
                <p>Error loading ${moduleName}: ${err.message}</p>
                <button class="btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
        console.error("Module Load Error:", err);
    }
}

// --- 4. Auth State Observer ---
// This handles the initial load AND state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event);
    if (session) {
        const savedModule = localStorage.getItem('currentModule') || 'dashboard';
        loadModule(savedModule);
    } else {
        loadModule('login');
    }
});

// --- 5. Navigation Listeners ---
document.addEventListener('click', (e) => {
    const target = e.target.closest('.nav-link');
    if (target && target.dataset.module) {
        loadModule(target.dataset.module);
    }
});

// --- 6. Logout Logic ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            localStorage.clear();
            window.location.reload(); 
        }
    });
}