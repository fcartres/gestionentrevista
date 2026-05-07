/**
 * Ejemplos de Uso del Sistema de Rate Limiting
 * Guía práctica para implementar y extender el rate limiting
 */

// ============================================================================
// EJEMPLO 1: Usar Rate Limiting Directo
// ============================================================================

import { loginLimiter, registerLimiter } from '@/lib/rateLimiter';

// Verificar si un email está bloqueado
const email = 'usuario@ejemplo.com';
const { blocked, remainingMs } = loginLimiter.isBlocked(email);

if (blocked) {
  console.log(`Usuario bloqueado. Puede intentar en ${Math.ceil(remainingMs / 60000)} minutos`);
}

// Registrar intento fallido
const result = loginLimiter.recordFailedAttempt(email);
console.log(`
  Intento fallido registrado
  Bloqueado: ${result.blocked}
  Intentos restantes: ${result.attemptsRemaining}
`);

// Registrar intento exitoso (limpia el contador)
loginLimiter.recordSuccessfulAttempt(email);
console.log('Sesión iniciada, contador limpiado');

// ============================================================================
// EJEMPLO 2: Usar Hook en Componente
// ============================================================================

import { useRateLimitStatus } from '@/hooks/useRateLimitStatus';
import { RateLimitWarning } from '@/components/RateLimitWarning';
import { useState } from 'react';

export function LoginExample() {
  const [email, setEmail] = useState('');
  const rateLimit = useRateLimitStatus(email, 'login');

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com"
        disabled={rateLimit.blocked}
      />

      {/* Mostrar warning si está necesario */}
      {(rateLimit.blocked || rateLimit.totalAttempts > 0) && (
        <RateLimitWarning
          blocked={rateLimit.blocked}
          remainingMinutes={rateLimit.remainingMinutes}
          attemptCount={rateLimit.totalAttempts}
          maxAttempts={rateLimit.maxAttempts}
          type="login"
        />
      )}

      {/* Debug info */}
      <pre>
        {JSON.stringify(rateLimit, null, 2)}
      </pre>
    </div>
  );
}

// ============================================================================
// EJEMPLO 3: Crear Limiter Personalizado
// ============================================================================

import type { RateLimitConfig } from '@/lib/rateLimiter';

// Crear un limiter para API con configuración personalizada
const apiLimiterConfig: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 1 * 60 * 1000, // 1 minuto
  blockDurationMs: 5 * 60 * 1000 // 5 minutos
};

class RateLimiter {
  private config: RateLimitConfig;
  private type: 'login' | 'register';

  constructor(type: 'login' | 'register' = 'login') {
    this.type = type;
    this.config = apiLimiterConfig;
  }

  // ... más métodos
}

// ============================================================================
// EJEMPLO 4: Extender con Almacenamiento en Servidor
// ============================================================================

/**
 * Para producción, combinar localStorage con servidor:
 * 1. Guardar en localStorage para validación rápida
 * 2. Enviar evento al servidor para registro persistente
 * 3. Servidor verifica IP y valida
 */

async function recordFailedAttemptWithServer(email: string) {
  // 1. Registrar localmente (rápido)
  const result = loginLimiter.recordFailedAttempt(email);

  // 2. Enviar al servidor (async)
  try {
    await fetch('/api/security/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        type: 'login_failed',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        // Tu servidor puede detectar IP automáticamente
      })
    });
  } catch (err) {
    console.error('Error enviando rate limit al servidor:', err);
  }

  return result;
}

// ============================================================================
// EJEMPLO 5: Integración en Función de Login
// ============================================================================

async function loginWithRateLimit(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verificar si está bloqueado
  const { blocked, remainingMs } = loginLimiter.isBlocked(normalizedEmail);
  if (blocked) {
    throw new Error(
      `Demasiados intentos. Intenta en ${Math.ceil(remainingMs / 60000)} minutos`
    );
  }

  // 2. Intentar autenticación
  try {
    const usuario = await authenticateUser(email, password);
    
    // 3. Si éxito, limpiar contador
    loginLimiter.recordSuccessfulAttempt(normalizedEmail);
    return usuario;
  } catch (err) {
    // 4. Si falla, registrar intento
    const { blocked: nowBlocked, attemptsRemaining } = 
      loginLimiter.recordFailedAttempt(normalizedEmail);
    
    throw new Error(
      nowBlocked
        ? `Demasiados intentos. Intenta más tarde.`
        : `Credenciales incorrectas. Te quedan ${attemptsRemaining} intentos.`
    );
  }
}

