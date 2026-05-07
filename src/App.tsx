import React, { useState, useMemo, lazy, Suspense } from 'react';
import { 
  Calendar, 
  CalendarCheck, 
  Clock, 
  Users, 
  LogOut, 
  Menu, 
  Plus, 
  Search, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  FileText, 
  Eye, 
  Printer,
  ChevronRight,
  School
} from 'lucide-react';
import { useStorage } from './hooks/useStorage';
import { useRateLimitStatus } from './hooks/useRateLimitStatus';
import { RateLimitWarning } from './components/RateLimitWarning';
import { ThemeToggle } from './components/ThemeToggle';
import { cn } from './lib/utils';
import { sendInterviewCancellationEmail } from './lib/email';
import type { DB, Usuario, Reserva, Disponibilidad, Role } from './types';
import { SCHOOL_CONFIGS } from './lib/schoolConfigs';

// Lazy load heavy components
const AdvancedFilters = lazy(() => import('./components/AdvancedFilters'));

function App() {
  const { 
    db, 
    loading, 
    currentUser, 
    currentSchool,
    selectSchool,
    clearSchool,
    login, 
    logout, 
    register,
    updateReserva,
    addDisponibilidad,
    deleteDisponibilidad,
    addReserva,
    addDocente,
    deleteDocente,
    addApoderado
  } = useStorage();

  const schools = SCHOOL_CONFIGS;

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error' | 'info'}>({
    show: false,
    message: '',
    type: 'success'
  });
  const [temasEdit, setTemasEdit] = useState<{id: number, texto: string} | null>(null);
  const [authEmail, setAuthEmail] = useState('');

  // Monitorear rate limiting para login y registro
  const loginRateLimit = useRateLimitStatus(authEmail, 'login');
  const registerRateLimit = useRateLimitStatus(authEmail, 'register');

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const result = await login(email, password);
    if (result.usuario) {
      showToast('Bienvenido', 'success');
      setCurrentView('dashboard');
    } else {
      showToast(result.error || 'Credenciales incorrectas', 'error');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (db.usuarios.find(u => u.email === email)) {
      showToast('El correo ya está registrado', 'error');
      return;
    }

    try {
      await register({
        nombre: formData.get('nombre') as string,
        email: email,
        password: formData.get('password') as string,
        rol: 'apoderado',
        establecimiento_id: 0, // In dynamic mode, we don't need this as we are in the school's specific DB
      });

      showToast('Cuenta creada exitosamente', 'success');
      setCurrentView('dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al registrar usuario';
      showToast(errorMessage, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase tracking-widest text-xs">Cargando conexión...</p>
        </div>
      </div>
    );
  }

  // STEP 1: School Selection
  if (!currentSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        
        <div className="w-full max-w-2xl relative z-10">
          <div className="text-center mb-12 fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white dark:bg-blue-600 text-blue-700 dark:text-white mb-6 shadow-2xl shadow-blue-900/50">
              <CalendarCheck className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-white dark:text-white tracking-tighter mb-2 uppercase italic">SchoolCitas</h1>
            <p className="text-blue-200 dark:text-blue-300 font-bold uppercase tracking-[0.3em] text-[10px]">Portal de Gestión Multi-Colegio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 fade-in">
            {schools.map((school) => (
              <button
                key={school.id}
                onClick={() => selectSchool(school)}
                className="group bg-white/10 dark:bg-slate-800/50 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 p-6 rounded-[2.5rem] hover:bg-white/20 dark:hover:bg-slate-700/50 transition-all text-center flex flex-col items-center gap-4 hover:scale-105 active:scale-95 shadow-2xl"
              >
                <div className="w-20 h-20 rounded-3xl bg-white/10 dark:bg-slate-700 flex items-center justify-center text-white group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:scale-110 transition-all overflow-hidden">
                  {school.logo ? (
                    <img src={school.logo} alt={school.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-lg font-black uppercase tracking-[0.25em]">
                      {school.name.split(' ').map(word => word[0]).join('')}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-white dark:text-slate-100 font-black text-sm uppercase tracking-tight">{school.name}</h3>
                  <p className="text-blue-300 dark:text-blue-400 text-[9px] font-bold uppercase tracking-widest mt-1">Conectar ahora</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30 dark:text-slate-500 group-hover:text-white dark:group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>
          
          {schools.length === 0 && (
            <div className="text-center p-12 bg-white/5 dark:bg-slate-800/30 rounded-3xl border border-dashed border-white/10 dark:border-slate-700/30">
              <p className="text-blue-200 dark:text-blue-300 text-xs font-bold uppercase tracking-widest">No se encontraron colegios configurados en la base maestra</p>
            </div>
          )}
          
          <p className="text-center text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-12">
            Selecciona tu establecimiento para continuar
          </p>
        </div>
      </div>
    );
  }

  // STEP 2: Auth (Login/Register) for the selected school
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10 fade-in">
            <button 
              onClick={clearSchool}
              className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-all"
            >
              <ArrowRight className="w-3 h-3 rotate-180" />
              Cambiar Colegio: {currentSchool.name}
            </button>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">SchoolCitas</h1>
            <p className="text-blue-100 font-bold uppercase tracking-[0.3em] text-[10px]">{currentSchool.name}</p>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-10 fade-in shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/20 dark:border-slate-800/50 transition-colors">
            {authMode === 'login' ? (
              <>
                <h2 className="text-3xl font-black mb-8 text-slate-900 dark:text-white tracking-tight uppercase text-center italic">Acceso</h2>
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest ml-1">Correo electrónico</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                      <input 
                        type="email" 
                        name="email" 
                        required 
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={loginRateLimit.blocked}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-sm outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="usuario@ejemplo.com" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest ml-1">Contraseña</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                      <input 
                        type="password" 
                        name="password" 
                        required 
                        disabled={loginRateLimit.blocked}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-sm outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="••••••••" 
                      />
                    </div>
                  </div>

                  {loginRateLimit.blocked || loginRateLimit.totalAttempts > 0 && (
                    <RateLimitWarning
                      blocked={loginRateLimit.blocked}
                      remainingMinutes={loginRateLimit.remainingMinutes}
                      attemptCount={loginRateLimit.totalAttempts}
                      maxAttempts={loginRateLimit.maxAttempts}
                      type="login"
                    />
                  )}

                  <button 
                    type="submit" 
                    disabled={loginRateLimit.blocked}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/30 flex items-center justify-center gap-3 group active:scale-[0.98] uppercase tracking-widest text-xs mt-4"
                  >
                    Entrar al portal
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                </form>
                <div className="mt-10 text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">¿Nuevo en la plataforma? 
                    <button onClick={() => setAuthMode('register')} className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-black ml-2 underline decoration-2 underline-offset-4">Regístrate gratis</button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight uppercase text-center italic">Registro</h2>
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Nombre completo</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        type="text" 
                        name="nombre" 
                        required 
                        disabled={registerRateLimit.blocked}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 transition-all text-sm outline-none font-bold text-slate-900 placeholder:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="Tu nombre" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Correo electrónico</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        type="email" 
                        name="email" 
                        required 
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={registerRateLimit.blocked}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 transition-all text-sm outline-none font-bold text-slate-900 placeholder:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="email@ejemplo.com" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Contraseña</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        type="password" 
                        name="password" 
                        required 
                        minLength={6} 
                        disabled={registerRateLimit.blocked}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 transition-all text-sm outline-none font-bold text-slate-900 placeholder:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        placeholder="Mínimo 6 caracteres" 
                      />
                    </div>
                  </div>

                  {registerRateLimit.blocked || registerRateLimit.totalAttempts > 0 && (
                    <RateLimitWarning
                      blocked={registerRateLimit.blocked}
                      remainingMinutes={registerRateLimit.remainingMinutes}
                      attemptCount={registerRateLimit.totalAttempts}
                      maxAttempts={registerRateLimit.maxAttempts}
                      type="register"
                    />
                  )}

                  <button 
                    type="submit" 
                    disabled={registerRateLimit.blocked}
                    className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 group active:scale-[0.98] uppercase tracking-widest text-xs mt-4"
                  >
                    Crear mi cuenta
                    <UserPlus className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  </button>
                </form>
                <div className="mt-10 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">¿Ya eres parte? 
                    <button onClick={() => setAuthMode('login')} className="text-blue-700 hover:text-blue-900 font-black ml-2 underline decoration-2 underline-offset-4">Inicia sesión</button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <Toast {...toast} />
      </div>
    );
  }

  // STEP 3: Dashboard & Main App
  interface NavItem {
    id: string;
    label: string;
    icon: any;
    action?: () => void;
  }

  const navItems: Record<Role, NavItem[]> = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Calendar },
      { id: 'docentes', label: 'Docentes', icon: Users },
      { id: 'apoderados', label: 'Apoderados', icon: User },
      { id: 'reservas', label: 'Citas Globales', icon: CalendarCheck },
    ],
    docente: [
      { id: 'dashboard', label: 'Mis Citas', icon: Calendar },
      { id: 'disponibilidad', label: 'Horarios', icon: Clock },
      { id: 'mis-reservas', label: 'Historial', icon: FileText },
    ],
    apoderado: [
      { id: 'dashboard', label: 'Inicio', icon: Calendar },
      { id: 'buscar-docentes', label: 'Nueva Cita', icon: Search },
      { id: 'mis-citas', label: 'Mis Entrevistas', icon: CalendarCheck },
    ]
  };

  const handlePrint = (reservaId: number, autoPrint: boolean = true) => {
    const r = db.reservas.find(x => x.id === reservaId);
    if (!r) return;
    
    const docente = db.docentes.find(d => d.id === r.docente_id);
    const docenteUser = db.usuarios.find(u => u.id === docente?.usuario_id);
    const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Informe de Entrevista - ${currentSchool.name}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #334155; }
            .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .school-name { font-size: 24px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
            .doc-type { font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .item { background: #f8fafc; padding: 15px; border-radius: 8px; }
            .label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-size: 14px; font-weight: 600; color: #1e293b; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-left: 4px solid #1e3a8a; padding-left: 10px; margin-bottom: 15px; }
            .content { background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; line-height: 1.6; min-height: 100px; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; }
            .sign { width: 200px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; font-weight: 600; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="school-name">${currentSchool.name}</div>
              <div class="doc-type">Comprobante de Entrevista Académica</div>
            </div>
            <div style="text-align: right">
              <div class="label">Fecha de Emisión</div>
              <div class="value">${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="grid">
            <div class="item">
              <div class="label">Docente / Especialista</div>
              <div class="value">${docenteUser?.nombre || 'N/A'}</div>
              <div style="font-size: 11px; color: #64748b;">${docente?.especialidad || ''}</div>
            </div>
            <div class="item">
              <div class="label">Apoderado / Representante</div>
              <div class="value">${apoderado?.nombre || 'N/A'}</div>
              <div style="font-size: 11px; color: #64748b;">${apoderado?.email || ''}</div>
            </div>
            <div class="item">
              <div class="label">Fecha de la Cita</div>
              <div class="value">${r.fecha}</div>
            </div>
            <div class="item">
              <div class="label">Hora</div>
              <div class="value">${r.hora}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Temas Tratados y Acuerdos</div>
            <div class="content">${r.temas || '<i>No se registraron temas para esta sesión.</i>'}</div>
          </div>

          <div class="section">
            <div class="section-title">Estado de la Cita</div>
            <div class="value" style="text-transform: uppercase; color: ${r.estado === 'asistio' ? '#059669' : '#d97706'}">${r.estado}</div>
          </div>

          <div class="footer">
            <div class="sign">Firma del Docente</div>
            <div class="sign">Firma del Apoderado</div>
          </div>

          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Imprimir Documento</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    if (autoPrint) {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard db={db} currentUser={currentUser} showToast={showToast} onEditTemas={(id, texto) => setTemasEdit({id, texto})} onPrint={handlePrint} updateReserva={updateReserva} />;
      case 'docentes': return <Docentes db={db} addDocente={addDocente} deleteDocente={deleteDocente} showToast={showToast} currentUser={currentUser} />;
      case 'apoderados': return <Apoderados db={db} addApoderado={addApoderado} showToast={showToast} currentUser={currentUser} />;
      case 'disponibilidad': return <DisponibilidadView db={db} currentUser={currentUser} showToast={showToast} addDisponibilidad={addDisponibilidad} deleteDisponibilidad={deleteDisponibilidad} />;
      case 'reservas': return <Reservas db={db} currentUser={currentUser} showToast={showToast} onEditTemas={(id, texto) => setTemasEdit({id, texto})} onPrint={handlePrint} updateReserva={updateReserva} />;
      case 'mis-reservas': return <Reservas db={db} currentUser={currentUser} showToast={showToast} onEditTemas={(id, texto) => setTemasEdit({id, texto})} onPrint={handlePrint} filterDocente={db.docentes.find(d => d.usuario_id === currentUser.id)?.id} updateReserva={updateReserva} />;
      case 'buscar-docentes': return <BuscarDocentes db={db} currentUser={currentUser} showToast={showToast} setCurrentView={setCurrentView} addReserva={addReserva} />;
      case 'mis-citas': return <Reservas db={db} currentUser={currentUser} showToast={showToast} onEditTemas={(id, texto) => setTemasEdit({id, texto})} onPrint={handlePrint} filterApoderado={currentUser.id} updateReserva={updateReserva} />;
      default: return <Dashboard db={db} currentUser={currentUser} showToast={showToast} onEditTemas={(id, texto) => setTemasEdit({id, texto})} onPrint={handlePrint} updateReserva={updateReserva} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden text-slate-700 font-sans">
      <div className="fixed top-[-15%] left-[-15%] w-[70%] h-[70%] bg-blue-100/30 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-indigo-100/30 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-slate-900 shadow-2xl shadow-slate-900/20 transform transition-transform duration-300 z-40 md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight uppercase">SchoolCitas</h1>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{currentUser.rol}</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {navItems[currentUser.rol].map(item => (
              <button
                key={item.id}
                onClick={() => { 
                  setCurrentView(item.id); 
                  setIsSidebarOpen(false); 
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                  currentView === item.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 transition-transform", 
                  currentView === item.id ? "text-white" : "group-hover:text-white"
                )} />
                <span className="font-bold text-[11px] uppercase tracking-wider">{item.label}</span>
                {currentView === item.id && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/50" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-8 left-8 right-8 space-y-2">
          <button 
            onClick={clearSchool} 
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all group font-bold text-[11px] uppercase tracking-wider"
          >
            <School className="w-4 h-4" />
            <span>Cambiar Colegio</span>
          </button>
          <button 
            onClick={logout} 
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all group font-bold text-[11px] uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-30 md:hidden"></div>
      )}

      <main className="flex-1 md:ml-64 min-h-screen relative z-10">
        <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-20 transition-colors">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-400">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{currentView.replace('-', ' ')}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">{currentDate}</p>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{currentSchool.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <p className="font-bold text-slate-900 dark:text-white text-xs">{currentUser.nombre}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{currentUser.email}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-slate-200 dark:shadow-blue-900/50 transition-colors">
                {currentUser.nombre.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {renderContent()}
        </div>
      </main>

      {temasEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter">Temas de la Entrevista</h3>
              <button onClick={() => setTemasEdit(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-medium text-sm"
                placeholder="Escribe aquí los temas tratados, acuerdos y observaciones..."
                value={temasEdit.texto}
                onChange={(e) => setTemasEdit({...temasEdit, texto: e.target.value})}
              />
              <button 
                onClick={async () => {
                  const r = db.reservas.find(x => x.id === temasEdit.id);
                  if (r) {
                    const success = await updateReserva({ ...r, temas: temasEdit.texto });
                    if (success) {
                      showToast('Temas actualizados');
                      setTemasEdit(null);
                    }
                  }
                }}
                className="w-full mt-4 bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} />
    </div>
  );
}

// Components
function Dashboard({ db, currentUser, showToast, onEditTemas, onPrint, updateReserva }: { db: DB, currentUser: Usuario, showToast: (m: string, t?: any) => void, onEditTemas: (id: number, t: string) => void, onPrint: (id: number) => void, updateReserva: (r: Reserva) => Promise<boolean> }) {
  const isDocente = currentUser.rol === 'docente';
  const isApoderado = currentUser.rol === 'apoderado';
  const isAdmin = currentUser.rol === 'admin';

  const allActivities = db.reservas
    .filter(r => {
      if (isDocente) return db.docentes.find(d => d.usuario_id === currentUser.id)?.id === r.docente_id;
      if (isApoderado) return r.apoderado_id === currentUser.id;
      return true;
    });

  const activities = [...allActivities]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);

  const stats = [
    { label: 'Total Reservas', value: allActivities.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Docentes', value: db.docentes.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Próximas Citas', value: allActivities.filter(r => r.estado === 'reservado').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-effect rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
        <div className="p-6 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              {isDocente ? 'Mis próximas citas' : 'Próximas actividades'}
            </h3>
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Gestión en tiempo real</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalles</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-slate-400 text-center py-16 italic text-xs font-bold uppercase tracking-widest">No hay actividades recientes</td>
                </tr>
              ) : (
                activities.map(r => {
                  const docente = db.docentes.find(d => d.id === r.docente_id);
                  const docenteUser = db.usuarios.find(u => u.id === docente?.usuario_id);
                  const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);
                  
                  const otherName = isDocente 
                    ? apoderado?.nombre 
                    : (isAdmin ? `${docenteUser?.nombre} con ${apoderado?.nombre}` : docenteUser?.nombre);

                  return (
                    <tr key={r.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm tracking-tight">{otherName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[9px] text-blue-700 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {r.hora}
                              </p>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            {(!isApoderado || r.estado === 'asistio') && r.temas && (
                              <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[11px] text-slate-600 font-medium italic relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600"></div>
                                <span className="font-black text-blue-900 not-italic uppercase tracking-tighter mr-2 text-[9px]">Temas:</span>
                                {r.temas}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center justify-center min-w-[100px] border shadow-sm",
                          r.estado === 'reservado' && "bg-blue-50 text-blue-700 border-blue-200",
                          r.estado === 'asistio' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          r.estado === 'no-asistio' && "bg-amber-50 text-amber-700 border-amber-200",
                          r.estado === 'cancelado' && "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {r.estado.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {(r.estado === 'asistio' || r.estado === 'no-asistio') && (
                            <>
                              <button 
                                onClick={() => onPrint(r.id)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-slate-100 bg-white shadow-sm"
                                title="Ver documento"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {isDocente && (
                            <button 
                              onClick={() => onEditTemas(r.id, r.temas || '')}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-slate-100 bg-white shadow-sm"
                              title="Escribir temas"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {isDocente && r.estado === 'reservado' && (
                            <>
                              <button 
                                onClick={async () => {
                                  const success = await updateReserva({ ...r, estado: 'asistio' as const });
                                  if (success) showToast('Asistencia marcada');
                                }} 
                                className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-all border border-emerald-200 bg-white shadow-sm"
                                title="Asistió"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  const success = await updateReserva({ ...r, estado: 'no-asistio' as const });
                                  if (success) showToast('Inasistencia marcada');
                                }} 
                                className="p-2 text-amber-600 hover:text-white hover:bg-amber-600 rounded-lg transition-all border border-amber-200 bg-white shadow-sm"
                                title="No asistió"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {r.estado === 'reservado' && (
                            <button onClick={async () => {
                              if (!confirm('¿Seguro que desea cancelar esta reserva?')) return;
                              const success = await updateReserva({ ...r, estado: 'cancelado' as const });
                              if (success) {
                                showToast('Reserva cancelada');
                                const docente = db.docentes.find(d => d.id === r.docente_id);
                                const docenteUsuario = docente ? db.usuarios.find(u => u.id === docente.usuario_id) : null;
                                const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);
                                
                                if (apoderado && docenteUsuario) {
                                  try {
                                    await sendInterviewCancellationEmail(
                                      apoderado.email,
                                      apoderado.nombre,
                                      docenteUsuario.nombre,
                                      r.fecha,
                                      r.hora
                                    );
                                  } catch (err) {
                                    console.error('Error enviando correo de cancelación:', err);
                                  }
                                }
                              }
                            }} className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg border border-rose-100 bg-white shadow-sm" title="Cancelar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Docentes({ db, addDocente, deleteDocente, showToast, currentUser }: { db: DB, addDocente: (u: any, e: string) => Promise<boolean>, deleteDocente: (id: number) => Promise<boolean>, showToast: (m: string, t?: any) => void, currentUser: Usuario }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const nombre = formData.get('nombre') as string;
    const especialidad = formData.get('especialidad') as string;
    const password = 'provisional123';

    try {
      await addDocente({
        nombre,
        email,
        password,
        rol: 'docente',
        establecimiento_id: currentUser.establecimiento_id
      }, especialidad);
      showToast('Docente agregado exitosamente');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al agregar docente', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Gestión de Docentes</h2>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Cuerpo académico del establecimiento</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center gap-2 uppercase tracking-widest text-[10px]"
        >
          <Plus className="w-4 h-4" />
          Nuevo Docente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {db.docentes.map(d => {
          const user = db.usuarios.find(u => u.id === d.usuario_id);
          return (
            <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={async () => {
                    if (confirm('¿Eliminar a este docente y todos sus horarios?')) {
                      await deleteDocente(d.id);
                      showToast('Docente eliminado');
                    }
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
                  {user?.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight">{user?.nombre}</h4>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{d.especialidad}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10">
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Registrar Docente</h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input type="text" name="nombre" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input type="email" name="email" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Especialidad / Asignatura</label>
                <input type="text" name="especialidad" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" placeholder="Ej: Matemáticas, Psicopedagogía" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                <button type="submit" className="flex-[2] bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">Guardar Docente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DisponibilidadView({ db, currentUser, showToast, addDisponibilidad, deleteDisponibilidad }: { db: DB, currentUser: Usuario, showToast: (m: string, t?: any) => void, addDisponibilidad: (d: Disponibilidad[]) => Promise<boolean>, deleteDisponibilidad: (id: number) => Promise<boolean> }) {
  const docente = db.docentes.find(d => d.usuario_id === currentUser.id);
  if (!docente) return <div>Error: No eres un docente registrado.</div>;

  const currentDisp = db.disponibilidad.filter(d => d.docente_id === docente.id);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const h1 = formData.get('hora_inicio') as string;
    const h2 = formData.get('hora_fin') as string;
    const repeat = formData.get('repeat') === 'on';
    const weeks = parseInt(formData.get('weeks') as string) || 1;

    const fecha = formData.get('fecha') as string;
    const today = new Date().toISOString().split('T')[0];
    if (fecha < today) {
      showToast('No se puede agregar disponibilidad en fechas pasadas', 'error');
      return;
    }

    const newEntries: Disponibilidad[] = [];
    const recurringBaseId = Date.now();
    let recurringIndex = 0;

    if (repeat) {
      const startDate = new Date((formData.get('fecha') as string) + 'T00:00:00');
      for (let i = 0; i < weeks; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (i * 7));
        
        // Validation: No duplicates for the same day/time
        const isDuplicate = currentDisp.some(ex => 
          ex.fecha === d.toISOString().split('T')[0] && 
          ex.hora_inicio === h1
        );

        if (!isDuplicate) {
          newEntries.push({
            id: recurringBaseId + recurringIndex,
            establecimiento_id: currentUser.establecimiento_id,
            docente_id: docente.id,
            fecha: d.toISOString().split('T')[0],
            hora_inicio: h1,
            hora_fin: h2
          });
          recurringIndex++;
        }
      }
    } else {
      const fecha = formData.get('fecha') as string;
      newEntries.push({
        id: Date.now(),
        establecimiento_id: currentUser.establecimiento_id,
        docente_id: docente.id,
        fecha,
        hora_inicio: h1,
        hora_fin: h2
      });
    }

    if (newEntries.length === 0) {
      showToast('No se agregaron horarios (posibles duplicados)', 'error');
      return;
    }

    try {
      await addDisponibilidad(newEntries);
      showToast(`${newEntries.length} horario(s) agregado(s)`);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar horarios', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
      <div className="lg:col-span-1">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-24">
          <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Definir Horario</h3>
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Fecha de Inicio</label>
              <input type="date" name="fecha" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Inicio</label>
                <input type="time" name="hora_inicio" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Término</label>
                <input type="time" name="hora_fin" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl space-y-4 border border-blue-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="repeat" className="w-5 h-5 rounded-lg border-2 border-blue-200 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest group-hover:text-blue-700 transition-colors">Repetir semanalmente</span>
              </label>
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Número de semanas</label>
                <input type="number" name="weeks" min="1" max="12" defaultValue="1" className="w-full px-4 py-2 bg-white border-2 border-transparent focus:border-blue-600 rounded-xl outline-none transition-all font-bold text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">Publicar Disponibilidad</button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Mi Agenda Pública</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Horarios visibles para los apoderados</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Día y Fecha</th>
                  <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Rango Horario</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentDisp.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-16 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No has definido horarios aún</td>
                  </tr>
                ) : (
                  currentDisp
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <p className="font-black text-slate-900 text-sm tracking-tight">
                            {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {d.hora_inicio} - {d.hora_fin}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={async () => {
                              if (confirm('¿Eliminar este bloque horario?')) {
                                await deleteDisponibilidad(d.id);
                                showToast('Horario eliminado');
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Reservas({ db, currentUser, showToast, onEditTemas, onPrint, filterDocente, filterApoderado, updateReserva }: { db: DB, currentUser: Usuario, showToast: (m: string, t?: any) => void, onEditTemas: (id: number, t: string) => void, onPrint: (id: number) => void, filterDocente?: number, filterApoderado?: number, updateReserva: (r: Reserva) => Promise<boolean> }) {
  const isDocente = currentUser.rol === 'docente';
  const isAdmin = currentUser.rol === 'admin';

  // Estado para filtros avanzados
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDocente, setSelectedDocente] = useState<number | ''>('');
  const [selectedEstado, setSelectedEstado] = useState('');

  // Filtrado avanzado con memoización
  const filteredActivities = useMemo(() => {
    let filtered = db.reservas.filter(r => {
      // Filtros básicos por rol
      if (filterDocente) return r.docente_id === filterDocente;
      if (filterApoderado) return r.apoderado_id === filterApoderado;
      return true;
    });

    // Filtro de búsqueda en tiempo real
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const docente = db.docentes.find(d => d.id === r.docente_id);
        const docenteUser = db.usuarios.find(u => u.id === docente?.usuario_id);
        const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);

        const searchableText = [
          docenteUser?.nombre || '',
          docente?.especialidad || '',
          apoderado?.nombre || '',
          r.temas || '',
          r.estado
        ].join(' ').toLowerCase();

        return searchableText.includes(searchLower);
      });
    }

    // Filtro por rango de fechas
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.fecha) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.fecha) <= new Date(dateTo));
    }

    // Filtro por docente específico
    if (selectedDocente) {
      filtered = filtered.filter(r => r.docente_id === selectedDocente);
    }

    // Filtro por estado
    if (selectedEstado) {
      filtered = filtered.filter(r => r.estado === selectedEstado);
    }

    // Ordenar por fecha descendente
    return filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [db.reservas, db.docentes, db.usuarios, filterDocente, filterApoderado, searchTerm, dateFrom, dateTo, selectedDocente, selectedEstado]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedDocente('');
    setSelectedEstado('');
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Historial de Entrevistas</h2>
        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Registro completo de actividades</p>
      </div>

      <Suspense fallback={<div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center"><div className="text-slate-400">Cargando filtros...</div></div>}>
        <AdvancedFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          selectedDocente={selectedDocente}
          onDocenteChange={setSelectedDocente}
          selectedEstado={selectedEstado}
          onEstadoChange={setSelectedEstado}
          onClearFilters={clearFilters}
          docentes={db.docentes}
          usuarios={db.usuarios}
          totalResults={filteredActivities.length}
        />
      </Suspense>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Participantes</th>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No se encontraron registros</td>
                </tr>
              ) : (
                filteredActivities.map(r => {
                  const docente = db.docentes.find(d => d.id === r.docente_id);
                  const docenteUser = db.usuarios.find(u => u.id === docente?.usuario_id);
                  const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-black text-slate-900 tracking-tight">
                            {isDocente ? apoderado?.nombre : docenteUser?.nombre}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {isDocente ? 'Apoderado' : docente?.especialidad}
                          </p>
                          {isAdmin && (
                            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-1">
                              Con: {apoderado?.nombre}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-bold text-slate-700">
                            {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {r.hora}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center justify-center min-w-[100px] border shadow-sm",
                          r.estado === 'reservado' && "bg-blue-50 text-blue-700 border-blue-200",
                          r.estado === 'asistio' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          r.estado === 'no-asistio' && "bg-amber-50 text-amber-700 border-amber-200",
                          r.estado === 'cancelado' && "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {r.estado.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => onPrint(r.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-slate-100 bg-white"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isDocente && (
                            <button 
                              onClick={() => onEditTemas(r.id, r.temas || '')}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-slate-100 bg-white"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {r.estado === 'reservado' && (
                            <button onClick={async () => {
                              if (!confirm('¿Cancelar cita?')) return;
                              const success = await updateReserva({...r, estado: 'cancelado' as const});
                              if (success) {
                                showToast('Cita cancelada');
                                const docente = db.docentes.find(d => d.id === r.docente_id);
                                const docenteUsuario = docente ? db.usuarios.find(u => u.id === docente.usuario_id) : null;
                                const apoderado = db.usuarios.find(u => u.id === r.apoderado_id);
                                
                                if (apoderado && docenteUsuario) {
                                  try {
                                    await sendInterviewCancellationEmail(
                                      apoderado.email,
                                      apoderado.nombre,
                                      docenteUsuario.nombre,
                                      r.fecha,
                                      r.hora
                                    );
                                  } catch (err) {
                                    console.error('Error enviando correo de cancelación:', err);
                                  }
                                }
                              }
                            }} className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all border border-rose-100 bg-white">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BuscarDocentes({ db, currentUser, showToast, setCurrentView, addReserva }: { db: DB, currentUser: Usuario, showToast: (m: string, t?: any) => void, setCurrentView: (v: string) => void, addReserva: (r: Omit<Reserva, 'id' | 'created_at' | 'estado' | 'establecimiento_id'>) => Promise<boolean> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);

  const filteredDocentes = db.docentes.filter(d => {
    const user = db.usuarios.find(u => u.id === d.usuario_id);
    return user?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
           d.especialidad.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleReserve = async (disp: Disponibilidad) => {
    const today = new Date().toISOString().split('T')[0];
    if (disp.fecha < today) {
      showToast('No se puede agendar una cita en una fecha pasada', 'error');
      return;
    }

    try {
      const success = await addReserva({
        docente_id: disp.docente_id,
        apoderado_id: currentUser.id,
        fecha: disp.fecha,
        hora: disp.hora_inicio,
      });

      if (success) {
        showToast('¡Entrevista agendada con éxito!');
        setSelectedDocente(null);
        setCurrentView('mis-citas');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al agendar cita', 'error');
    }
  };

  const selectedDocenteData = db.docentes.find(d => d.id === selectedDocente);
  const selectedDocenteUser = selectedDocenteData ? db.usuarios.find(u => u.id === selectedDocenteData.usuario_id) : null;
  const today = new Date().toISOString().split('T')[0];
  const docenteHorarios = db.disponibilidad
    .filter(disp => disp.docente_id === selectedDocente && disp.fecha >= today)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <div className="space-y-8 fade-in">
      <div className="bg-blue-700 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Search className="w-32 h-32" />
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter italic">Nueva Entrevista</h2>
          <p className="text-blue-100 font-medium mb-8 leading-relaxed">Encuentra al docente o especialista y agenda una reunión en los horarios disponibles.</p>
          <div className="relative">
            <Search className="absolute left-4 top-4 w-6 h-6 text-blue-300" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o especialidad..." 
              className="w-full pl-14 pr-6 py-5 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-2xl outline-none focus:bg-white focus:text-slate-900 focus:border-white transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Docentes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocentes.map(d => {
            const user = db.usuarios.find(u => u.id === d.usuario_id);
            return (
              <button 
                key={d.id} 
                onClick={() => setSelectedDocente(d.id)}
                className="w-full text-left p-6 bg-white rounded-[2.5rem] border border-slate-100 transition-all flex items-center justify-between group hover:border-blue-200 hover:shadow-xl hover:scale-[1.02] active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    {user?.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight">{user?.nombre}</h4>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      {d.especialidad}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Horarios */}
      {selectedDocente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-200">
                  {selectedDocenteUser?.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">{selectedDocenteUser?.nombre}</h3>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Agenda de Disponibilidad</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDocente(null)} 
                className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              >
                <XCircle className="w-8 h-8" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {docenteHorarios.length > 0 ? (
                docenteHorarios.map(disp => {
                  const isReserved = db.reservas.some(r => 
                    r.docente_id === disp.docente_id && 
                    r.fecha === disp.fecha && 
                    r.hora === disp.hora_inicio && 
                    r.estado === 'reservado'
                  );

                  return (
                    <div key={disp.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all group shadow-sm hover:shadow-md">
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                          {new Date(disp.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3" />
                          {disp.hora_inicio} - {disp.hora_fin}
                        </p>
                      </div>
                      {isReserved ? (
                        <span className="px-5 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100">Ocupado</span>
                      ) : (
                        <button 
                          onClick={() => handleReserve(disp)}
                          className="px-7 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95 group-hover:scale-105"
                        >
                          Agendar Cita
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6">
                    <Clock className="w-10 h-10" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Este docente no tiene horarios disponibles</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Selecciona un bloque horario para confirmar la entrevista</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Apoderados({ db, addApoderado, showToast, currentUser }: { db: DB, addApoderado: (u: any) => Promise<boolean>, showToast: (m: string, t?: any) => void, currentUser: Usuario }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const nombre = formData.get('nombre') as string;
    const password = 'provisional123';

    try {
      await addApoderado({
        nombre,
        email,
        password,
        rol: 'apoderado',
        establecimiento_id: currentUser.establecimiento_id
      });
      showToast('Apoderado agregado exitosamente');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al agregar apoderado', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Gestión de Apoderados</h2>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Usuarios registrados en el sistema</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center gap-2 uppercase tracking-widest text-[10px]"
        >
          <Plus className="w-4 h-4" />
          Nuevo Apoderado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {db.usuarios.filter(u => u.rol === 'apoderado').map(apoderado => (
          <div key={apoderado.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
                {apoderado.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-black text-slate-900 tracking-tight">{apoderado.nombre}</h4>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{apoderado.email}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10">
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic">Registrar Apoderado</h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input type="text" name="nombre" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input type="email" name="email" required className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-2xl outline-none transition-all font-bold text-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancelar</button>
                <button type="submit" className="flex-[2] bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-xs">Guardar Apoderado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ show, message, type }: { show: boolean, message: string, type: 'success' | 'error' | 'info' }) {
  if (!show) return null;
  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 fade-in border animate-bounce",
      type === 'success' && "bg-emerald-600 text-white border-emerald-500",
      type === 'error' && "bg-rose-600 text-white border-rose-500",
      type === 'info' && "bg-blue-600 text-white border-blue-500"
    )}>
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <XCircle className="w-5 h-5" />}
      <span className="text-[11px] font-black uppercase tracking-widest">{message}</span>
    </div>
  );
}

export default App;
