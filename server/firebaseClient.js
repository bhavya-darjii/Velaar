// Firebase client SDK — used SERVER-SIDE to write aiLogs to Firestore.
// Uses the same project config as the frontend (web API key approach).
// This is correct for an internal/private admin server that shares one Firebase project.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'REDACTED_FIREBASE_KEY',
  authDomain: 'velaar.firebaseapp.com',
  projectId: 'velaar',
  storageBucket: 'velaar.firebasestorage.app',
  messagingSenderId: '160392890871',
  appId: '1:160392890871:web:225514b18d1240320246f2',
};

// Avoid re-initializing if already done (hot-reload safety)
const serverApp = getApps().find(a => a.name === 'server-app') 
  || initializeApp(firebaseConfig, 'server-app');

export const serverDb = getFirestore(serverApp);
