// ==================== SHARED UTILITIES & SYNC ====================

window.userId = null;
let syncInterval = null;
let syncQueue = [];
const DB_NAME = 'TaskProDB';

// ==================== INDEXEDDB SETUP ====================
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ==================== AUTHENTICATION ====================
async function authenticateWithFirebase(email, password) {
    try {
        let userCredential;
        try {
            // Try to sign in
            userCredential = await window.firebase_auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Auto-register if not found
                userCredential = await window.firebase_auth.createUserWithEmailAndPassword(email, password);
            } else {
                throw error;
            }
        }
        
        window.userId = userCredential.user.uid;
        localStorage.setItem('userId', window.userId);
        localStorage.setItem('userEmail', email);
        
        console.log("✅ Authenticated:", email);
        
        // Start sync
        enableAutoSync();
        await loadDataFromFirebase();
        
        return { success: true, userId: window.userId };
    } catch (error) {
        console.error("Auth error:", error);
        return { success: false, error: error.message };
    }
}

function logoutUser() {
    window.firebase_auth.signOut();
    window.userId = null;
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    clearSyncInterval();
    console.log("✅ Logged out");
}

// ==================== DATA OPERATIONS ====================
async function saveTask(task) {
    const db = await initIndexedDB();
    const transaction = db.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');
    
    task.updatedAt = Date.now();
    task.synced = false;
    
    return new Promise((resolve, reject) => {
        const request = store.put(task);
        request.onsuccess = () => {
            queueForSync('tasks', task);
            resolve(task);
        };
        request.onerror = () => reject(request.error);
    });
}

async function getTask(taskId) {
    const db = await initIndexedDB();
    const transaction = db.transaction(['tasks'], 'readonly');
    const store = transaction.objectStore('tasks');
    
    return new Promise((resolve, reject) => {
        const request = store.get(taskId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllTasks() {
    const db = await initIndexedDB();
    const transaction = db.transaction(['tasks'], 'readonly');
    const store = transaction.objectStore('tasks');
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deleteTask(taskId) {
    const db = await initIndexedDB();
    const transaction = db.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');
    
    return new Promise((resolve, reject) => {
        const request = store.delete(taskId);
        request.onsuccess = () => {
            queueForSync('deleteTask', { id: taskId });
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// ==================== SYNC QUEUE ====================
async function queueForSync(operation, data) {
    const db = await initIndexedDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const item = {
        operation,
        data,
        timestamp: Date.now(),
        retries: 0
    };
    
    return new Promise((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getSyncQueue() {
    const db = await initIndexedDB();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function clearSyncQueueItem(id) {
    const db = await initIndexedDB();
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ==================== FIREBASE SYNC ====================
async function syncWithFirebase() {
    if (!window.userId || !window.firebase_database) return;
    
    const queue = await getSyncQueue();
    
    for (const item of queue) {
        try {
            if (item.operation === 'tasks') {
                const data = item.data;
                await window.firebase_database.ref(`users/${window.userId}/tasks/${data.id}`).set({
                    ...data,
                    syncedAt: new Date().toISOString()
                });
                await clearSyncQueueItem(item.id);
            } else if (item.operation === 'deleteTask') {
                await window.firebase_database.ref(`users/${window.userId}/tasks/${item.data.id}`).remove();
                await clearSyncQueueItem(item.id);
            }
        } catch (error) {
            console.error("Sync error:", error);
            item.retries = (item.retries || 0) + 1;
            if (item.retries > 3) {
                await clearSyncQueueItem(item.id);
            }
        }
    }
    
    updateSyncStatus('synced');
}

async function loadDataFromFirebase() {
    if (!window.userId || !window.firebase_database) return;
    
    try {
        const snapshot = await window.firebase_database.ref(`users/${window.userId}/tasks`).once('value');
        const remoteTasks = snapshot.val() || {};
        
        const db = await initIndexedDB();
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        for (const [key, task] of Object.entries(remoteTasks)) {
            await new Promise((resolve, reject) => {
                const request = store.put(task);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        console.log("✅ Data loaded from Firebase");
    } catch (error) {
        console.error("Load error:", error);
    }
}

function enableAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        syncWithFirebase();
    }, 30000); // Every 30 seconds
}

function clearSyncInterval() {
    if (syncInterval) clearInterval(syncInterval);
}

function updateSyncStatus(status) {
    const indicator = document.getElementById('syncStatus');
    if (!indicator) return;
    
    const statusColors = {
        'synced': '#10b981',
        'syncing': '#f59e0b',
        'offline': '#ef4444',
        'error': '#ef4444'
    };
    
    indicator.style.background = statusColors[status] || '#gray';
}

// ==================== APP INITIALIZATION ====================
async function initApp() {
    // Initialize IndexedDB
    try {
        await initIndexedDB();
    } catch (error) {
        console.error("IndexedDB error:", error);
    }
    
    // Check if user is already logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
        window.userId = userId;
        enableAutoSync();
        await loadDataFromFirebase();
        console.log("✅ User restored:", userId);
    }
    
    // Listen for Firebase auth changes
    window.firebase_auth.onAuthStateChanged((user) => {
        if (user) {
            window.userId = user.uid;
            localStorage.setItem('userId', user.uid);
            enableAutoSync();
            console.log("✅ Firebase user:", user.email);
        } else {
            window.userId = null;
            clearSyncInterval();
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatISODate(date) {
    return date.split('T')[0];
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// Export all functions globally
window.authenticateWithFirebase = authenticateWithFirebase;
window.logoutUser = logoutUser;
window.saveTask = saveTask;
window.getTask = getTask;
window.getAllTasks = getAllTasks;
window.deleteTask = deleteTask;
window.initApp = initApp;
window.syncWithFirebase = syncWithFirebase;
window.updateSyncStatus = updateSyncStatus;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatISODate = formatISODate;
window.getTodayISO = getTodayISO;