// ============================================================================
// EJEMPLO 6: Limpiar Rate Limits Manualmente (Admin)
// ============================================================================

function AdminClearRateLimits() {
  const [email, setEmail] = useState('');

  const handleClear = () => {
    if (window.confirm(`¿Limpiar rate limit para ${email}?`)) {
      loginLimiter.clear(email);
      registerLimiter.clear(email);
      alert('Rate limit limpiado');
    }
  };

  return (
    <div className="p-4 bg-slate-100 rounded">
      <h3>Rate Limit Admin</h3>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@ejemplo.com"
      />
      <button onClick={handleClear}>Limpiar Rate Limit</button>
    </div>
  );
}

// ============================================================================
// EJEMPLO 7: Monitoreo y Logs
// ============================================================================

function logRateLimitStatus(email: string) {
  const status = loginLimiter.getStatus(email);
  
  console.log('Rate Limit Status:', {
    email,
    blocked: status.blocked,
    attempts: `${status.attempts}/${status.maxAttempts}`,
    remainingTime: status.remainingMinutes ? `${status.remainingMinutes}m` : '—',
    blockedUntil: status.blockedUntil 
      ? new Date(status.blockedUntil).toLocaleTimeString()
      : null
  });

  return status;
}

// ============================================================================
// EJEMPLO 8: Testing
// ============================================================================

// Tests para verificar funcionamiento
function testRateLimiter() {
  const testEmail = 'test@ejemplo.com';

  // Limpiar primero
  loginLimiter.clear(testEmail);

  // Test 1: Intentos antes de bloqueo
  for (let i = 1; i <= 5; i++) {
    const result = loginLimiter.recordFailedAttempt(testEmail);
    console.log(`Intento ${i}: bloqueado = ${result.blocked}, quedan ${result.attemptsRemaining}`);
  }

  // Test 2: Verificar bloqueo
  const { blocked } = loginLimiter.isBlocked(testEmail);
  console.log(`Usuario bloqueado: ${blocked}`); // true

  // Test 3: Limpiar y reintentar
  loginLimiter.clear(testEmail);
  const result = loginLimiter.recordFailedAttempt(testEmail);
  console.log(`Después de limpiar: bloqueado = ${result.blocked}`); // false
}

// ============================================================================
// EJEMPLO 9: Configuración en .env
// ============================================================================

/*
// .env file
VITE_LOGIN_MAX_ATTEMPTS=5
VITE_LOGIN_WINDOW_MS=900000      # 15 minutos
VITE_LOGIN_BLOCK_DURATION_MS=1800000  # 30 minutos

VITE_REGISTER_MAX_ATTEMPTS=3
VITE_REGISTER_WINDOW_MS=3600000     # 1 hora
VITE_REGISTER_BLOCK_DURATION_MS=3600000  # 1 hora
*/

// Usar en rateLimiter.ts:
const DEFAULT_CONFIG = {
  maxAttempts: parseInt(import.meta.env.VITE_LOGIN_MAX_ATTEMPTS || '5'),
  windowMs: parseInt(import.meta.env.VITE_LOGIN_WINDOW_MS || '900000'),
  blockDurationMs: parseInt(import.meta.env.VITE_LOGIN_BLOCK_DURATION_MS || '1800000')
};

// ============================================================================
// EJEMPLO 10: Integración con Analytics
// ============================================================================

async function trackRateLimitEvent(email: string, eventType: 'blocked' | 'attempt' | 'cleared') {
  try {
    await fetch('/api/analytics/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        eventType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    });
  } catch (err) {
    console.error('Error tracking rate limit event:', err);
  }
}

// Usar en recordFailedAttempt
const result = loginLimiter.recordFailedAttempt(email);
if (result.blocked) {
  await trackRateLimitEvent(email, 'blocked');
}
