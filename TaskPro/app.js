// ===== TASKPRO APPLICATION CORE =====
// Enhanced state management with theme switching and advanced features

// Global Application State
const TaskProApp = {
    currentUser: null,
    theme: localStorage.getItem("taskpro-theme") || "dark",
    currentSection: "dashboard",
    isLoading: false,
    sidebarOpen: false,
    
    // Timer state
    timers: {
        pomodoro: {
            isRunning: false,
            isPaused: false,
            mode: "focus",
            timeLeft: 25 * 60 * 1000,
            totalFocusTime: 0,
            sessionCount: 0
        },
        stopwatch: {
            isRunning: false,
            elapsed: 0,
            laps: [],
            startTime: null
        }
    },
    
    // Data cache
    cache: {
        tasks: [],
        habits: [],
        notes: [],
        chatMessages: [],
        lastSync: null
    },
    
    // Initialize application
    async init() {
        this.applyTheme();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupAutoSave();
        
        // Check authentication
        const session = await TaskProUtils.getCurrentSession();
        if (session) {
            this.currentUser = session.user;
            this.hideAuthScreen();
            this.loadInitialData();
            this.setupRealtimeListeners();
        } else {
            this.showAuthScreen();
        }
        
        // Update UI elements
        this.updateDateTime();
        this.startPeriodicUpdates();
    },
    
    // Theme Management
    applyTheme() {
        document.body.classList.toggle('light-theme', this.theme === 'light');
        document.body.classList.toggle('dark-theme', this.theme === 'dark');
        localStorage.setItem("taskpro-theme", this.theme);
        
        // Update theme toggle icons
        const themeIcons = document.querySelectorAll('#themeIcon, #themeIcon2');
        themeIcons.forEach(icon => {
            icon.className = this.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        });
    },
    
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
    },
    
    // Authentication Management
    showAuthScreen() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    },
    
    hideAuthScreen() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
    },
    
    // Enhanced Section Navigation with responsive handling
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const target = document.getElementById(`${sectionId}-section`);
        if (target) {
            target.classList.add('active');
        }

        // Update navigation UI
        this.updateNavigation(sectionId);
        
        // Update current section
        this.currentSection = sectionId;
        
        // Load section-specific data
        this.loadSectionData(sectionId);
        
        // Close mobile sidebar on selection
        if (window.innerWidth <= 767) {
            this.toggleSidebar(false);
        }
    },
    
    updateNavigation(sectionId) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
                link.classList.add('active');
            }
        });
    },
    
    loadSectionData(sectionId) {
        const sectionLoaders = {
            'dashboard': () => typeof initDashboard === 'function' && initDashboard(),
            'tasks': () => typeof loadTasks === 'function' && loadTasks(),
            'habits': () => typeof loadHabits === 'function' && loadHabits(),
            'notes': () => typeof loadNotes === 'function' && loadNotes(),
            'calendar': () => typeof initCalendar === 'function' && initCalendar(),
            'pomodoro': () => typeof initPomodoro === 'function' && initPomodoro(),
            'timer': () => typeof initStopwatch === 'function' && initStopwatch(),
            'community': () => {
                if (typeof loadChatHistory === 'function') loadChatHistory();
                if (typeof loadLeaderboard === 'function') loadLeaderboard();
            }
        };
        
        if (sectionLoaders[sectionId]) {
            sectionLoaders[sectionId]();
        }
    },
    
    // Sidebar Management
    toggleSidebar(force = null) {
        const sidebar = document.querySelector('.sidebar');
        const isOpen = force !== null ? force : !sidebar.classList.contains('open');
        
        sidebar.classList.toggle('open', isOpen);
        this.sidebarOpen = isOpen;
    },
    
    // Enhanced Event Listeners
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        this.showQuickSearch();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleSidebar();
                        break;
                    case 't':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
        });
        
        // Window resize handling
        window.addEventListener('resize', () => {
            if (window.innerWidth > 767 && this.sidebarOpen) {
                this.toggleSidebar(false);
            }
        });
        
        // Mobile sidebar: close when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            const mobileToggle = e.target.closest('.mobile-menu-toggle');
            
            if (window.innerWidth <= 767 && 
                sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !mobileToggle) {
                this.toggleSidebar(false);
            }
        });
        
        // Online/offline detection
        window.addEventListener('online', () => {
            this.showNotification('Connection restored', 'success');
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Connection lost', 'warning');
        });
    },
    
    setupKeyboardShortcuts() {
        // Global shortcuts
        const shortcuts = {
            'Alt+D': () => this.showSection('dashboard'),
            'Alt+T': () => this.showSection('tasks'),
            'Alt+H': () => this.showSection('habits'),
            'Alt+N': () => this.showSection('notes'),
            'Alt+C': () => this.showSection('calendar'),
            'Alt+F': () => this.showSection('pomodoro'),
            'Alt+R': () => this.showSection('timer'),
            'Alt+O': () => this.showSection('community'),
            'Escape': () => this.closeAllModals()
        };
        
        document.addEventListener('keydown', (e) => {
            const key = [];
            if (e.altKey) key.push('Alt');
            if (e.ctrlKey) key.push('Ctrl');
            if (e.shiftKey) key.push('Shift');
            key.push(e.key);
            
            const shortcut = key.join('+');
            if (shortcuts[shortcut]) {
                e.preventDefault();
                shortcuts[shortcut]();
            }
        });
    },
    
    // Auto-save functionality
    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
        
        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    },
    
    saveToLocalStorage() {
        try {
            const backup = {
                cache: this.cache,
                theme: this.theme,
                currentSection: this.currentSection,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('taskpro-backup', JSON.stringify(backup));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    },
    
    // Data Management
    async loadInitialData() {
        this.setLoading(true);
        try {
            await Promise.all([
                this.loadTasks(),
                this.loadHabits(),
                this.loadNotes()
            ]);
            this.cache.lastSync = new Date().toISOString();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load some data', 'error');
        } finally {
            this.setLoading(false);
        }
    },
    
    async loadTasks() {
        if (!this.currentUser) return [];
        
        try {
            const result = await TaskProUtils.safeSupabaseOperation(
                () => supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false })
            );
            
            this.cache.tasks = result.data || [];
            return this.cache.tasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    },
    
    async loadHabits() {
        if (!this.currentUser) return [];
        
        try {
            const result = await TaskProUtils.safeSupabaseOperation(
                () => supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false })
            );
            
            this.cache.habits = result.data || [];
            return this.cache.habits;
        } catch (error) {
            console.error('Error loading habits:', error);
            return [];
        }
    },
    
    async loadNotes() {
        if (!this.currentUser) return [];
        
        try {
            const result = await TaskProUtils.safeSupabaseOperation(
                () => supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false })
            );
            
            this.cache.notes = result.data || [];
            return this.cache.notes;
        } catch (error) {
            console.error('Error loading notes:', error);
            return [];
        }
    },
    
    // Real-time Listeners
    setupRealtimeListeners() {
        if (!this.currentUser) return;
        
        // Tasks subscription
        TaskProUtils.subscriptionManager.subscribe(`tasks-${this.currentUser.id}`, {
            onPostgresChanges: {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `user_id=eq.${this.currentUser.id}`,
                callback: () => {
                    this.loadTasks();
                    if (this.currentSection === 'tasks') {
                        typeof renderTasks === 'function' && renderTasks(this.cache.tasks);
                    }
                }
            }
        });
        
        // Habits subscription
        TaskProUtils.subscriptionManager.subscribe(`habits-${this.currentUser.id}`, {
            onPostgresChanges: {
                event: '*',
                schema: 'public',
                table: 'habits',
                filter: `user_id=eq.${this.currentUser.id}`,
                callback: () => {
                    this.loadHabits();
                    if (this.currentSection === 'habits') {
                        typeof renderHabits === 'function' && renderHabits(this.cache.habits);
                    }
                }
            }
        });
        
        // Notes subscription
        TaskProUtils.subscriptionManager.subscribe(`notes-${this.currentUser.id}`, {
            onPostgresChanges: {
                event: '*',
                schema: 'public',
                table: 'notes',
                filter: `user_id=eq.${this.currentUser.id}`,
                callback: () => {
                    this.loadNotes();
                    if (this.currentSection === 'notes') {
                        typeof renderNotes === 'function' && renderNotes(this.cache.notes);
                    }
                }
            }
        });
        
        // Community chat subscription
        TaskProUtils.subscriptionManager.subscribe('public-chat', {
            onPostgresChanges: {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                callback: (payload) => {
                    this.cache.chatMessages.push(payload.new);
                    if (this.currentSection === 'community') {
                        typeof renderChatMessage === 'function' && renderChatMessage(payload.new);
                    }
                }
            }
        });
    },
    
    // UI Utilities
    setLoading(loading) {
        this.isLoading = loading;
        document.body.classList.toggle('loading', loading);
    },
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#208084'
        };
        
        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },
    
    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        const dateElement = document.getElementById('dash-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
        
        // Update username if available
        const usernameElement = document.getElementById('dash-username');
        if (usernameElement && this.currentUser) {
            usernameElement.textContent = this.currentUser.email.split('@')[0];
        }
    },
    
    startPeriodicUpdates() {
        // Update date/time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        // Update presence every 30 seconds
        setInterval(() => this.updatePresence(), 30000);
    },
    
    async updatePresence() {
        if (!this.currentUser) return;

        try {
            await TaskProUtils.safeSupabaseOperation(
                () => supabase
                    .from('user_status')
                    .upsert({
                        user_id: this.currentUser.id,
                        username: this.currentUser.email.split('@')[0],
                        status: 'online',
                        last_seen: new Date().toISOString()
                    })
            );
        } catch (err) {
            console.error("Presence Error:", err);
        }
    },
    
    // Modal Management
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    },
    
    showQuickSearch() {
        // Implementation for quick search feature
        this.showNotification('Quick search coming soon!', 'info');
    },
    
    async syncData() {
        if (!this.currentUser) return;
        
        try {
            await this.loadInitialData();
            this.showNotification('Data synced successfully', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.showNotification('Sync failed', 'error');
        }
    }
};

