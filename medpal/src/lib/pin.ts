import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10
const MAX_ATTEMPTS = 3
const LOCK_MS = 30_000
const LOCK_KEY = 'medpal-pin-lock'

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

interface LockState {
  attempts: number
  lockedUntil: number | null
}

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (raw) return JSON.parse(raw) as LockState
  } catch {
    // corrupted — treat as fresh
  }
  return { attempts: 0, lockedUntil: null }
}

function writeLock(state: LockState) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(state))
}

/** Milliseconds until the PIN entry unlocks, or 0 if not locked. */
export function lockRemainingMs(): number {
  const { lockedUntil } = readLock()
  if (!lockedUntil) return 0
  return Math.max(0, lockedUntil - Date.now())
}

/** Records a failed attempt. Returns ms until unlock (0 = still allowed). */
export function recordFailedAttempt(): number {
  const state = readLock()
  const attempts = state.attempts + 1
  if (attempts >= MAX_ATTEMPTS) {
    writeLock({ attempts: 0, lockedUntil: Date.now() + LOCK_MS })
    return LOCK_MS
  }
  writeLock({ attempts, lockedUntil: null })
  return 0
}

export function clearAttempts() {
  localStorage.removeItem(LOCK_KEY)
}
