-- 1. Tabla Maestra de Establecimientos
-- Ejecuta esto en tu proyecto de Supabase "Principal"
CREATE TABLE IF NOT EXISTS public.master_colegios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seguridad (RLS)
ALTER TABLE public.master_colegios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de colegios" ON public.master_colegios FOR SELECT USING (true);

-- 3. Datos de Ejemplo (Reemplaza con tus credenciales reales de cada proyecto)
INSERT INTO public.master_colegios (id, nombre, supabase_url, supabase_anon_key)
VALUES 
('colegio-san-jose', 'Colegio San José', 'https://school1.supabase.co', 'key1'),
('liceo-bicentenario', 'Liceo Bicentenario', 'https://school2.supabase.co', 'key2'),
('colegio-santa-maria', 'Colegio Santa María', 'https://school3.supabase.co', 'key3')
ON CONFLICT (id) DO UPDATE SET 
    supabase_url = EXCLUDED.supabase_url,
    supabase_anon_key = EXCLUDED.supabase_anon_key;
