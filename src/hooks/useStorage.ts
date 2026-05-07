import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DB, Usuario, Reserva, Disponibilidad } from '../types';
import { supabase } from '../lib/supabase';
import { sendInterviewConfirmationEmail } from '../lib/email';
import type { SchoolConfig } from '../lib/schoolConfigs';
import { loginLimiter, registerLimiter, getRateLimitErrorMessage } from '../lib/rateLimiter';

export function useStorage() {
  const [currentSchool, setCurrentSchool] = useState<SchoolConfig | null>(() => {
    const saved = localStorage.getItem('currentSchool');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const queryClient = useQueryClient();

  const selectSchool = (config: SchoolConfig) => {
    setCurrentSchool(config);
    localStorage.setItem('currentSchool', JSON.stringify(config));
    setCurrentUser(null);
    queryClient.invalidateQueries({ queryKey: ['db', config.id] });
  };

  const clearSchool = () => {
    setCurrentSchool(null);
    localStorage.removeItem('currentSchool');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    queryClient.clear();
  };

  // Query for fetching all data
  const { data: db = {
    establecimientos: [],
    usuarios: [],
    docentes: [],
    disponibilidad: [],
    reservas: []
  }, isLoading: loading, error } = useQuery({
    queryKey: ['db', currentSchool?.id],
    queryFn: async (): Promise<DB> => {
      if (!currentSchool) {
        return {
          establecimientos: [],
          usuarios: [],
          docentes: [],
          disponibilidad: [],
          reservas: []
        };
      }

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

      return {
        establecimientos: establecimientos || [],
        usuarios: usuarios || [],
        docentes: docentes || [],
        disponibilidad: disponibilidad || [],
        reservas: reservas || []
      };
    },
    enabled: !!currentSchool,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<{ usuario: Usuario | null; error?: string }> => {
    if (!currentSchool) return { usuario: null, error: 'Colegio no seleccionado' };

    const normalizedEmail = email.trim().toLowerCase();

    // Verificar si está bloqueado por rate limiting
    const { blocked, remainingMinutes } = loginLimiter.getStatus(normalizedEmail);
    if (blocked) {
      const errorMsg = getRateLimitErrorMessage('login', remainingMinutes, 0);
      return { usuario: null, error: errorMsg };
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('password', password)
      .eq('establecimiento_id', currentSchool.id)
      .maybeSingle();

    if (data && !error) {
      // Login exitoso - limpiar contador
      loginLimiter.recordSuccessfulAttempt(normalizedEmail);
      setCurrentUser(data);
      return { usuario: data };
    }

    // Login fallido - registrar intento
    const { remainingMs, attemptsRemaining } = loginLimiter.recordFailedAttempt(normalizedEmail);
    const remainingMins = Math.ceil(remainingMs / 60000);
    const errorMsg = getRateLimitErrorMessage('login', remainingMins, attemptsRemaining);
    
    return { usuario: null, error: errorMsg };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const registerMutation = useMutation({
    mutationFn: async ({ newUser, especialidad }: { newUser: Omit<Usuario, 'id' | 'created_at'>, especialidad?: string }) => {
      if (!currentSchool) throw new Error('No se ha seleccionado un colegio');

      const normalizedEmail = newUser.email.trim().toLowerCase();

      // Verificar si está bloqueado por rate limiting
      const { blocked, remainingMinutes } = registerLimiter.getStatus(normalizedEmail);
      if (blocked) {
        throw new Error(getRateLimitErrorMessage('register', remainingMinutes, 0));
      }

      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        // Registrar intento fallido
        registerLimiter.recordFailedAttempt(normalizedEmail);
        throw new Error('El correo ya existe.');
      }

      const userToInsert = {
        ...newUser,
        email: normalizedEmail,
        establecimiento_id: currentSchool.id,
        id: Date.now(),
        created_at: new Date().toISOString()
      };

      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .insert([userToInsert])
        .select()
        .single();

      if (userError) {
        // Registrar intento fallido
        registerLimiter.recordFailedAttempt(normalizedEmail);
        throw userError;
      }

      // Registro exitoso - limpiar contador
      registerLimiter.recordSuccessfulAttempt(normalizedEmail);

      if (user.rol === 'docente') {
        await supabase.from('docentes').insert([{
          id: Date.now(),
          establecimiento_id: currentSchool.id,
          usuario_id: user.id,
          especialidad: especialidad || 'Sin especialidad'
        }]);
      }

      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const register = async (newUser: Omit<Usuario, 'id' | 'created_at'>, especialidad?: string) => {
    return registerMutation.mutateAsync({ newUser, especialidad });
  };

  const updateReservaMutation = useMutation({
    mutationFn: async (reserva: Reserva) => {
      const { error } = await supabase
        .from('reservas')
        .update({
          estado: reserva.estado,
          temas: reserva.temas
        })
        .eq('id', reserva.id);

      if (error) throw error;
      return reserva;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const updateReserva = async (reserva: Reserva) => {
    try {
      await updateReservaMutation.mutateAsync(reserva);
      return true;
    } catch (err) {
      console.error('Error updating reserva:', err);
      return false;
    }
  };

  const addDisponibilidadMutation = useMutation({
    mutationFn: async (disp: Disponibilidad[]) => {
      const { error } = await supabase.from('disponibilidad').insert(disp);
      if (error) throw error;
      return disp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const addDisponibilidad = async (disp: Disponibilidad[]) => {
    try {
      await addDisponibilidadMutation.mutateAsync(disp);
      return true;
    } catch (err) {
      console.error('Error adding disponibilidad:', err);
      return false;
    }
  };

  const deleteDisponibilidadMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('disponibilidad').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const deleteDisponibilidad = async (id: number) => {
    try {
      await deleteDisponibilidadMutation.mutateAsync(id);
      return true;
    } catch (err) {
      console.error('Error deleting disponibilidad:', err);
      return false;
    }
  };

  const addReservaMutation = useMutation({
    mutationFn: async (reserva: Omit<Reserva, 'id' | 'created_at' | 'estado' | 'establecimiento_id'>) => {
      if (!currentUser || !currentSchool) throw new Error('Usuario o colegio no seleccionado');

      const newReserva = {
        ...reserva,
        establecimiento_id: currentSchool.id,
        id: Date.now(),
        estado: 'reservado' as const,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('reservas').insert([newReserva]);
      if (error) throw error;

      return newReserva;
    },
    onSuccess: (newReserva) => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });

      // Send confirmation email
      const docente = db.docentes.find(d => d.id === newReserva.docente_id);
      const docenteUsuario = docente ? db.usuarios.find(u => u.id === docente.usuario_id) : null;
      const docenteNombre = docenteUsuario?.nombre || 'Docente';

      sendInterviewConfirmationEmail(
        currentUser!.email,
        currentUser!.nombre,
        docenteNombre,
        newReserva.fecha,
        newReserva.hora
      ).catch(emailError => console.error('Error enviando correo:', emailError));
    }
  });

  const addReserva = async (reserva: Omit<Reserva, 'id' | 'created_at' | 'estado' | 'establecimiento_id'>) => {
    try {
      await addReservaMutation.mutateAsync(reserva);
      return true;
    } catch (err) {
      console.error('Error adding reserva:', err);
      return false;
    }
  };

  const addDocenteMutation = useMutation({
    mutationFn: async ({ user, especialidad }: { user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>, especialidad: string }) => {
      if (!currentSchool) throw new Error('No se ha seleccionado un colegio');

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
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const addDocente = async (user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>, especialidad: string) => {
    try {
      await addDocenteMutation.mutateAsync({ user, especialidad });
      return true;
    } catch (err) {
      console.error('Error adding docente:', err);
      return false;
    }
  };

  const deleteDocenteMutation = useMutation({
    mutationFn: async (docenteId: number) => {
      const docente = db.docentes.find(d => d.id === docenteId);
      if (!docente) throw new Error('Docente no encontrado');

      await supabase.from('disponibilidad').delete().eq('docente_id', docenteId);
      await supabase.from('docentes').delete().eq('id', docenteId);
      await supabase.from('usuarios').delete().eq('id', docente.usuario_id);

      return docenteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const deleteDocente = async (docenteId: number) => {
    try {
      await deleteDocenteMutation.mutateAsync(docenteId);
      return true;
    } catch (err) {
      console.error('Error deleting docente:', err);
      return false;
    }
  };

  const addApoderadoMutation = useMutation({
    mutationFn: async (user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>) => {
      if (!currentSchool) throw new Error('No se ha seleccionado un colegio');

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
      return userToInsert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db', currentSchool?.id] });
    }
  });

  const addApoderado = async (user: Omit<Usuario, 'id' | 'created_at' | 'establecimiento_id'>) => {
    try {
      await addApoderadoMutation.mutateAsync(user);
      return true;
    } catch (err) {
      console.error('Error adding apoderado:', err);
      return false;
    }
  };

  return {
    db,
    loading,
    error,
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
    addApoderado
  };
}