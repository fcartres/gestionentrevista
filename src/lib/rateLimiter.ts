/**
 * Rate Limiting System
 * Previene abuso de login/registro mediante limitación de intentos
 */

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // ventana de tiempo en ms
  blockDurationMs: number; // duración del bloqueo en ms
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 30 * 60 * 1000 // 30 minutos
};

const REGISTER_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hora
  blockDurationMs: 60 * 60 * 1000 // 1 hora
};

const STORAGE_KEY_PREFIX = 'ratelimit_';

class RateLimiter {
  private config: RateLimitConfig;
  private type: 'login' | 'register';

  constructor(type: 'login' | 'register' = 'login') {
    this.type = type;
    this.config = type === 'register' ? REGISTER_CONFIG : DEFAULT_CONFIG;
  }

  /**
   * Obtiene la clave de almacenamiento para un identificador
   */
  private getStorageKey(identifier: string): string {
    return `${STORAGE_KEY_PREFIX}${this.type}_${identifier}`;
  }

  /**
   * Obtiene el registro de intentos desde localStorage
   */
  private getEntry(identifier: string): RateLimitEntry {
    try {
      const key = this.getStorageKey(identifier);
      const stored = localStorage.getItem(key);
      if (!stored) {
        return { attempts: 0, lastAttempt: 0 };
      }
      return JSON.parse(stored);
    } catch {
      return { attempts: 0, lastAttempt: 0 };
    }
  }

  /**
   * Guarda el registro de intentos en localStorage
   */
  private saveEntry(identifier: string, entry: RateLimitEntry): void {
    try {
      const key = this.getStorageKey(identifier);
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      console.error('Error al guardar rate limit en localStorage');
    }
  }

  /**
   * Limpia el registro de un identificador
   */
  clear(identifier: string): void {
    try {
      const key = this.getStorageKey(identifier);
      localStorage.removeItem(key);
    } catch {
      console.error('Error al limpiar rate limit');
    }
  }

  /**
   * Verifica si un identificador está bloqueado
   */
  isBlocked(identifier: string): { blocked: boolean; remainingMs: number } {
    const entry = this.getEntry(identifier);
    const now = Date.now();

    // Si hay bloqueo activo
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        blocked: true,
        remainingMs: entry.blockedUntil - now
      };
    }

    // Si la ventana de tiempo ha expirado, reiniciamos
    if (now - entry.lastAttempt > this.config.windowMs) {
      return { blocked: false, remainingMs: 0 };
    }

    return { blocked: false, remainingMs: 0 };
  }

  /**
   * Registra un intento fallido
   */
  recordFailedAttempt(identifier: string): { blocked: boolean; remainingMs: number; attemptsRemaining: number } {
    const entry = this.getEntry(identifier);
    const now = Date.now();

    // Reiniciamos si la ventana de tiempo ha expirado
    if (now - entry.lastAttempt > this.config.windowMs) {
      entry.attempts = 0;
      entry.blockedUntil = undefined;
    }

    // Incrementamos intentos
    entry.attempts++;
    entry.lastAttempt = now;

    // Si se alcanza el máximo, bloqueamos
    if (entry.attempts >= this.config.maxAttempts) {
      entry.blockedUntil = now + this.config.blockDurationMs;
    }

    this.saveEntry(identifier, entry);

    return {
      blocked: entry.attempts >= this.config.maxAttempts,
      remainingMs: entry.blockedUntil ? entry.blockedUntil - now : 0,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - entry.attempts)
    };
  }

  /**
   * Registra un intento exitoso (limpia el contador)
   */
  recordSuccessfulAttempt(identifier: string): void {
    this.clear(identifier);
  }

  /**
   * Obtiene información de estado
   */
  getStatus(identifier: string) {
    const entry = this.getEntry(identifier);
    const { blocked, remainingMs } = this.isBlocked(identifier);
    return {
      blocked,
      attempts: entry.attempts,
      maxAttempts: this.config.maxAttempts,
      blockedUntil: entry.blockedUntil,
      remainingMs,
      remainingMinutes: Math.ceil(remainingMs / 60000)
    };
  }
}

/**
 * Utilidades para formatear mensajes de error
 */
export function getRateLimitErrorMessage(
  type: 'login' | 'register',
  remainingMinutes: number,
  attemptsRemaining: number
): string {
  const action = type === 'login' ? 'iniciar sesión' : 'registrarse';
  
  if (remainingMinutes > 0) {
    return `Demasiados intentos. Por seguridad, intenta ${action} en ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}.`;
  }
  
  if (attemptsRemaining > 0) {
    return `Te quedan ${attemptsRemaining} intento${attemptsRemaining !== 1 ? 's' : ''} antes de ser bloqueado temporalmente.`;
  }
  
  return `Demasiados intentos fallidos. Por favor, intenta más tarde.`;
}

/**
 * Exporta instancias de verificadores
 */
export const loginLimiter = new RateLimiter('login');
export const registerLimiter = new RateLimiter('register');
