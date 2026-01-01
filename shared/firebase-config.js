// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyAxT6I5OUp_X1THaHiLWpBgk7KM5-NqQ4w",
    authDomain: "taskpro-ea29c.firebaseapp.com",
    databaseURL: "https://taskpro-ea29c-default-rtdb.firebaseio.com",
    projectId: "taskpro-ea29c",
    storageBucket: "taskpro-ea29c.firebasestorage.app",
    messagingSenderId: "917450499382",
    appId: "1:917450499382:web:55098613f6ae8a2f37ff97",
    measurementId: "G-QT3D6S9ZCZ"
};

let app, auth, database;
let isFirebaseReady = false;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    isFirebaseReady = true;
    console.log("✅ Firebase initialized");
} catch (e) {
    console.error("Firebase error:", e);
}

// Make available globally
window.firebaseConfig = firebaseConfig;
window.firebase_app = app;
window.firebase_auth = auth;
window.firebase_database = database;
