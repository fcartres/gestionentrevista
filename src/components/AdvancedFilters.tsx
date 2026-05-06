import { useState, useMemo } from 'react';
import { Search, Calendar, User, Filter, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Docente, Usuario } from '../types';

interface AdvancedFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  selectedDocente: number | '';
  onDocenteChange: (value: number | '') => void;
  selectedEstado: string;
  onEstadoChange: (value: string) => void;
  docentes: Docente[];
  usuarios: Usuario[];
  onClearFilters: () => void;
  totalResults: number;
}

export default function AdvancedFilters({
  searchTerm,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selectedDocente,
  onDocenteChange,
  selectedEstado,
  onEstadoChange,
  docentes,
  usuarios,
  onClearFilters,
  totalResults
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const docenteOptions = useMemo(() => {
    return docentes.map(docente => {
      const usuario = usuarios.find(u => u.id === docente.usuario_id);
      return {
        id: docente.id,
        nombre: usuario?.nombre || 'Desconocido',
        especialidad: docente.especialidad
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [docentes, usuarios]);

  const estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'asistio', label: 'Asistió' },
    { value: 'no-asistio', label: 'No asistió' }
  ];

  const hasActiveFilters = searchTerm || dateFrom || dateTo || selectedDocente || selectedEstado;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header con búsqueda básica */}
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, especialidad o temas..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-900 placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "px-6 py-4 rounded-2xl border-2 transition-all font-bold text-sm uppercase tracking-widest flex items-center gap-2",
              isExpanded
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-200"
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-4 py-4 rounded-2xl bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 transition-all font-bold text-sm uppercase tracking-widest flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
        <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros avanzados expandibles */}
      {isExpanded && (
        <div className="p-6 bg-slate-50/30 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Filtro por fecha desde */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Fecha desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-300 transition-all font-bold text-sm"
              />
            </div>

            {/* Filtro por fecha hasta */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Fecha hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-300 transition-all font-bold text-sm"
              />
            </div>

            {/* Filtro por docente */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" />
                Docente
              </label>
              <select
                value={selectedDocente}
                onChange={(e) => onDocenteChange(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-300 transition-all font-bold text-sm"
              >
                <option value="">Todos los docentes</option>
                {docenteOptions.map(docente => (
                  <option key={docente.id} value={docente.id}>
                    {docente.nombre} - {docente.especialidad}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por estado */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Estado
              </label>
              <select
                value={selectedEstado}
                onChange={(e) => onEstadoChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-300 transition-all font-bold text-sm"
              >
                {estadoOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicadores de filtros activos */}
          {hasActiveFilters && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros activos:</span>
                {searchTerm && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                    Búsqueda: "{searchTerm}"
                  </span>
                )}
                {dateFrom && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    Desde: {new Date(dateFrom).toLocaleDateString('es-ES')}
                  </span>
                )}
                {dateTo && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    Hasta: {new Date(dateTo).toLocaleDateString('es-ES')}
                  </span>
                )}
                {selectedDocente && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    Docente: {docenteOptions.find(d => d.id === selectedDocente)?.nombre}
                  </span>
                )}
                {selectedEstado && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                    Estado: {estadoOptions.find(e => e.value === selectedEstado)?.label}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}