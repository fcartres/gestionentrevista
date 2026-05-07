import { useState, useEffect } from 'react';
import { loginLimiter, registerLimiter } from '../lib/rateLimiter';

interface RateLimitStatus {
  blocked: boolean;
  remainingMinutes: number;
  attemptsRemaining: number;
  totalAttempts: number;
  maxAttempts: number;
}

/**
 * Hook para monitorear el estado de rate limiting
 */
export function useRateLimitStatus(email: string, type: 'login' | 'register' = 'login') {
  const [status, setStatus] = useState<RateLimitStatus>({
    blocked: false,
    remainingMinutes: 0,
    attemptsRemaining: 0,
    totalAttempts: 0,
    maxAttempts: 5
  });

  const limiter = type === 'login' ? loginLimiter : registerLimiter;

  useEffect(() => {
    if (!email) {
      setStatus({
        blocked: false,
        remainingMinutes: 0,
        attemptsRemaining: 0,
        totalAttempts: 0,
        maxAttempts: type === 'login' ? 5 : 3
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const info = limiter.getStatus(normalizedEmail);

    setStatus({
      blocked: info.blocked,
      remainingMinutes: info.remainingMinutes,
      attemptsRemaining: info.maxAttempts - info.attempts,
      totalAttempts: info.attempts,
      maxAttempts: info.maxAttempts
    });

    // Actualizar cada segundo si está bloqueado
    if (info.blocked) {
      const interval = setInterval(() => {
        const updatedInfo = limiter.getStatus(normalizedEmail);
        setStatus({
          blocked: updatedInfo.blocked,
          remainingMinutes: updatedInfo.remainingMinutes,
          attemptsRemaining: updatedInfo.maxAttempts - updatedInfo.attempts,
          totalAttempts: updatedInfo.attempts,
          maxAttempts: updatedInfo.maxAttempts
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [email, type, limiter]);

  return status;
}
