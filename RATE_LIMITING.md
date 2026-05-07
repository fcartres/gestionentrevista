# Sistema de Rate Limiting - Documentación

## Overview

Se ha implementado un sistema robusto de **Rate Limiting** para proteger los endpoints de login y registro contra abuso y ataques de fuerza bruta.

## Características Principales

### 1. **Limitación de Intentos de Login**
- **Máximo de intentos**: 5 intentos fallidos
- **Ventana de tiempo**: 15 minutos
- **Duración del bloqueo**: 30 minutos
- **Almacenamiento**: localStorage (seguro por email)

### 2. **Limitación de Intentos de Registro**
- **Máximo de intentos**: 3 intentos fallidos
- **Ventana de tiempo**: 1 hora
- **Duración del bloqueo**: 1 hora
- **Almacenamiento**: localStorage (seguro por email)

### 3. **Interfaz de Usuario**
- Advertencias visuales cuando se acerca al límite de intentos
- Mensaje de bloqueo con tiempo restante
- Campos deshabilitados durante bloqueos
- Actualización en tiempo real del contador

## Componentes Implementados

### `src/lib/rateLimiter.ts`
**Clase principal: RateLimiter**

Métodos disponibles:
```typescript
// Verificar si un identificador está bloqueado
isBlocked(identifier: string): { blocked: boolean; remainingMs: number }

// Registrar un intento fallido
recordFailedAttempt(identifier: string): { 
  blocked: boolean; 
  remainingMs: number; 
  attemptsRemaining: number 
}

// Registrar un intento exitoso (limpia contadores)
recordSuccessfulAttempt(identifier: string): void

// Obtener estado detallado
getStatus(identifier: string): {
  blocked: boolean;
  attempts: number;
  maxAttempts: number;
  blockedUntil: number;
  remainingMs: number;
  remainingMinutes: number;
}

// Limpiar historial
clear(identifier: string): void
```

### `src/hooks/useRateLimitStatus.ts`
**Hook React para monitorear estado en tiempo real**

```typescript
const status = useRateLimitStatus(email, 'login');
// Devuelve:
// {
//   blocked: boolean
//   remainingMinutes: number
//   attemptsRemaining: number
//   totalAttempts: number
//   maxAttempts: number
// }
```

### `src/components/RateLimitWarning.tsx`
**Componentes visuales**

- `<RateLimitWarning />`: Muestra advertencias/bloqueos
- `<RateLimitInfo />`: Información contextual

## Integración en Autenticación

### En `src/hooks/useStorage.ts`

**Función login modificada:**
```typescript
const login = async (email: string, password: string): Promise<{ 
  usuario: Usuario | null; 
  error?: string 
}> => {
  // Verifica rate limiting
  // Registra intentos fallidos
  // Limpia contadores en éxito
}
```

**Función register modificada:**
```typescript
// Integrada en registerMutation
// Verifica rate limiting antes de crear cuenta
// Captura fallos por email duplicado
```

## Flujo de Uso

### Escenario 1: Login Normal
1. Usuario ingresa email y contraseña
2. Se verifica si está bloqueado → No
3. Se intenta autenticar
4. **Éxito**: Se limpia el contador, acceso concedido
5. **Fallo**: Se registra intento fallido, contador incrementado

### Escenario 2: Múltiples Intentos Fallidos
1. Intento 1-4: Contador sube, se muestra advertencia
2. Intento 5: Se alcanza límite, usuario bloqueado 30 minutos
3. Se muestra: "Demasiados intentos. Intenta en 30 minutos"
4. Campos deshabilitados, botón inactivo
5. Timer actualiza cada segundo

### Escenario 3: Bloqueo Expirado
1. Usuario espera 30 minutos (o límite configurado)
2. Contador se resetea automáticamente
3. Usuario puede intentar nuevamente

## Configuración

### Modificar Límites

En `src/lib/rateLimiter.ts`:

