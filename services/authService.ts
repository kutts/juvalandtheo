
import bcrypt from 'bcryptjs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Firestore document path for auth data
const AUTH_DOC_PATH = 'settings/auth';

// LocalStorage key for current user only
export const STORAGE_KEYS = {
  CURRENT_USER: 'juval-theo-user',
} as const;

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

// Auth data interface
interface AuthData {
  dadHash: string;
  momHash: string;
  initialized: boolean;
  needsUpdate: boolean;
}

/**
 * Hash a PIN using bcrypt
 */
export function hashPin(pin: string): string {
  try {
    return bcrypt.hashSync(pin, SALT_ROUNDS);
  } catch (error) {
    console.error('Error hashing PIN:', error);
    throw error;
  }
}

/**
 * Verify a PIN against a hash
 */
export function verifyPin(pin: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(pin, hash);
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Get auth data from Firestore
 */
async function getAuthData(): Promise<AuthData | null> {
  try {
    const docRef = doc(db, AUTH_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as AuthData;
    }
    return null;
  } catch (error) {
    console.error('[AUTH] Error reading auth data:', error);
    return null;
  }
}

/**
 * Save auth data to Firestore
 */
async function saveAuthData(data: AuthData): Promise<void> {
  try {
    const docRef = doc(db, AUTH_DOC_PATH);
    await setDoc(docRef, data);
    console.log('[AUTH] Auth data saved to Firestore');
  } catch (error) {
    console.error('[AUTH] Error saving auth data:', error);
    throw error;
  }
}

/**
 * Initialize auth system with default or custom PINs
 */
export async function initializeAuth(dadPin: string = '0000', momPin: string = '5555'): Promise<void> {
  const dadHash = hashPin(dadPin);
  const momHash = hashPin(momPin);

  await saveAuthData({
    dadHash,
    momHash,
    initialized: true,
    needsUpdate: dadPin === '0000' && momPin === '5555' // Mark as needing update if using defaults
  });
}

/**
 * Check if auth system is initialized
 */
export async function isAuthInitialized(): Promise<boolean> {
  const authData = await getAuthData();
  return authData?.initialized === true;
}

/**
 * Migrate from old hardcoded system to new hashed system
 */
export async function migrateAuthIfNeeded(): Promise<boolean> {
  try {
    const initialized = await isAuthInitialized();
    if (!initialized) {
      // Migrate with old default PINs
      await initializeAuth('0000', '5555');
      console.log('[AUTH] Migrated to Firebase auth with default PINs');
      return true; // Migration occurred
    }
    return false; // Already initialized
  } catch (error) {
    console.error('[AUTH] Error during auth migration:', error);
    return false;
  }
}

/**
 * Verify login attempt
 */
export async function verifyLogin(user: 'Dad' | 'Mom', pin: string): Promise<boolean> {
  try {
    const authData = await getAuthData();

    if (!authData) {
      console.error('[AUTH] No auth data found');
      return false;
    }

    const hash = user === 'Dad' ? authData.dadHash : authData.momHash;
    return verifyPin(pin, hash);
  } catch (error) {
    console.error('[AUTH] Error verifying login:', error);
    return false;
  }
}

/**
 * Update user's PIN
 */
export async function updateUserPin(user: 'Dad' | 'Mom', newPin: string): Promise<void> {
  try {
    const authData = await getAuthData();

    if (!authData) {
      throw new Error('Auth data not found');
    }

    const newHash = hashPin(newPin);

    if (user === 'Dad') {
      authData.dadHash = newHash;
    } else {
      authData.momHash = newHash;
    }

    authData.needsUpdate = false;

    await saveAuthData(authData);
    console.log('[AUTH] PIN updated for', user);
  } catch (error) {
    console.error('[AUTH] Error updating PIN:', error);
    throw error;
  }
}

/**
 * Check if user needs to update their PIN (after migration)
 */
export async function needsPinUpdate(): Promise<boolean> {
  try {
    const authData = await getAuthData();
    return authData?.needsUpdate === true;
  } catch (error) {
    console.error('[AUTH] Error checking PIN update status:', error);
    return false;
  }
}

/**
 * Clear all auth data (for testing/reset)
 */
export async function clearAuthData(): Promise<void> {
  try {
    await saveAuthData({
      dadHash: '',
      momHash: '',
      initialized: false,
      needsUpdate: false
    });
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    console.log('[AUTH] Auth data cleared');
  } catch (error) {
    console.error('[AUTH] Error clearing auth data:', error);
  }
}
