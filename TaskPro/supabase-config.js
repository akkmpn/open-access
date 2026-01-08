// ===== SUPABASE CONFIGURATION =====
// Enhanced configuration with error handling and retry logic

const _supabaseUrl = 'https://rvxcabyylfpzvxpisemb.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eGNhYnl5bGZwenZ4cGlzZW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3ODA5ODAsImV4cCI6MjA4MzM1Njk4MH0.qm6NrMhVyEnoEP7f_wVupd2-hMkq0W7TdVBK7RHu5mg';

// Global configuration object
window.TaskProConfig = {
    supabase: {
        url: _supabaseUrl,
        key: _supabaseKey,
        options: {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        }
    },
    retryAttempts: 3,
    retryDelay: 1000
};

// Initialize Supabase client with enhanced options
try {
    if (!window.supabase) {
        throw new Error('Supabase library not loaded');
    }
    
    window.supabase = window.supabase.createClient(
        window.TaskProConfig.supabase.url,
        window.TaskProConfig.supabase.key,
        window.TaskProConfig.supabase.options
    );
    
    // Create global shortcut
    var supabase = window.supabase;
    
} catch (error) {
    console.error('Failed to initialize Supabase:', error);
    // Fallback for development
    window.supabase = {
        auth: {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
            signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
            signOut: () => Promise.resolve({ error: null })
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => Promise.resolve({ data: [], error: new Error('Supabase not initialized') })
                    })
                })
            }),
            insert: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
            update: () => ({
                eq: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') })
            }),
            delete: () => ({
                eq: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') })
            })
        }),
        channel: () => ({
            on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
        })
    };
}

// Enhanced user management with retry logic
const getCurrentUser = async (retryCount = 0) => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error && retryCount < window.TaskProConfig.retryAttempts) {
            console.warn(`Retrying getCurrentUser (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, window.TaskProConfig.retryDelay));
            return getCurrentUser(retryCount + 1);
        }
        
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Unexpected error in getCurrentUser:', error);
        return null;
    }
};

// Enhanced session management
const getCurrentSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting current session:', error);
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('Unexpected error in getCurrentSession:', error);
        return null;
    }
};

// Utility function for safe Supabase operations
const safeSupabaseOperation = async (operation, ...args) => {
    try {
        const result = await operation(...args);
        
        if (result.error) {
            console.error('Supabase operation error:', result.error);
            return { data: null, error: result.error };
        }
        
        return result;
    } catch (error) {
        console.error('Unexpected Supabase operation error:', error);
        return { data: null, error };
    }
};

// Real-time subscription manager
const subscriptionManager = {
    subscriptions: new Map(),
    
    subscribe(channelName, config) {
        // Unsubscribe existing if any
        if (this.subscriptions.has(channelName)) {
            this.subscriptions.get(channelName).unsubscribe();
        }
        
        const channel = supabase.channel(channelName);
        
        if (config.onPostgresChanges) {
            channel.on('postgres_changes', config.onPostgresChanges);
        }
        
        if (config.onBroadcast) {
            channel.on('broadcast', config.onBroadcast);
        }
        
        if (config.onPresence) {
            channel.on('presence', config.onPresence);
        }
        
        const subscription = channel.subscribe();
        this.subscriptions.set(channelName, subscription);
        
        return subscription;
    },
    
    unsubscribe(channelName) {
        if (this.subscriptions.has(channelName)) {
            this.subscriptions.get(channelName).unsubscribe();
            this.subscriptions.delete(channelName);
        }
    },
    
    unsubscribeAll() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions.clear();
    }
};

// Enhanced error handling wrapper
const withErrorHandling = (fn, errorMessage = 'Operation failed') => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(errorMessage, error);
            return { data: null, error: error.message || errorMessage };
        }
    };
};

// Export utilities for global access
window.TaskProUtils = {
    getCurrentUser,
    getCurrentSession,
    safeSupabaseOperation,
    subscriptionManager,
    withErrorHandling
};

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    subscriptionManager.unsubscribeAll();
});

// Development mode indicator
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🚀 TaskPro Development Mode - Supabase Config Loaded');
}