```typescript
// Para Login
const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,        // Cambiar aquí
  windowMs: 15 * 60 * 1000,      // Cambiar ventana
  blockDurationMs: 30 * 60 * 1000 // Cambiar duración bloqueo
};

// Para Registro
const REGISTER_CONFIG: RateLimitConfig = {
  maxAttempts: 3,        // Cambiar aquí
  windowMs: 60 * 60 * 1000,      // 1 hora
  blockDurationMs: 60 * 60 * 1000 // 1 hora
};
```

## Almacenamiento

Los datos de rate limiting se guardan en **localStorage** con la estructura:
```javascript
localStorage['ratelimit_login_email@ejemplo.com'] = {
  attempts: 3,
  lastAttempt: 1715080000000,
  blockedUntil: 1715082000000  // opcional
}
```

**Ventajas:**
- ✅ No requiere servidor
- ✅ Persiste entre sesiones
- ✅ No afecta otros usuarios
- ✅ Bajo costo computacional

**Limitaciones:**
- ⚠️ Se puede limpiar manualmente (localStorage claro)
- ⚠️ No sincronizado entre dispositivos

## Mensajes de Error

### Login Bloqueado
```
"Demasiados intentos. Por seguridad, intenta iniciar sesión en 30 minutos."
```

### Intentos Limitados (Warning)
```
"Te quedan 2 intentos antes de ser bloqueado temporalmente."
```

### Registro Bloqueado
```
"Demasiados intentos. Por seguridad, intenta registrarte en 1 hora."
```

## Seguridad

### Protecciones Implementadas
1. **Identificación por email** (normalizado y en minúsculas)
2. **Contadores independientes** para login y registro
3. **Ventanas de tiempo dinámicas** según tipo de operación
4. **Bloqueos progresivos** contra fuerza bruta
5. **Auto-expiración** de registros antiguos

### Consideraciones
- El sistema usa localStorage que es local al navegador
- Para protección servidora adicional, implementar verificación en backend
- Considerar complementar con CAPTCHA para mayor seguridad

## Ejemplo de Uso en Componentes

```tsx
import { useRateLimitStatus } from './hooks/useRateLimitStatus';
import { RateLimitWarning } from './components/RateLimitWarning';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const rateLimit = useRateLimitStatus(email, 'login');

  return (
    <form>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={rateLimit.blocked}
      />
      
      {rateLimit.blocked && (
        <RateLimitWarning
          blocked={true}
          remainingMinutes={rateLimit.remainingMinutes}
          attemptCount={rateLimit.totalAttempts}
          maxAttempts={rateLimit.maxAttempts}
          type="login"
        />
      )}
    </form>
  );
}
```

## Testing

Para probar el sistema:

1. **Abrir Dev Tools** (F12)
2. **Ir a Application > LocalStorage**
3. **Buscar keys** que contengan `ratelimit_`
4. **Modificar manualmente** para simular bloqueos

O usar consola:
```javascript
// Limpiar todos los rate limits
Object.keys(localStorage)
  .filter(k => k.includes('ratelimit_'))
  .forEach(k => localStorage.removeItem(k));

// Ver intentos de un email
const key = localStorage.keys().find(k => k.includes('login_'))
console.log(JSON.parse(localStorage[key]))
```

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Usuario no puede registrarse | Bloqueado por rate limit | Esperar o limpiar localStorage |
| Contador no se resetea | Email diferente o localStorage corrupto | Limpiar localStorage y reintentar |
| Campos no se habilitan | Bug en actualización de estado | Recargar página |
| No ve advertencia | Email vacío o no capturado | Revisar que onChange funcione |

## Futuras Mejoras

- [ ] Rate limiting por IP (requiere backend)
- [ ] Integración con CAPTCHA después de 3 intentos
- [ ] Notificaciones por email de intentos fallidos
- [ ] Dashboard de intentos de acceso para admin
- [ ] Sincronización con servidor (base de datos)
- [ ] Bloqueo temporal de dispositivos específicos
