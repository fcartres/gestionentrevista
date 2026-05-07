import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Botón para cambiar entre modo claro y oscuro
 */
export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-xl transition-all duration-300',
        'text-slate-600 dark:text-slate-400',
        'bg-slate-100 dark:bg-slate-800',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        'border border-slate-200 dark:border-slate-700',
        'flex items-center gap-2',
        className
      )}
      title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
      aria-label={`Cambiar tema (actualmente ${theme})`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
      {showLabel && (
        <span className="text-xs font-bold uppercase tracking-widest">
          {theme === 'light' ? 'Oscuro' : 'Claro'}
        </span>
      )}
    </button>
  );
}
