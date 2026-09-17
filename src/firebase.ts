import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.databaseURL)

export const db: Database | null = firebaseConfigured ? getDatabase(initializeApp(config)) : null