// Enhanced Authentication Handler
const AuthManager = {
    async signIn(email, password) {
        TaskProApp.setLoading(true);
        try {
            const result = await TaskProUtils.safeSupabaseOperation(
                () => supabase.auth.signInWithPassword({ email, password })
            );
            
            if (result.error) {
                throw result.error;
            }
            
            TaskProApp.currentUser = result.data.user;
            TaskProApp.hideAuthScreen();
            TaskProApp.loadInitialData();
            TaskProApp.setupRealtimeListeners();
            
            TaskProApp.showNotification('Welcome back!', 'success');
        } catch (error) {
            TaskProApp.showNotification('Sign in failed: ' + error.message, 'error');
        } finally {
            TaskProApp.setLoading(false);
        }
    },
    
    async signUp(email, password) {
        TaskProApp.setLoading(true);
        try {
            const result = await TaskProUtils.safeSupabaseOperation(
                () => supabase.auth.signUp({ email, password })
            );
            
            if (result.error) {
                throw result.error;
            }
            
            TaskProApp.currentUser = result.data.user;
            TaskProApp.hideAuthScreen();
            TaskProApp.loadInitialData();
            TaskProApp.setupRealtimeListeners();
            
            TaskProApp.showNotification('Account created successfully!', 'success');
        } catch (error) {
            TaskProApp.showNotification('Sign up failed: ' + error.message, 'error');
        } finally {
            TaskProApp.setLoading(false);
        }
    },
    
    async signOut() {
        try {
            await supabase.auth.signOut();
            TaskProApp.currentUser = null;
            TaskProApp.showAuthScreen();
            TaskProUtils.subscriptionManager.unsubscribeAll();
            TaskProApp.showNotification('Signed out successfully', 'success');
        } catch (error) {
            TaskProApp.showNotification('Sign out failed', 'error');
        }
    }
};

// Legacy compatibility functions
let currentUser = null;

function showSection(sectionId) {
    TaskProApp.showSection(sectionId);
}

function handleLogout() {
    AuthManager.signOut();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TaskProApp.init();
    
    // Setup auth form handlers
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const isSignUp = document.getElementById('auth-title').textContent.includes('Sign Up');
            
            if (isSignUp) {
                await AuthManager.signUp(email, password);
            } else {
                await AuthManager.signIn(email, password);
            }
        });
    }
    
    // Setup auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            currentUser = session.user;
            TaskProApp.currentUser = session.user;
        } else {
            currentUser = null;
            TaskProApp.currentUser = null;
        }
    });
});

// Global functions for backward compatibility
window.toggleSidebar = (force) => TaskProApp.toggleSidebar(force);
window.toggleTheme = () => TaskProApp.toggleTheme();