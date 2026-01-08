import { supabase } from './supabase-config.js';

const contentArea = document.getElementById('main-content');

// --- NEW: Base Path Helper ---
// This ensures that on GitHub Pages, we always reference the correct subfolder
const BASE_URL = window.location.pathname.endsWith('/') 
    ? window.location.pathname 
    : window.location.pathname.split('/').slice(0, -1).join('/') + '/';

// --- 1. Offline Indicator Logic ---
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

// --- 2. Dynamic Module Loader ---
async function loadModule(moduleName) {
    try {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.module === moduleName);
        });

        document.title = `TaskPro | ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;

        // Load Module CSS dynamically using the BASE_URL logic
        const cssId = `css-${moduleName}`;
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = `${BASE_URL}modules/${moduleName}/${moduleName}.css`;
            document.head.appendChild(link);
        }

        // Fetch HTML using the BASE_URL
        const response = await fetch(`${BASE_URL}modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) throw new Error(`Module ${moduleName} not found at ${BASE_URL}`);
        const html = await response.text();
        contentArea.innerHTML = html;

        // Import JS using the BASE_URL
        const moduleJS = await import(`${BASE_URL}modules/${moduleName}/${moduleName}.js?t=${Date.now()}`);
        
        if (moduleJS.init) {
            await moduleJS.init();
        }
        
        localStorage.setItem('currentModule', moduleName);

    } catch (err) {
        contentArea.innerHTML = `
            <div class="error-state">
                <p>Error loading ${moduleName}: ${err.message}</p>
                <button class="btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
        console.error("Module Load Error:", err);
    }
}

// --- 3. Auth State Observer ---
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        const savedModule = localStorage.getItem('currentModule') || 'dashboard';
        loadModule(savedModule);
    } else {
        loadModule('login');
    }
});

// --- 4. Global Click Listener ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = e.target.closest('.nav-link');
        if (target && target.dataset.module) {
            loadModule(target.dataset.module);
        }
    });
});

// --- 5. Logout Logic ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            localStorage.clear();
            location.reload(); 
        }
    });
}