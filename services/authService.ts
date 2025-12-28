
import bcrypt from 'bcryptjs';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_DAD: 'juval-theo-auth-dad',
  AUTH_MOM: 'juval-theo-auth-mom',
  AUTH_INITIALIZED: 'juval-theo-auth-initialized',
  AUTH_NEEDS_UPDATE: 'juval-theo-auth-needs-update',
  CURRENT_USER: 'juval-theo-user',
} as const;

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

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
 * Initialize auth system with default or custom PINs
 */
export function initializeAuth(dadPin: string = '0000', momPin: string = '5555'): void {
  const dadHash = hashPin(dadPin);
  const momHash = hashPin(momPin);

  localStorage.setItem(STORAGE_KEYS.AUTH_DAD, dadHash);
  localStorage.setItem(STORAGE_KEYS.AUTH_MOM, momHash);
  localStorage.setItem(STORAGE_KEYS.AUTH_INITIALIZED, 'true');
}

/**
 * Check if auth system is initialized
 */
export function isAuthInitialized(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTH_INITIALIZED) === 'true';
}

/**
 * Migrate from old hardcoded system to new hashed system
 */
export function migrateAuthIfNeeded(): boolean {
  try {
    if (!isAuthInitialized()) {
      // Migrate with old default PINs
      initializeAuth('0000', '5555');
      localStorage.setItem(STORAGE_KEYS.AUTH_NEEDS_UPDATE, 'true');
      return true; // Migration occurred
    }
    return false; // Already initialized
  } catch (error) {
    console.error('Error during auth migration:', error);
    return false;
  }
}

/**
 * Verify login attempt
 */
export function verifyLogin(user: 'Dad' | 'Mom', pin: string): boolean {
  const storageKey = user === 'Dad' ? STORAGE_KEYS.AUTH_DAD : STORAGE_KEYS.AUTH_MOM;
  const storedHash = localStorage.getItem(storageKey);

  if (!storedHash) {
    return false;
  }

  return verifyPin(pin, storedHash);
}

/**
 * Update user's PIN
 */
export function updateUserPin(user: 'Dad' | 'Mom', newPin: string): void {
  const storageKey = user === 'Dad' ? STORAGE_KEYS.AUTH_DAD : STORAGE_KEYS.AUTH_MOM;
  const newHash = hashPin(newPin);
  localStorage.setItem(storageKey, newHash);

  // Clear needs update flag if it exists
  localStorage.removeItem(STORAGE_KEYS.AUTH_NEEDS_UPDATE);
}

/**
 * Check if user needs to update their PIN (after migration)
 */
export function needsPinUpdate(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTH_NEEDS_UPDATE) === 'true';
}

/**
 * Clear all auth data (for testing/reset)
 */
export function clearAuthData(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_DAD);
  localStorage.removeItem(STORAGE_KEYS.AUTH_MOM);
  localStorage.removeItem(STORAGE_KEYS.AUTH_INITIALIZED);
  localStorage.removeItem(STORAGE_KEYS.AUTH_NEEDS_UPDATE);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}
