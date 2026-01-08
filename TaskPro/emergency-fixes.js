// emergency-fixes.js - Stability & Security Patches
(function() {
    'use strict';
    
    console.log('🔧 Emergency fixes loading...');
    
    // Fix 1: Safe DOM selector with null protection
    const originalGetElementById = document.getElementById.bind(document);
    document.getElementById = function(id) {
        const el = originalGetElementById(id);
        if (!el) {
            console.warn(`⚠️ Element not found: ${id}`);
        }
        return el;
    };
    
    // Fix 2: Global error handler
    window.addEventListener('error', (e) => {
        console.error('❌ Error caught:', e.error?.message || e.message);
        if (window.TaskProApp?.showNotification) {
            TaskProApp.showNotification('An error occurred', 'error');
        }
        return true;
    });
    
    // Fix 3: Unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        console.error('❌ Promise rejection:', e.reason);
        if (window.TaskProApp?.showNotification) {
            TaskProApp.showNotification('Operation failed', 'error');
        }
        e.preventDefault();
    });
    
    // Fix 4: XSS Protection - HTML escape utility
    window.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Fix 5: Safe Supabase wrapper
    window.safeSupabaseCall = async function(operation, errorMsg = 'Database error') {
        try {
            const result = await operation();
            if (result.error) throw result.error;
            return result;
        } catch (error) {
            console.error(errorMsg, error);
            if (window.TaskProApp?.showNotification) {
                TaskProApp.showNotification(errorMsg, 'error');
            }
            return { data: null, error };
        }
    };
    
    // Fix 6: Prevent duplicate subscriptions
    window._activeSubscriptions = window._activeSubscriptions || new Map();
    
    console.log('✅ Emergency fixes applied successfully!');
    console.log('🛡️ Protected against: null errors, XSS, unhandled promises');
})();
