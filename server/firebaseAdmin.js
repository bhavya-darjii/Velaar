// Firebase ADMIN SDK — server-side only.
// Bypasses all Firestore security rules (full read/write access).
//
// SETUP REQUIRED:
//   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
//   2. Save the downloaded JSON as  server/serviceAccountKey.json  (it's in .gitignore)
//   3. Or set GOOGLE_SERVICE_ACCOUNT_KEY env var to the JSON string (for production)

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let credential;

// Option A: JSON string in environment variable (Render / Railway / production)
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    credential = cert(parsed);
  } catch (e) {
    console.error('[firebaseAdmin] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e.message);
  }
}

// Option B: Local service account JSON file (development)
if (!credential) {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const require = createRequire(import.meta.url);
    credential = cert(require(keyPath));
  } else {
    console.error(
      '[firebaseAdmin] ⚠️  No service account found!\n' +
      '  → Download your key from Firebase Console → Project Settings → Service Accounts\n' +
      '  → Save it as  server/serviceAccountKey.json\n' +
      '  → Or set GOOGLE_SERVICE_ACCOUNT_KEY env var with the JSON string'
    );
  }
}

let adminApp;
export let adminDb = null;

if (credential) {
  adminApp = getApps().find(a => a.name === 'admin-app')
    || initializeApp({ credential, projectId: 'velaar' }, 'admin-app');
  adminDb = getFirestore(adminApp);
} else {
  console.warn('[firebaseAdmin] ⚠️ Admin SDK bypassed. AI logging and Admin stats will fail until GOOGLE_SERVICE_ACCOUNT_KEY is configured on Render.');
}
