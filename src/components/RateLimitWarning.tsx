import { AlertCircle, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

interface RateLimitWarningProps {
  blocked: boolean;
  remainingMinutes: number;
  attemptCount: number;
  maxAttempts: number;
  type: 'login' | 'register';
}

/**
 * Componente para mostrar advertencias de rate limiting
 */
export function RateLimitWarning({
  blocked,
  remainingMinutes,
  attemptCount,
  maxAttempts,
  type
}: RateLimitWarningProps) {
  if (!blocked && attemptCount === 0) {
    return null;
  }

  const action = type === 'login' ? 'iniciar sesión' : 'registrarse';

  if (blocked) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-rose-900 text-sm mb-1">Demasiados intentos</p>
          <p className="text-rose-700 text-xs leading-relaxed flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Intenta {action} en {remainingMinutes} minuto{remainingMinutes !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  const attemptsRemaining = maxAttempts - attemptCount;
  if (attemptsRemaining > 0 && attemptsRemaining <= 2) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-amber-900 text-sm mb-1">Intentos limitados</p>
          <p className="text-amber-700 text-xs">
            Te quedan {attemptsRemaining} intento{attemptsRemaining !== 1 ? 's' : ''} antes de ser bloqueado temporalmente.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

interface RateLimitInfoProps {
  email: string;
  type: 'login' | 'register';
  children?: ReactNode;
}

/**
 * Componente contenedor que puede mostrar información adicional de rate limiting
 */
export function RateLimitInfo({ email, type, children }: RateLimitInfoProps) {
  if (!email) return <>{children}</>;

  const message = type === 'login'
    ? 'Se activa la limitación de intentos para proteger tu cuenta'
    : 'Se activa la limitación de registros para prevenir abuso';

  return (
    <div className="space-y-3">
      {children}
      <p className="text-[10px] text-slate-500 italic flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        {message}
      </p>
    </div>
  );
}
