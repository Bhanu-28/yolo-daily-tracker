// Firebase Configuration - EXAMPLE FILE
// =======================================
// 1. Copy this file to firebase-config.js
// 2. Replace the placeholder values with your Firebase project credentials
// 3. Get your credentials from: Firebase Console > Project Settings > Your Apps > Web App
//
// IMPORTANT: Do NOT commit firebase-config.js with real credentials to git!

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let isFirebaseConfigured = false;
let auth = null;
let db = null;

// Check if Firebase config is valid (not placeholder values)
if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_')) {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        isFirebaseConfigured = true;

        // Enable offline persistence
        db.enablePersistence().catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('Multiple tabs open, persistence enabled in first tab only');
            } else if (err.code === 'unimplemented') {
                console.log('Browser does not support persistence');
            }
        });

        console.log('Firebase initialized successfully!');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
} else {
    console.log('Firebase not configured. Using localStorage only.');
}

// Export for use in app.js
window.firebaseConfig = {
    isConfigured: isFirebaseConfigured,
    auth: auth,
    db: db
};
