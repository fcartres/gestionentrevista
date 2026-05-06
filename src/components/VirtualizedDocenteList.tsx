import React from 'react';
import { FixedSizeList } from 'react-window';
import { ChevronRight } from 'lucide-react';
import type { Docente, Usuario } from '../types';

interface VirtualizedDocenteListProps {
  docentes: Docente[];
  usuarios: Usuario[];
  onSelectDocente: (id: number) => void;
}

const DocenteItem: React.FC<{
  docente: Docente;
  usuario: Usuario | undefined;
  onSelect: (id: number) => void;
  style: React.CSSProperties;
}> = ({ docente, usuario, onSelect, style }) => (
  <div style={style} className="px-3 py-2">
    <button
      onClick={() => onSelect(docente.id)}
      className="w-full text-left p-6 bg-white rounded-[2.5rem] border border-slate-100 transition-all flex items-center justify-between group hover:border-blue-200 hover:shadow-xl hover:scale-[1.02] active:scale-95"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl transition-colors group-hover:bg-blue-600 group-hover:text-white">
          {usuario?.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="font-black text-slate-900 tracking-tight">{usuario?.nombre}</h4>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            {docente.especialidad}
          </p>
        </div>
      </div>
      <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
    </button>
  </div>
);

export default function VirtualizedDocenteList({
  docentes,
  usuarios,
  onSelectDocente
}: VirtualizedDocenteListProps) {
  const itemHeight = 120; // Altura aproximada de cada item

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const docente = docentes[index];
    const usuario = usuarios.find(u => u.id === docente.usuario_id);

    return (
      <DocenteItem
        docente={docente}
        usuario={usuario}
        onSelect={onSelectDocente}
        style={style}
      />
    );
  };

  if (docentes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm font-black uppercase tracking-widest">
        No se encontraron docentes
      </div>
    );
  }

  return (
    <div className="h-96"> {/* Altura fija del contenedor virtualizado */}
      <FixedSizeList
        height={384} // 96 * 4 = altura para ~4 items visibles
        itemCount={docentes.length}
        itemSize={itemHeight}
        width="100%"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}