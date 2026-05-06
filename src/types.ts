export type Role = 'admin' | 'docente' | 'apoderado';

export interface Establecimiento {
  id: number;
  nombre: string;
  direccion?: string;
  created_at: string;
}

export interface Usuario {
  id: number;
  establecimiento_id: number;
  nombre: string;
  email: string;
  password?: string;
  rol: Role;
  created_at: string;
}

export interface Docente {
  id: number;
  establecimiento_id: number;
  usuario_id: number;
  especialidad: string;
}

export interface Disponibilidad {
  id: number;
  establecimiento_id: number;
  docente_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Reserva {
  id: number;
  establecimiento_id: number;
  docente_id: number;
  apoderado_id: number;
  fecha: string;
  hora: string;
  estado: 'reservado' | 'cancelado' | 'asistio' | 'no-asistio';
  temas?: string;
  created_at: string;
}

export interface DB {
  establecimientos: Establecimiento[];
  usuarios: Usuario[];
  docentes: Docente[];
  disponibilidad: Disponibilidad[];
  reservas: Reserva[];
}
