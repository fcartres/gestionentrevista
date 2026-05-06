export interface SchoolConfig {
  id: number; // ID numérico que coincide con establecimiento_id en DB
  slug: string;
  name: string;
  logo?: string;
}

// Configuración de los colegios dentro de la MISMA base de datos
export const SCHOOL_CONFIGS: SchoolConfig[] = [
  {
    id: 1,
    slug: 'colegio-san-jose',
    name: 'Colegio San José',
  },
  {
    id: 2,
    slug: 'liceo-bicentenario',
    name: 'Liceo Bicentenario',
  },
  {
    id: 3,
    slug: 'colegio-santa-maria',
    name: 'Colegio Santa María',
  }
];
