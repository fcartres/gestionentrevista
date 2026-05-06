import { useState, useEffect } from 'react';
import type { DB, Usuario, Reserva, Disponibilidad } from '../types';
import { supabase } from '../lib/supabase';
import { sendInterviewConfirmationEmail } from '../lib/email';
import type { SchoolConfig } from '../lib/schoolConfigs';

export function useStorage() {
  const [currentSchool, setCurrentSchool] = useState<SchoolConfig | null>(() => {
    const saved = localStorage.getItem('currentSchool');
    return saved ? JSON.parse(saved) : null;
  });

  const [db, setDb] = useState<DB>({
    establecimientos: [],
    usuarios: [],
    docentes: [],
    disponibilidad: [],
    reservas: []
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const selectSchool = (config: SchoolConfig) => {
    setCurrentSchool(config);
    localStorage.setItem('currentSchool', JSON.stringify(config));
    setDb({ establecimientos: [], usuarios: [], docentes: [], disponibilidad: [], reservas: [] });
    setCurrentUser(null);
  };

  const clearSchool = () => {
    setCurrentSchool(null);
    localStorage.removeItem('currentSchool');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  // FETCH DATA FILTERED BY SCHOOL ID
  const fetchData = async () => {
    if (!currentSchool) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const schoolId = currentSchool.id;

      const [
        { data: establecimientos },
        { data: usuarios },
        { data: docentes },
        { data: disponibilidad },
        { data: reservas }
      ] = await Promise.all([
        supabase.from('establecimientos').select('*').eq('id', schoolId),
        supabase.from('usuarios').select('*').eq('establecimiento_id', schoolId),
        supabase.from('docentes').select('*').eq('establecimiento_id', schoolId),
        supabase.from('disponibilidad').select('*').eq('establecimiento_id', schoolId),
        supabase.from('reservas').select('*').eq('establecimiento_id', schoolId)
      ]);

      setDb({
        establecimientos: establecimientos || [],
        usuarios: usuarios || [],
        docentes: docentes || [],
        disponibilidad: disponibilidad || [],
        reservas: reservas || []
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentSchool]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<Usuario | null> => {
    if (!currentSchool) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('establecimiento_id', currentSchool.id) // IMPORTANT: User must belong to the selected school
      .maybeSingle();

    if (data && !error) {
      setCurrentUser(data);
      return data;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const register = async (newUser: Omit<Usuario, 'id' | 'created_at'>, especialidad?: string) => {
    if (!currentSchool) throw new Error('No se ha seleccionado un colegio');

    const normalizedEmail = newUser.email.trim().toLowerCase();
    
    // Ensure email is unique across the whole DB or at least within the school
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      throw new Error('El correo ya existe.');
    }

    const userToInsert = {
      ...newUser,
      email: normalizedEmail,
      establecimiento_id: currentSchool.id, // Set the selected school ID
      id: Date.now(),
      created_at: new Date().toISOString()
    };

    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .insert([userToInsert])
      .select()
      .single();

    if (userError) throw userError;

    if (user.rol === 'docente') {
      await supabase.from('docentes').insert([{
        id: Date.now(),
        establecimiento_id: currentSchool.id,
        usuario_id: user.id,
        especialidad: especialidad || 'Sin especialidad'
      }]);
    }

    await fetchData();
    setCurrentUser(user);
    return user;
  };

  const updateReserva = async (reserva: Reserva) => {
    try {
      console.log('Actualizando reserva:', reserva.id, 'a estado:', reserva.estado);
      
      // Actualizar localmente primero para feedback instantáneo
      setDb(prev => ({
        ...prev,
        reservas: prev.reservas.map(r => r.id === reserva.id ? { ...r, estado: reserva.estado, temas: reserva.temas } : r)
      }));
      
      // Sincronizar con Supabase
      const { error } = await supabase
        .from('reservas')
        .update({
          estado: reserva.estado,
          temas: reserva.temas
        })
        .eq('id', reserva.id);
      
      if (error) {
        console.error('Error actualizar:', error);
        // Revertir el cambio local si falla
        await fetchData();
        return false;
      }
      
      console.log('Reserva actualizada exitosamente');
      return true;
    } catch (err) {
      console.error('Exception en updateReserva:', err);
      return false;
    }
  };

  const addDisponibilidad = async (disp: Disponibilidad[]) => {
    const { error } = await supabase.from('disponibilidad').insert(disp);
    if (error) throw error;
    await fetchData();
    return true;
  };

  const deleteDisponibilidad = async (id: number) => {
    const { error } = await supabase.from('disponibilidad').delete().eq('id', id);
    if (!error) await fetchData();
    return !error;
  };

  const addReserva = async (reserva: Omit<Reserva, 'id' | 'created_at' | 'estado' | 'establecimiento_id'>) => {
    if (!currentUser || !currentSchool) return false;
    const newReserva = {
      ...reserva,
      establecimiento_id: currentSchool.id,
      id: Date.now(),
      estado: 'reservado',
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('reservas').insert([newReserva]);
    if (!error) {
      await fetchData();

      const docente = db.docentes.find(d => d.id === reserva.docente_id);
      const docenteUsuario = docente ? db.usuarios.find(u => u.id === docente.usuario_id) : null;
      const docenteNombre = docenteUsuario?.nombre || 'Docente';

      try {
        await sendInterviewConfirmationEmail(
          currentUser.email,
          currentUser.nombre,
          docenteNombre,
          reserva.fecha,
          reserva.hora
        );
      } catch (emailError) {
        console.error('Error enviando correo de confirmación:', emailError);
      }
    }
    return !error;
  };

  const addDocente = async (user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>, especialidad: string) => {
    if (!currentSchool) return false;
    
    const normalizedEmail = user.email.trim().toLowerCase();
    const userToInsert = {
      ...user,
      email: normalizedEmail,
      establecimiento_id: currentSchool.id,
      id: Date.now(),
      rol: 'docente' as const,
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: userError } = await supabase
      .from('usuarios')
      .insert([userToInsert])
      .select()
      .single();

    if (userError) throw userError;

    const { error: docenteError } = await supabase.from('docentes').insert([{
      id: Date.now(),
      establecimiento_id: currentSchool.id,
      usuario_id: newUser.id,
      especialidad
    }]);

    if (docenteError) throw docenteError;
    await fetchData();
    return true;
  };

  const deleteDocente = async (docenteId: number) => {
    const docente = db.docentes.find(d => d.id === docenteId);
    if (!docente) return false;

    await supabase.from('disponibilidad').delete().eq('docente_id', docenteId);
    await supabase.from('docentes').delete().eq('id', docenteId);
    await supabase.from('usuarios').delete().eq('id', docente.usuario_id);

    await fetchData();
    return true;
  };

  const addApoderado = async (user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>) => {
    if (!currentSchool) return false;
    
    const normalizedEmail = user.email.trim().toLowerCase();
    const userToInsert = {
      ...user,
      email: normalizedEmail,
      establecimiento_id: currentSchool.id,
      id: Date.now(),
      rol: 'apoderado' as const,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('usuarios')
      .insert([userToInsert]);

    if (error) throw error;
    await fetchData();
    return true;
  };

  return {
    db,
    loading,
    currentUser,
    currentSchool,
    selectSchool,
    clearSchool,
    login,
    logout,
    register,
    setCurrentUser,
    updateReserva,
    addDisponibilidad,
    deleteDisponibilidad,
    addReserva,
    addDocente,
    deleteDocente,
    addApoderado,
    fetchData
  };
}
