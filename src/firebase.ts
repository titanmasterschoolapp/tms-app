/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const isFirebaseConfigured = !!(
  firebaseConfig && 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== "" && 
  firebaseConfig.apiKey !== "MY_GEMINI_API_KEY" // Filter out default mock placeholders
);

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    // Bind database ID - fallback to the requested existing database ID
    const firestoreDatabaseId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-e1f874b8-ac0c-4e1f-a8be-32b4d75b2499';
    
    console.log("Project:", app.options.projectId);
    console.log("Firestore Database:", firestoreDatabaseId);

    db = getFirestore(app, firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed dynamically", error);
  }
}

export { app, db, auth, isFirebaseConfigured };
