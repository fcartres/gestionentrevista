-- Migration Script for Supabase (SQL Editor)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create Establecimientos Table
CREATE TABLE IF NOT EXISTS public.establecimientos (
    id BIGINT PRIMARY KEY,
    nombre TEXT NOT NULL,
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Usuarios Table
CREATE TABLE IF NOT EXISTS public.usuarios (
    id BIGINT PRIMARY KEY,
    establecimiento_id BIGINT REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'docente', 'apoderado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Docentes Table
CREATE TABLE IF NOT EXISTS public.docentes (
    id BIGINT PRIMARY KEY,
    establecimiento_id BIGINT REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    especialidad TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Disponibilidad Table
CREATE TABLE IF NOT EXISTS public.disponibilidad (
    id BIGINT PRIMARY KEY,
    establecimiento_id BIGINT REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    docente_id BIGINT REFERENCES public.docentes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Reservas Table
CREATE TABLE IF NOT EXISTS public.reservas (
    id BIGINT PRIMARY KEY,
    establecimiento_id BIGINT REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    docente_id BIGINT REFERENCES public.docentes(id) ON DELETE CASCADE,
    apoderado_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado TEXT NOT NULL DEFAULT 'reservado' CHECK (estado IN ('reservado', 'asistio', 'no-asistio', 'cancelado')),
    temas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Set up Row Level Security (RLS)
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow all for development, same as before)
DROP POLICY IF EXISTS "Allow public select" ON public.establecimientos;
CREATE POLICY "Allow public select" ON public.establecimientos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select" ON public.usuarios;
CREATE POLICY "Allow public select" ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select" ON public.docentes;
CREATE POLICY "Allow public select" ON public.docentes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select" ON public.disponibilidad;
CREATE POLICY "Allow public select" ON public.disponibilidad FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public select" ON public.reservas;
CREATE POLICY "Allow public select" ON public.reservas FOR SELECT USING (true);

-- Allow all operations for development (optional, adjust for production)
DROP POLICY IF EXISTS "Allow public all" ON public.usuarios;
CREATE POLICY "Allow public all" ON public.usuarios FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public all" ON public.docentes;
CREATE POLICY "Allow public all" ON public.docentes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public all" ON public.disponibilidad;
CREATE POLICY "Allow public all" ON public.disponibilidad FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public all" ON public.reservas;
CREATE POLICY "Allow public all" ON public.reservas FOR ALL USING (true);

-- Insert sample school
INSERT INTO public.establecimientos (id, nombre, direccion) VALUES (1, 'Colegio San José', 'Av. Principal 123') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.establecimientos (id, nombre, direccion) VALUES (2, 'Liceo Bicentenario', 'Calle Central 456') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.establecimientos (id, nombre, direccion) VALUES (3, 'Colegio Santa María', 'Calle Norte 789') ON CONFLICT (id) DO NOTHING;

-- (Repeat for INSERT, UPDATE, DELETE as needed)
