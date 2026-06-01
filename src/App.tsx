/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  MessageSquare, 
  HelpCircle, 
  Settings, 
  Wrench, 
  Tag, 
  Video, 
  Bell, 
  ChevronRight, 
  DollarSign, 
  LogOut, 
  User, 
  Lock, 
  Key, 
  Mail, 
  Sparkles, 
  Check, 
  UserPlus, 
  ShieldAlert, 
  Calendar, 
  ArrowUpRight, 
  Layers, 
  Info,
  Clock,
  Flame,
  Award,
  BookMarked,
  Download,
  Shield,
  Copy,
  Pin
} from 'lucide-react';

import { 
  UserRole, 
  UserProfile, 
  Meeting, 
  Notice, 
  TradingTool, 
  DiscountRef, 
  HallOfFameEntry, 
  StrategyFeatured, 
  StrategyHistorical, 
  AppNotification,
  ResourceTopic,
  ToolTopic
} from './types';
import { DataAPI } from './lib/db';
import { isFirebaseConfigured } from './firebase';

import CalculadoraLotes from './components/CalculadoraLotes';
import CalculadoraApalancamiento from './components/CalculadoraApalancamiento';
import ControlPanel from './components/ControlPanel';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import RecursosBoard from './components/RecursosBoard';
import HerramientasBoard from './components/HerramientasBoard';

export const getUserSeniority = (userProfile: any): number => {
  if (!userProfile) return 0;
  if (userProfile.manualForceUnlock) return 999; // bypass all locks
  if (userProfile.blockUnlocks) return 0; // standard lock seniority
  if (userProfile.manualSeniorityMonths !== undefined && userProfile.manualSeniorityMonths !== null) {
    return Number(userProfile.manualSeniorityMonths);
  }
  const dateStr = userProfile.memberJoinedAt || userProfile.joinedAt;
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const end = new Date();
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const total = years * 12 + months;
  return total < 0 ? 0 : total;
};

export default function App() {
  // Authentication states
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | 'recovery'>('login');
  const [loading, setLoading] = useState(true);

  // Authentication Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Active section view matching layout requirements
  // pupil_panel, pupil_chat, pupil_resources, pupil_tools, pupil_discounts, pupil_meetings, pupil_notices
  // community_checkout, community_chat, community_meetings, community_hof, community_featured, community_library
  // admin_view
  const [activeView, setActiveView] = useState<string>('pupil_panel');

  // In-app user profile configuration states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileAvatarInput, setProfileAvatarInput] = useState('');

  // Core business database rows
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tools, setTools] = useState<TradingTool[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRef[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [featuredStrategies, setFeaturedStrategies] = useState<StrategyFeatured[]>([]);
  const [historicalStrategies, setHistoricalStrategies] = useState<StrategyHistorical[]>([]);
  const [resourceTopics, setResourceTopics] = useState<ResourceTopic[]>([]);
  const [toolTopics, setToolTopics] = useState<ToolTopic[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Simulated Seniority tenure (months registered with Titan)
  const [simulatedMonths, setSimulatedMonths] = useState<number>(0);

  // Discount / Theme States matching discord layout
  const [activeDiscountTopic, setActiveDiscountTopic] = useState<string>('apex');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Hook to subscribe to auth
  useEffect(() => {
    setLoading(true);
    const unsub = DataAPI.currentUserListener((profile) => {
      setUser(profile);
      setLoading(false);
      // If user logs in we set active view to default panel
      if (profile) {
        setSimulatedMonths(getUserSeniority(profile));
        if (profile.role === 'administrador') {
          setActiveView('admin_view');
        } else {
          setActiveView('pupil_panel');
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Hook to fetch global collections
  const loadGlobalCollections = async () => {
    if (!user) return;
    try {
      const [m, n, t, d, h, f, hi, r, tt] = await Promise.all([
        DataAPI.getMeetings(),
        DataAPI.getNotices(),
        DataAPI.getTools(),
        DataAPI.getDiscounts(),
        DataAPI.getHallOfFame(),
        DataAPI.getStrategiesFeatured(),
        DataAPI.getStrategiesHistorical(),
        DataAPI.getResourceTopics(),
        DataAPI.getToolTopics()
      ]);
      setMeetings(m);
      setNotices(n);
      setTools(t);
      setDiscounts(d);
      setHallOfFame(h);
      setFeaturedStrategies(f);
      setHistoricalStrategies(hi);
      setResourceTopics(r);
      setToolTopics(tt);
    } catch (err) {
      console.error("Failed to load generic data", err);
    }
  };

  // Subscribe and periodic refresh
  useEffect(() => {
    if (!user) return;

    loadGlobalCollections();

    // Set up notification listener
    const unsubNotifications = DataAPI.getNotifications(user.uid, (list) => {
      setNotifications(list);
    });

    // We refresh collections when they view or trigger things
    const intervalRef = setInterval(loadGlobalCollections, 10000);

    return () => {
      if (unsubNotifications) unsubNotifications();
      clearInterval(intervalRef);
    };
  }, [user, activeView]);

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await DataAPI.signIn(authEmail, authPass);
    } catch (err: any) {
      setAuthError(err.message || "Fallo al iniciar sesión.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authName.trim()) {
      setAuthError("Por favor ingresa tu nombre completo.");
      return;
    }
    try {
      await DataAPI.signUp(authEmail, authPass, authName);
    } catch (err: any) {
      setAuthError(err.message || "Fallo al crear cuenta.");
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      await DataAPI.recoverPassword(authEmail);
      setAuthSuccess("Se ha enviado un correo con instrucciones para restablecer tu contraseña.");
    } catch (err: any) {
      setAuthError(err.message || "Fallo en restablecimiento.");
    }
  };

  const handleSignOut = async () => {
    await DataAPI.signOut();
    setUser(null);
    setActiveView('pupil_panel');
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await DataAPI.signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || "Fallo en Google Sign-In.");
    }
  };

  // Simulation controls (Strictly Admin only)
  const handleSimulatedRoleChange = async (role: UserRole) => {
    if (!user || user.role !== 'administrador') return;
    const updated = { ...user, role };
    setUser(updated);
    await DataAPI.updateUserProfile(updated);
  };

  const handleSimulatedSubscriptionToggle = async (active: boolean) => {
    if (!user || user.role !== 'administrador') return;
    const updated = { ...user, mensualidadActive: active, subscription: active };
    setUser(updated);
    await DataAPI.updateUserProfile(updated);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileNameInput.trim()) return;
    const updated = {
      ...user,
      displayName: profileNameInput.trim(),
      avatarUrl: profileAvatarInput.trim() || undefined
    };
    setUser(updated);
    await DataAPI.updateUserProfile(updated);
    setIsEditingProfile(false);
  };

  const openProfileEditor = () => {
    if (!user) return;
    setProfileNameInput(user.displayName);
    setProfileAvatarInput(user.avatarUrl || '');
    setIsEditingProfile(true);
  };

  // Helper to filter meetings based on access
  const alumnoMeetings = meetings.filter(m => m.type === 'alumno');
  const comunidadMeetings = meetings.filter(m => m.type === 'mensualidad');

  const isSinRol = !user?.role || user?.role === 'none';
  const hasPayingAccess = ['administrador', 'colaborador'].includes(user?.role || '') || (['miembro', 'moderador'].includes(user?.role || '') && !!(user?.subscription || user?.mensualidadActive));

  if (loading) {
    return (
      <div id="full-loader" className="min-h-screen bg-[#050505] text-slate-200 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-pulse">
          <span className="font-extrabold text-white text-md">TMS</span>
        </div>
        <h3 className="font-sans font-bold text-lg text-white">Titan Master School</h3>
        <p className="text-slate-500 font-mono text-xs">Cargando portal privado de trading...</p>
      </div>
    );
  }

  // --- RENDERING AUTHENTICATION HUB ---
  if (!user) {
    return (
      <div id="auth-hub-screen" className="min-h-screen bg-[#050505] text-slate-200 flex flex-col justify-between py-10 px-4 font-sans selection:bg-purple-500/30 selection:text-white">
        
        {/* Top Floating Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-xs font-mono font-medium tracking-wide">
            ⚡ PORTAL PRIVADO ACADÉMICO COLECTIVO
          </div>
        </div>

        {/* Central Auth Container */}
        <div className="w-full max-w-md mx-auto bg-[#0A0A0B] border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Aesthetic background glows */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-pink-600/5 rounded-full blur-2xl" />

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black font-sans tracking-tight text-white flex items-center justify-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center shadow-md">
                <span className="font-extrabold text-white text-xs">TMS</span>
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">Titan Master</span>
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Trading & Volatility Academy</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {authView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium font-sans">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-email-login"
                    type="email"
                    required
                    placeholder="alumno@titan.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium font-sans">Contraseña</label>
                  <button type="button" onClick={() => setAuthView('recovery')} className="text-[10px] text-pink-400 hover:underline cursor-pointer">
                    ¿La olvidaste?
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-pass-login"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-purple-500/15 transition-all font-sans text-xs uppercase tracking-wider cursor-pointer"
              >
                Ingresar al Portal
              </button>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {authView === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium font-sans">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-name-register"
                    type="text"
                    required
                    placeholder="Santi Scalper"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium font-sans">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-email-register"
                    type="email"
                    required
                    placeholder="alumno@titan.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium font-sans">Contraseña (Mínimo 6 caracteres)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-pass-register"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 letras"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:opacity-90 text-white font-bold rounded-xl shadow-lg transition-all font-sans text-xs uppercase tracking-wider cursor-pointer"
              >
                Completar Registro
              </button>
            </form>
          )}

          {/* VIEW: RECOVERY */}
          {authView === 'recovery' && (
            <form onSubmit={handleRecover} className="space-y-4 text-xs">
              <p className="text-slate-400 text-xs leading-relaxed text-center font-sans">Ingresa el correo electrónico asociado a tu cuenta escolar y te enviaremos un código de seguridad para restaurar la clave.</p>
              
              <div className="space-y-1">
                <label className="text-slate-400 font-medium font-sans">Correo Registrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    id="input-email-recover"
                    type="email"
                    required
                    placeholder="correo@titan.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 font-sans focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <button
                id="btn-recover-submit"
                type="submit"
                className="w-full py-3 bg-[#050505] hover:bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Enviar Enlace de Recuperación
              </button>
            </form>
          )}

          <div className="relative flex py-2 items-center text-xs text-slate-600 font-mono">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4">O CONTINUAR CON</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Google SSO Button */}
          <button
            id="btn-google-sso"
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-[#050505] hover:bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.97 1 12 1 7.35 1 3.4 3.65 1.5 7.5L5.1 10.3C5.9 7.3 8.7 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.62-.21-2.39H12v4.51h6.46c-.28 1.48-1.11 2.73-2.36 3.58l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.54z" />
              <path fill="#FBBC05" d="M5.1 13.7c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.5 6.3C.54 8.1 0 10 0 12s.54 3.9 1.5 5.7l3.6-2.8z" strokeLinejoin="round" />
              <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.91l-3.66-2.84c-1.01.68-2.32 1.09-3.95 1.09-3.3 0-6.1-2.26-6.9-5.26l-3.6 2.8C3.4 20.35 7.35 23 12 23z" />
            </svg>
            <span>Autenticación con Google</span>
          </button>

          {/* Toggle View button */}
          <div className="text-center text-xs text-slate-500">
            {authView === 'login' ? (
              <span>
                ¿Eres nuevo alumno?{' '}
                <button id="switch-to-register-link" type="button" onClick={() => setAuthView('register')} className="text-purple-400 hover:underline font-bold cursor-pointer">
                  Regístrate aquí
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes matrícula?{' '}
                <button id="switch-to-login-link" type="button" onClick={() => setAuthView('login')} className="text-purple-400 hover:underline font-bold cursor-pointer">
                  Inicia sesión
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Footer info explaining Local-SSO testing trick */}
        <div className="w-full max-w-sm mx-auto p-4 bg-[#0A0A0B] border border-white/5 rounded-xl text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-mono">⚡ CONSEJO DE EVALUACIÓN:</p>
          <p className="text-[10px] text-slate-400">Si te registras con el email <strong className="text-purple-400 font-sans">m.scalpernq@gmail.com</strong>, el sistema te asignará instantáneamente el rol de <strong>Administrador</strong> con todos los accesos desbloqueados.</p>
        </div>
      </div>
    );
  }

  // --- RENDERING MAIN DASHBOARD WORKSPACE (Authenticated User) ---
  return (
    <div id="school-main-app-layout" className="min-h-screen bg-[#050505] text-slate-200 font-sans flex flex-col justify-between selection:bg-purple-500/30 selection:text-white">
      <div>
        
        {/* TOP GLOWING STATUS BAR */}
        <header className="sticky top-0 z-40 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div 
            id="header-brand-logo"
            onClick={() => setActiveView('pupil_panel')} 
            className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-all select-none"
            title="Volver al Panel Principal (Titan Master)"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-white text-xs">TMS</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2 font-heading group-hover:text-purple-400 transition-colors">
                Titan Master School
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeView !== 'pupil_panel' && (
              <button
                id="header-back-button-panel"
                onClick={() => setActiveView('pupil_panel')}
                className="py-1.5 px-3.5 bg-gradient-to-r from-purple-650 to-pink-650 hover:opacity-95 text-white border border-white/10 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>← Panel Principal</span>
              </button>
            )}
            
            {/* IN-APP NOTIFICATIONS BELL */}
            <div className="relative">
              <button
                id="bell-notif-toggle"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl bg-[#0A0A0B] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all relative cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 animate-pulse border border-[#050505]" />
                )}
              </button>

              {/* Notification floating list */}
              {notificationsOpen && (
                <div id="notifications-dropdown-bubble" className="absolute right-0 mt-3.5 w-80 bg-[#0A0A0B] border border-white/5 p-4 rounded-2xl shadow-2xl space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Notificaciones Internas</span>
                    <button id="close-notif-bubble" onClick={() => setNotificationsOpen(false)} className="text-[10px] text-slate-500 hover:text-white cursor-pointer">Cerrar</button>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-4 text-slate-600 text-xs font-sans">Sin novedades recientes.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          id={`notif-${n.id}`}
                          key={n.id}
                          className={`p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-all ${
                            n.read 
                            ? 'bg-[#050505] border-white/5 text-slate-500' 
                            : 'bg-purple-500/5 border-purple-500/20 text-slate-200'
                          }`}
                          onClick={() => DataAPI.markNotificationRead(user.uid, n.id)}
                        >
                          <div className="font-semibold text-white flex items-center justify-between font-sans">
                            <span>{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-sans">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info and Logout */}
            <div className="hidden sm:flex items-center gap-2 bg-[#0A0A0B] py-1 px-2 pb-1.5 rounded-2xl border border-white/5 shadow-inner">
              <div 
                onClick={openProfileEditor}
                className="cursor-pointer hover:opacity-80 transition-all flex items-center gap-2 bg-[#121214] py-1 px-2 rounded-xl"
                title="Configurar Perfil"
              >
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName} 
                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600 border border-white/10 text-white font-mono text-[10px] font-black flex items-center justify-center uppercase">
                    {user.displayName.substring(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-200 truncate max-w-[90px] font-sans flex items-center gap-1">
                    {user.displayName}
                  </p>
                  <p className="text-[8px] text-pink-400 font-mono tracking-widest uppercase font-black">{user.role || 'Sin Rol'}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  id="btn-edit-profile-top"
                  onClick={openProfileEditor}
                  title="Configurar Nombre o Foto"
                  className="p-1 px-1.5 text-slate-500 hover:text-purple-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-sign-out-top"
                  onClick={handleSignOut}
                  title="Cerrar sesión"
                  className="p-1 px-1.5 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* DOUBLE VIEWPORT MAIN CONTAINER */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
                 {activeView === 'pupil_panel' && (
            <aside className="lg:col-span-3 space-y-6">
            
              {/* SECCIÓN A: ALUMNO NAV */}
              <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-2xl space-y-2">
                <div className="px-2.5 pb-2 border-b border-white/5 flex items-center justify-between ">
                  <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">Sección Alumno</span>
                  <span className={`text-[9px] py-0.5 px-1.5 rounded uppercase font-mono font-bold ${
                    isSinRol 
                    ? 'bg-[#121214] border border-white/5 text-slate-400' 
                    : 'bg-purple-500/10 border border-purple-500/25 text-purple-400'
                  }`}>
                    {isSinRol ? 'Bloqueado' : 'Abierto'}
                  </span>
                </div>

                <nav className="space-y-1 pt-2">
                  {[
                    { view: 'pupil_panel', label: 'Panel principal', icon: BookOpen },
                    { view: 'pupil_chat', label: 'Chat general', icon: MessageSquare, isChat: true },
                    { view: 'pupil_resources', label: 'Recursos', icon: BookMarked },
                    { view: 'pupil_tools', label: isSinRol ? 'Calculadoras' : 'Herramientas', icon: Wrench },
                    { view: 'pupil_discounts', label: 'Descuentos y cupones', icon: Tag },
                    { view: 'pupil_meetings', label: 'Sesiones Zoom/Meet', icon: Video, isMeeting: true },
                    { view: 'pupil_notices', label: 'Avisos', icon: Info }
                  ].filter(item => {
                    // Sin rol can only access Panel and Calculadoras
                    if (isSinRol) {
                      return ['pupil_panel', 'pupil_tools'].includes(item.view);
                    }
                    // Alumno has no access to Chats or Reuniones (Meetings)
                    if (user?.role === 'alumno') {
                      if (item.isChat || item.isMeeting) return false;
                    }
                    // If subscription is false, hide Chats, Reuniones
                    const isSubActive = !!(user?.subscription || user?.mensualidadActive);
                    if (!isSubActive) {
                      if (item.isChat || item.isMeeting) return false;
                    }
                    return true;
                  }).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        id={`nav-${item.view}`}
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all cursor-pointer ${
                          activeView === item.view 
                          ? 'bg-white/5 text-white border border-white/5 shadow-md shadow-purple-500/5' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-purple-400" />
                          {item.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    );
                  })}

                  {isSinRol && (
                    <button
                      id="nav-join-tms"
                      onClick={() => setActiveView('pupil_checkout')}
                      className="w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer border border-[#f43f5e]/15 bg-[#f43f5e]/5 text-pink-405 hover:bg-[#f43f5e]/10 shadow-md shadow-pink-500/5 mt-1"
                    >
                      <span className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                        <span>Únete a TMS</span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-pink-400" />
                    </button>
                  )}
                </nav>
              </div>

              {/* SECCIÓN B: COMUNIDAD/MENSUALIDAD NAV */}
              {!isSinRol && (
                <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-2xl space-y-2">
                  <div className="px-2.5 pb-2 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-550 font-mono font-bold tracking-widest uppercase">COMUNIDAD</span>
                    <span className={`text-[9px] py-0.5 px-1.5 rounded uppercase font-mono font-bold ${
                      hasPayingAccess 
                      ? 'bg-pink-500/10 border border-pink-500/25 text-pink-400' 
                      : 'bg-[#121214] border border-white/5 text-slate-400'
                    }`}>
                      {hasPayingAccess ? 'VIP' : 'Bloqueado'}
                    </span>
                  </div>
    
                  <nav className="space-y-1 pt-2">
                    {hasPayingAccess ? (
                      [
                        { view: 'community_chat', label: 'Chat comunidad', icon: MessageSquare },
                        { view: 'community_meetings', label: 'Sesiones comunidad', icon: Video },
                        { view: 'community_hof', label: 'Salón de la fama', icon: Award },
                        { view: 'community_featured', label: 'Estrategias destacadas', icon: Flame },
                        { view: 'community_library', label: 'Históricas ganadoras', icon: Layers }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            id={`nav-${item.view}`}
                            key={item.view}
                            onClick={() => setActiveView(item.view)}
                            className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all cursor-pointer ${
                              activeView === item.view 
                              ? 'bg-white/5 text-white border border-white/5 shadow-md shadow-pink-500/5' 
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-pink-400" />
                              {item.label}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        );
                      })
                    ) : (
                      <button
                        id="nav-join-community-private"
                        onClick={() => setActiveView('community_checkout')}
                        className="w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer border border-[#f43f5e]/15 bg-[#f43f5e]/5 text-pink-400 hover:bg-[#f43f5e]/10 shadow-md shadow-pink-500/5"
                      >
                        <span className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                          <span>Únete a la Comunidad Privada</span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-pink-400" />
                      </button>
                    )}
                  </nav>
                </div>
              )}

            {/* SECCIÓN ADMINISTRADOR O COLABORADOR ACCESO */}
            {['administrador', 'colaborador'].includes(user.role || '') && (
              <div className="bg-[#0a0505] border border-red-500/10 p-4 rounded-2xl">
                <button
                  id="nav-admin-direct-link"
                  onClick={() => setActiveView('admin_view')}
                  className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeView === 'admin_view' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Acceso Director Académico</span>
                </button>
              </div>
            )}

            {/* Simulated Seniority Setting inside the aside wrapper */}
            {hasPayingAccess && activeView === 'community_library' && (
              <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl text-xs space-y-2">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">📆 SIMULADOR DE ANTIGÜEDAD</span>
                <p className="text-[10px] text-slate-400">Modifica el tiempo simulado que llevas en la academia para evaluar los desbloqueos automáticos:</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 6].map((m) => (
                    <button
                      id={`sim-months-btn-${m}`}
                      key={m}
                      onClick={() => setSimulatedMonths(m)}
                      className={`py-1.5 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                        simulatedMonths === m 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-[#121214] border border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            )}

          </aside>
        )}

          {/* RIGHT SIDE WORKSPACE VIEWPORT (9/12cols) */}
          <main className={`${activeView === 'pupil_panel' ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-8`}>
            
            {/* VIEW A.1: PANEL PRINCIPAL / DASHBOARD */}
            {activeView === 'pupil_panel' && isSinRol && (
              <div id="sin-rol-dashboard" className="p-8 bg-[#0A0A0B] border border-white/5 rounded-3xl relative overflow-hidden text-center space-y-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
                
                <div className="space-y-3 max-w-lg mx-auto">
                  <div className="inline-flex p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-2xl animate-pulse mb-2">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white tracking-tight">Tu cuenta está pendiente de aprobación por parte de un administrador.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Tu usuario aún no ha sido aprobado o asignado a un grupo académico. Puedes acceder únicamente a las calculadoras de trading mientras un Director Académico aprueba tu cuenta.
                  </p>
                </div>

                <div className="border-t border-white/5 pt-6 mt-6">
                  <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-widest block mb-4 text-center">Calculadoras Habilitadas</span>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                    <CalculadoraLotes />
                    <CalculadoraApalancamiento />
                  </div>
                </div>
              </div>
            )}

            {activeView === 'pupil_panel' && !isSinRol && (
              <div id="pupil-dashboard-view" className="space-y-6">
                
                {/* School Greeting card */}
                <div className="bg-gradient-to-br from-[#121214] to-[#0A0A0B] border border-white/5 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                  
                  <div className="space-y-3 relative z-10">
                    <div>
                      <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-widest block mb-1">Bienvenido de vuelta a</span>
                      <h1 className="text-3xl md:text-4xl font-black font-heading text-white tracking-tight uppercase leading-none">
                        TITAN MASTER SCHOOL
                      </h1>
                      <div className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 tracking-tight mt-1">
                        {user.displayName}
                      </div>
                    </div>
                    {['administrador', 'moderador', 'colaborador'].includes(user.role) && (
                      <p className="text-slate-350 text-xs leading-relaxed max-w-xl font-sans mt-2">
                        Tienes estatus académico de <strong>{user.role.toUpperCase()}</strong>. Este portal te permite consultar transmisiones, debatir en los canales comunitarios del chat general y descargar materiales de alto rendimiento.
                      </p>
                    )}
                  </div>
                </div>

                {/* Dashboard Stats Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Próximas Clases</span>
                    <div className="text-lg font-bold text-white font-sans">{alumnoMeetings.length} Sesiones Libres</div>
                    <p className="text-[10px] text-slate-550">Programadas en Zoom / Google Meet para esta semana.</p>
                  </div>

                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Estatus Suscripción</span>
                    <div className={`text-lg font-bold font-sans ${user.mensualidadActive ? 'text-emerald-400' : 'text-pink-400'}`}>
                      {user.mensualidadActive ? 'Mensualidad Activa' : 'Suscripción Básica'}
                    </div>
                    <p className="text-[10px] text-slate-550 font-sans">Permite acceder a Comunidad y Estrategias Pro.</p>
                  </div>

                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Canal de Chat Colectivo</span>
                    <div className="text-lg font-bold text-purple-400 font-sans"># chat-alumnos</div>
                    <p className="text-[10px] text-slate-550">Únete a debatir con los demás colegas del aula.</p>
                  </div>
                </div>

                {/* Grid layout containing Recent Urgent alerts and Quick Lot size calculator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Urgent notices widget */}
                  <div className="p-5 bg-pink-500/5 border border-pink-500/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-pink-500/10">
                      <ShieldAlert className="w-4 h-4 text-pink-400 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Resumen de Avisos Urgentes</span>
                    </div>

                    <div className="space-y-3">
                      {notices.length === 0 ? (
                        <p className="text-xs text-slate-500 font-sans">No hay alertas urgentes del claustro escolar por el momento.</p>
                      ) : (
                        notices.map((n) => (
                          <div id={`dash-notice-${n.id}`} key={n.id} className="p-3 bg-[#050505]/40 border-l-2 border-pink-500 rounded-r-xl space-y-1">
                            <h4 className="text-xs font-bold text-white font-sans">{n.title}</h4>
                            <p className="text-[11px] text-slate-350 leading-relaxed truncate font-sans">{n.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Lot sizing widget shortcuts */}
                  <div className="p-5 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                        <Wrench className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Herramienta Rápida del Estudiante</span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed mt-2 font-sans">Usa la calculadora integrada para planificar tu riesgo de lote según tu Stop Loss de pips.</p>
                    </div>

                    <button
                      id="dash-go-calc-btn"
                      onClick={() => setActiveView('pupil_tools')}
                      className="mt-4 w-full py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      ABRIR CALCULADORA DE LOTES <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {/* Partners & Funding Deals section */}
                <div className="bg-[#0A0A0B] border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Convenios de Fondeo & Partners Oficiales</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* APEX DEALS */}
                    <div className="p-4 bg-zinc-950/50 border border-zinc-900 rounded-xl flex flex-col justify-between space-y-3 text-left">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-rose-450 font-sans tracking-wide">APEX TRADING FUNDING</span>
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase font-mono">CUPÓN: TMS</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-relaxed">
                          La firma de fondeo de futuros líder. Obtén un descuento exclusivo del 80%-90% en tus cuentas de evaluación usando nuestro código promocional verificado escolar.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <span className="text-[10px] text-zinc-500 font-mono">Código Promocional: <strong className="text-white selection:bg-pink-500 font-mono">TMS</strong></span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('TMS');
                            alert('¡Código de descuento "TMS" copiado!');
                          }}
                          className="px-2.5 py-1 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-550/20 cursor-pointer transition-all"
                        >
                          Copiar Código
                        </button>
                      </div>
                    </div>

                    {/* EARN2TRADE DEALS */}
                    <div className="p-4 bg-zinc-950/50 border border-zinc-900 rounded-xl flex flex-col justify-between space-y-3 text-left">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-amber-400 font-sans tracking-wide">EARN2TRADE</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase font-mono">PROMO ACTIVA</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 font-sans leading-relaxed">
                          Accede al programa Trader Career Path o Gauntlet Mini de forma preferencial. Evaluaciones profesionales en futuros con reglas claras de consistencia y soporte premium.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <a 
                          href="https://www.earn2trade.com/es/non-us?a_pid=the_scalper" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-450 text-black rounded-lg text-[10px] font-bold uppercase text-center block transition-all hover:scale-[1.01]"
                        >
                          Click en el enlace ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW A.2: CHAT GENERAL ALUMNOS */}
            {activeView === 'pupil_chat' && (
              <div id="pupil-chat-view" className="space-y-4">
                <ChatPanel chatType="alumno" currentUser={user} />
              </div>
            )}

            {/* VIEW A.3: RECURSOS - DYNAMIC BULLETIN FORUMS */}
            {activeView === 'pupil_resources' && (
              <div id="pupil-resources-view" className="space-y-6">
                <RecursosBoard 
                  currentUser={user} 
                  resourceTopics={resourceTopics} 
                  onRefresh={loadGlobalCollections} 
                />
              </div>
            )}

            {/* VIEW A.4: HERRAMIENTAS - CALCULATORS & FOLDER TOPICS */}
            {activeView === 'pupil_tools' && (
              <div id="pupil-tools-view" className="space-y-6">
                <HerramientasBoard 
                  currentUser={user} 
                  toolTopics={toolTopics} 
                  onRefresh={loadGlobalCollections} 
                />
              </div>
            )}

            {/* VIEW A.5: DESCUENTOS ACADÉMICOS */}
            {activeView === 'pupil_discounts' && (() => {
              const discountTopics = [
                {
                  id: 'apex',
                  category: 'fondeo',
                  label: 'apex-trader-funding',
                  title: 'Apex Trader Funding',
                  author: 'Santi Scalper',
                  role: 'administrador',
                  benefit: '¡80% de DESCUENTO DIRECTO EN TODAS LAS CUENTAS!',
                  description: 'Evaluación de futuros líder. Conexión de muy bajo delay con Tradovate o Rhythmic. Permite pasar cuentas micro-contratos y micro-lotes sin reglas absurdas de consistencia diaria y con retiros quincenales por Deel.',
                  parameters: 'Código aplicable a planes de $25k, $50k, $100k y $150k.',
                  code: 'TITAN80',
                  link: 'https://apextraderfunding.com/?c=titan80',
                  avatar: 'SS',
                  avatarColor: 'from-purple-650 to-pink-650',
                  date: 'Hoy a las 10:14 AM',
                  comments: 'Este es el convenio más popular entre alumnos para operar el mercado de futuros de Chicago.',
                  replies: [
                    {
                      userName: 'Carlos Trading',
                      userRole: 'alumno',
                      text: '¡Brutal! Súper recomendado, acabo de activar una cuenta de 50K por menos de $20.',
                      time: 'Hoy a las 11:20 AM',
                      avatar: 'CT',
                      avatarColor: 'from-blue-500 to-indigo-500'
                    },
                    {
                      userName: 'Sofía Valenzuela',
                      userRole: 'miembro',
                      text: 'El soporte técnico de Apex es rapidísimo. Acoplada con Tradovate va de locos.',
                      time: 'Hoy a las 12:45 PM',
                      avatar: 'SV',
                      avatarColor: 'from-emerald-500 to-teal-500'
                    }
                  ]
                },
                {
                  id: 'e2t',
                  category: 'fondeo',
                  label: 'earn2trade-carepath',
                  title: 'Earn2Trade',
                  author: 'Santi Scalper',
                  role: 'administrador',
                  benefit: '¡45% DE DESCUENTO EN TU EVALUACIÓN DE FUTUROS!',
                  description: 'Evaluaciones ideales para convertirse en trader profesional formal regulado. Brinda reglas de arrastre sólidas a fin de día (End of Day Drawdown) y excelente material educativo institucional.',
                  parameters: 'Válido para cuentas del plan Trader Career Path (TCP) y Mini Gauntlet.',
                  code: 'TITANE2T45',
                  link: 'https://www.earn2trade.com/?a=titan40',
                  avatar: 'SS',
                  avatarColor: 'from-purple-500 to-indigo-500',
                  date: 'Ayer a las 09:30 AM',
                  comments: 'Esta firma premia la paciencia. Súper recomendada si te cuesta controlar la sobre-operación.',
                  replies: [
                    {
                      userName: 'Eduardo Trader',
                      userRole: 'miembro',
                      text: 'Por fin un descuento serio para Earn2Trade. Esta firma tiene las reglas más sanas del mercado.',
                      time: 'Ayer a las 10:15 AM',
                      avatar: 'ET',
                      avatarColor: 'from-orange-500 to-rose-500'
                    }
                  ]
                },
                {
                  id: 'fundednext',
                  category: 'fondeo',
                  label: 'fundednext-prop',
                  title: 'FundedNext',
                  author: 'Moderador Titan',
                  role: 'moderador',
                  benefit: '¡10% DE DESCUENTO DIRECTO + 15% DE BENEFICIO EN RETOS!',
                  description: 'Excelente prop firm para operar Forex, CFD, metales e índices mundiales con spreads hiper-bajos. Sin límites de tiempo y opción de recibir pagos desde la misma fase de evaluación.',
                  parameters: 'Aplicable a cuentas Stellar Challenges y de corte clásico.',
                  code: 'TITANNEXT10',
                  link: 'https://fundednext.com/?ref=titan',
                  avatar: 'MT',
                  avatarColor: 'from-teal-500 to-cyan-500',
                  date: 'Hace 3 días',
                  comments: 'Firma de fondeo confiable y de enorme crecimiento en nuestra comunidad.',
                  replies: [
                    {
                      userName: 'Carlos Alumno',
                      userRole: 'alumno',
                      text: 'Excelente soporte y rapidez con el cashback. Ya compré una Stellar de 15K.',
                      time: 'Hace 2 días',
                      avatar: 'CA',
                      avatarColor: 'from-violet-500 to-purple-500'
                    }
                  ]
                },
                {
                  id: 'ftmo',
                  category: 'fondeo',
                  label: 'ftmo-institucional',
                  title: 'FTMO Prop Firm',
                  author: 'Santi Scalper',
                  role: 'administrador',
                  benefit: '5% REEMBOLSO DIRECTO + DESAFIOS ACADÉMICOS',
                  description: 'La firma de fondeo más segura, duradera y consolidada a nivel global. Brinda condiciones reales de mercado en Forex y una suite de auditoría técnica que te ayudará a corregir tus peores hábitos de trading.',
                  parameters: 'El reembolso se devuelve de forma directa en tu cartera titan.',
                  code: 'TITANFTMO5',
                  link: 'https://ftmo.com/es/?affiliate=titan5',
                  avatar: 'SS',
                  avatarColor: 'from-purple-650 to-pink-650',
                  date: 'Hace 4 días',
                  comments: 'La cuenta predilecta de todo trader consolidado debido a su transparencia institucional.',
                  replies: [
                    {
                      userName: 'Sofía Valenzuela',
                      userRole: 'miembro',
                      text: 'FTMO es el rey. Los spreads durante noticias son los más estables, garantizado.',
                      time: 'Hace 3 días',
                      avatar: 'SV',
                      avatarColor: 'from-emerald-500 to-teal-550'
                    }
                  ]
                },
                {
                  id: 'tradingview',
                  category: 'herramientas',
                  label: 'tradingview-charts',
                  title: 'TradingView Premium',
                  author: 'Director Académico',
                  role: 'colaborador',
                  benefit: '¡30% DE DESCUENTO EN SUSCRICIONES ANUALES!',
                  description: 'La plataforma que todos usamos en clase para nuestro análisis técnico fractal. Permite crear alertas inteligentes en la nube, indicadores volumétricos a medida y llevar un diario visual de análisis ordenado.',
                  parameters: 'Obtienes 30 días de prueba gratuita y descuento de hasta 30% en planes anuales.',
                  code: 'TITANVIEW30',
                  link: 'https://tradingview.com/?aff=titan30',
                  avatar: 'DA',
                  avatarColor: 'from-amber-500 to-orange-500',
                  date: 'Hoy a las 09:00 AM',
                  comments: 'Herramienta obligatoria para nuestras mentorías y clases en vivo.',
                  replies: [
                    {
                      userName: 'Carlos Alumno',
                      userRole: 'alumno',
                      text: '¡Por fin puedo añadir más de 3 indicadores sin que aparezcan anuncios!',
                      time: 'Hoy a las 10:15 AM',
                      avatar: 'CA',
                      avatarColor: 'from-violet-500 to-purple-500'
                    }
                  ]
                },
                {
                  id: 'metatrader5',
                  category: 'herramientas',
                  label: 'mt5-scripts',
                  title: 'MetaTrader 5 Plugins',
                  author: 'Moderador Titan',
                  role: 'moderador',
                  benefit: '¡INDICADORES DE VOLUMEN Y CALCULADOR DE RIESGO GRATIS!',
                  description: 'Convenio académico con nuestros proveedores para automatizar perfiles de mercado y scripts de ejecución rápida mediante MetaTrader 5 sin pagar tarifas adicionales.',
                  parameters: 'Compatible con sistema operativo Windows y simulador de Mac.',
                  code: 'TITANMT5PRO',
                  link: 'https://www.metatrader5.com/',
                  avatar: 'MT',
                  avatarColor: 'from-teal-500 to-cyan-500',
                  date: 'Hace 1 semana',
                  comments: 'Sincronizado de fábrica con la calculadora de lotes oficial de nuestra mesa.',
                  replies: [
                    {
                      userName: 'Eduardo Trader',
                      userRole: 'miembro',
                      text: 'El script de cierre parcial en un click me ha salvado la vida tres veces en el Nasdaq hoy.',
                      time: 'Hace 5 días',
                      avatar: 'ET',
                      avatarColor: 'from-orange-500 to-rose-500'
                    }
                  ]
                },
                {
                  id: 'quanttower',
                  category: 'herramientas',
                  label: 'quanttower-orderflow',
                  title: 'QuantTower OrderFlow',
                  author: 'Santi Scalper',
                  role: 'administrador',
                  benefit: '¡LICENCIA PREMIUM DE ORDER FLOW CON DESCUENTO EXCLUSIVO!',
                  description: 'Herramienta profesional para analizar el volumen consolidado de futuros. Ideal si estudias el mercado mediante Footprint, mapas de liquidez (Heatmap) y el libro de órdenes limitadas del CME.',
                  parameters: 'Licencia gratuita utilizando la conexión de AMP Global.',
                  code: 'TITANQUANT15',
                  link: 'https://www.quanttower.com/',
                  avatar: 'SS',
                  avatarColor: 'from-purple-650 to-pink-650',
                  date: 'Hace 2 semanas',
                  comments: 'La mejor plataforma de Order Flow del mercado para analizar la absorción límite institucional.',
                  replies: [
                    {
                      userName: 'Santi Scalper',
                      userRole: 'administrador',
                      text: 'Recuerden que daré una masterclass de visualizaciones avanzadas de QuantTower el próximo jueves 8.',
                      time: 'Hace 1 semana',
                      avatar: 'SS',
                      avatarColor: 'from-purple-650 to-pink-650'
                    }
                  ]
                }
              ];

              const currentTopic = discountTopics.find(t => t.id === activeDiscountTopic) || discountTopics[0];

              const handleCopyCode = (id: string, code: string) => {
                navigator.clipboard.writeText(code);
                setCopiedCodeId(id);
                setTimeout(() => setCopiedCodeId(null), 2000);
              };

              return (
                <div id="pupil-discounts-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white">Canales de Descuentos y Convenios</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono tracking-wider text-left">CANALES ESTILO DISCORD CON ACCESO DIRECTOS DE ADMINISTRADOR</p>
                  </div>

                  {/* DISCORD INTERFACE CONTAINER */}
                  <div className="bg-[#0A0A0B] border border-white/5 rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] shadow-2xl">
                    
                    {/* LEFT PANEL: CHANNELS LIST (3cols) */}
                    <div className="md:col-span-4 lg:col-span-3 bg-[#050505] border-r border-white/5 flex flex-col justify-between">
                      <div className="p-4 space-y-4">
                        {/* Discord Server Title */}
                        <div className="pb-3 border-b border-white/5">
                          <span className="text-[11px] text-white font-bold tracking-wider uppercase flex items-center gap-1.5 font-mono">
                            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 animate-pulse"></span>
                            Convenios Titan School
                          </span>
                        </div>

                        {/* Category 1: Empresas de fondeo */}
                        <div className="space-y-1 text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono block pl-2.5">
                            📊 Empresas de Fondeo
                          </span>
                          <div className="space-y-0.5">
                            {discountTopics
                              .filter(t => t.category === 'fondeo')
                              .map(topic => (
                                <button
                                  id={`discount-topic-${topic.id}`}
                                  key={topic.id}
                                  onClick={() => setActiveDiscountTopic(topic.id)}
                                  className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                                    activeDiscountTopic === topic.id
                                      ? 'bg-pink-550/15 text-pink-400 border border-pink-500/10 font-bold'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-slate-600 font-mono text-sm font-normal">#</span>
                                    {topic.id}
                                  </span>
                                  {activeDiscountTopic === topic.id && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"></span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Category 2: Herramientas */}
                        <div className="space-y-1 text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono block pl-2.5">
                            🛠️ Herramientas
                          </span>
                          <div className="space-y-0.5">
                            {discountTopics
                              .filter(t => t.category === 'herramientas')
                              .map(topic => (
                                <button
                                  id={`discount-topic-${topic.id}`}
                                  key={topic.id}
                                  onClick={() => setActiveDiscountTopic(topic.id)}
                                  className={`w-full text-left py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                                    activeDiscountTopic === topic.id
                                      ? 'bg-purple-550/15 text-purple-400 border border-purple-500/10 font-bold'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-slate-600 font-mono text-sm font-normal">#</span>
                                    {topic.id}
                                  </span>
                                  {activeDiscountTopic === topic.id && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Info Panel Footer */}
                      <div className="p-3.5 bg-[#030303] border-t border-white/5 text-[9px] text-slate-500 font-mono text-center flex items-center justify-center gap-1.5 font-sans">
                        <Shield className="w-3.5 h-3.5 text-pink-500" />
                        <span>CANALES SOLO LECTURA</span>
                      </div>
                    </div>

                    {/* RIGHT PANEL: ACTIVE TOPIC CHAT VIEW (9cols) */}
                    <div className="md:col-span-8 lg:col-span-9 bg-[#0A0A0B] flex flex-col justify-between overflow-hidden">
                      {/* Active Channel Header */}
                      <div className="p-4 border-b border-white/5 bg-[#080809] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-slate-500 text-lg font-mono">#</span>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{currentTopic.label}</span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline-block border-l border-white/10 pl-2 font-sans">Información y descuento exclusivo de {currentTopic.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 uppercase">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Autorizado</span>
                        </div>
                      </div>

                      {/* Chat Messages Log Area */}
                      <div className="p-6 flex-1 overflow-y-auto space-y-6 max-h-[480px]">
                        
                        {/* Splash Channel Welcome */}
                        <div className="space-y-2 mb-6 text-left select-none">
                          <div className="w-12 h-12 rounded-2xl bg-[#050505] border border-white/10 flex items-center justify-center text-slate-400 text-xl font-mono">
                            #
                          </div>
                          <h4 className="text-base font-extrabold text-white">¡Te damos la bienvenida al canal #{currentTopic.id}!</h4>
                          <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-sans">Este es el inicio del hilo de convenios oficiales creado por el equipo administrativo y el director de la academia para #{currentTopic.title}.</p>
                          <hr className="border-white/5 mt-4" />
                        </div>

                        {/* Pinned Admin Embed Message */}
                        <div className="flex gap-4 items-start select-none text-left">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentTopic.avatarColor} text-white font-mono text-xs font-bold flex items-center justify-center shadow-md`}>
                            {currentTopic.avatar}
                          </div>
                          <div className="space-y-2 flex-1">
                            {/* Author Row */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${
                                currentTopic.role === 'administrador' ? 'text-red-400' : 'text-purple-400'
                              }`}>{currentTopic.author}</span>
                              <span className="text-[8px] uppercase tracking-widest font-mono bg-purple-500/10 border border-purple-500/25 text-purple-400 px-1 rounded-sm font-bold">STAFF</span>
                              <span className="text-[9px] text-slate-500 font-mono">{currentTopic.date}</span>
                            </div>

                            {/* Text message */}
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              Hola alumnos y miembros de Titan. Aquí les dejo el convenio oficial que hemos firmado con la firma de <strong>{currentTopic.title}</strong>. Tienen a su disposición un beneficio directo aplicando nuestro enlace de afiliado formal y el código de descuento activo escolar:
                            </p>

                            {/* Gorgeous Embed Block */}
                            <div className={`border-l-4 ${
                              currentTopic.category === 'fondeo' ? 'border-pink-500' : 'border-purple-500'
                            } bg-[#050505]/60 hover:bg-[#050505]/80 transition-all rounded-r-2xl p-5 space-y-4 max-w-2xl mt-3 border border-y-white/5 border-r-white/5 shadow-lg`}>
                              
                              <div>
                                <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${
                                  currentTopic.category === 'fondeo' ? 'text-pink-400' : 'text-purple-400'
                                }`}>💎 CONVENIO OFICIAL EXCLUSIVO</span>
                                <h5 className="text-sm font-bold text-white mt-1 leading-tight">{currentTopic.benefit}</h5>
                              </div>

                              <div className="space-y-1.5 text-xs text-left">
                                <p className="text-slate-300 font-sans text-[11px] leading-relaxed"><strong className="text-white font-sans">Descripción técnica:</strong> {currentTopic.description}</p>
                                <p className="text-slate-400 font-sans text-[11px] leading-relaxed"><strong className="text-white font-sans">Parámetros operativos:</strong> {currentTopic.parameters}</p>
                                <p className="text-slate-400 italic text-[11px] max-w-xl font-sans mt-2 border-t border-white/5 pt-1.5">"{currentTopic.comments}"</p>
                              </div>

                              {/* Copiar Code Section */}
                              <div className="grid grid-cols-1 p-3 bg-[#0A0A0B] rounded-xl border border-white/5 gap-3 sm:grid-cols-2 items-center text-left">
                                <div>
                                  <span className="text-[9px] text-slate-500 font-mono block">CÓDIGO DE DESCUENTO DIRECTO:</span>
                                  <span className="text-sm font-bold font-mono tracking-widest text-white selection:bg-pink-500">{currentTopic.code}</span>
                                </div>
                                <button
                                  id={`btn-copy-code-${currentTopic.id}`}
                                  onClick={() => handleCopyCode(currentTopic.id, currentTopic.code)}
                                  className={`py-2 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] font-sans ${
                                    copiedCodeId === currentTopic.id
                                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                      : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white'
                                  }`}
                                >
                                  {copiedCodeId === currentTopic.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> ¡Copiado de una!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-slate-400" /> Copiar Código
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Call to Action Anchor Link */}
                              <a
                                id={`link-cta-official-${currentTopic.id}`}
                                href={currentTopic.link}
                                target="_blank"
                                rel="noreferrer"
                                className={`w-full py-2.5 px-4 block text-center rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md font-sans ${
                                  currentTopic.category === 'fondeo'
                                    ? 'bg-pink-650 hover:bg-pink-700 hover:scale-[1.01] text-white'
                                    : 'bg-purple-650 hover:bg-purple-700 hover:scale-[1.01] text-white'
                                }`}
                              >
                                IR A LA WEB OFICIAL DEL CONVENIO ↗
                              </a>

                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
                         {/* VIEW A.6: SESIONES ZOOM/MEET */}
            {activeView === 'pupil_meetings' && (
              <div id="pupil-meetings-view" className="space-y-6">
                <div>
                  <h3 className="text-lg font-sans font-bold text-white">Sesiones de Transmisión del Aula</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-mono">REUNIONES ACADÉMICAS ABIERTAS PARA ALUMNOS</p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {alumnoMeetings.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500">No hay reuniones públicas registradas por el momento. Revisa con el director.</div>
                  ) : (
                    alumnoMeetings.map((m) => (
                      <div id={`meet-card-${m.id}`} key={m.id} className="p-5 bg-[#0A0A0B] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <span className="bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase font-mono">ABIERTO ALUMNO</span>
                          <h4 className="text-base font-bold text-white font-sans">{m.title}</h4>
                          <div className="flex items-center gap-4 text-slate-500 text-[10px] font-mono">
                            <span>📆 {m.date}</span>
                            <span>⏰ {m.time} HORAS</span>
                          </div>
                        </div>

                        <a
                          id={`meet-link-btn-${m.id}`}
                          href={m.link}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        >
                          INGRESAR A LA CLASE <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW A.7: AVISOS IMPORTANTES */}
            {activeView === 'pupil_notices' && (
              <div id="pupil-notices-view" className="space-y-6">
                <div>
                  <h3 className="text-lg font-sans font-bold text-white">Diario de Avisos Importantes</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-mono">MENSAJES OFICIALES DE NUESTROS PROFESORES</p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {notices.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500">No se han emitido circulares o comunicados hoy.</div>
                  ) : (
                    notices.map((n) => (
                      <div id={`notice-card-${n.id}`} key={n.id} className={`p-5 bg-[#0A0A0B] rounded-2xl border ${n.urgent ? 'border-pink-500/30' : 'border-white/5'} space-y-3`}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                          {n.urgent && (
                            <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white text-[9px] font-extrabold font-mono px-2 py-0.5 rounded shadow">CIRCULAR URGENTE</span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-white font-sans">{n.title}</h4>
                        <p className="text-xs text-slate-350 leading-relaxed break-words">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW A.0: PUPIL CHECKOUT WALL (ÚNETE A TMS) */}
            {activeView === 'pupil_checkout' && (
              <div id="pupil-payment-wall" className="p-8 bg-[#0A0A0B] border border-white/5 rounded-3xl relative overflow-hidden text-center space-y-6 animate-fade-in">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl" />
                
                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex p-3 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-2xl animate-pulse mb-2">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white tracking-tight">Acceso Bloqueado: Sección Alumno</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
                    Actualmente no tienes un rol académico activo en Titan Master School. Únete hoy mismo para desbloquear los canales del chat escolar, biblioteca de recursos, circulares de avisos y sesiones en vivo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-xs text-left font-sans">
                  {[
                    { title: 'Chat Escolar Colectivo', desc: 'Debates grupales técnicos y análisis junto a tus compañeros de clase.', icon: MessageSquare },
                    { title: 'Videoteca & Recursos', desc: 'Colección de guías, plantillas de alta precisión y descargas autorizadas.', icon: BookMarked },
                    { title: 'Canales de Descuentos', desc: 'Códigos exclusivos y convenios preferenciales con firmas de fondeo.', icon: Tag }
                  ].map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <div id={`pupil-benefit-card-${idx}`} key={idx} className="p-4 bg-[#050505] border border-white/5 rounded-2xl space-y-1">
                        <Icon className="w-5 h-5 text-pink-400 mb-1" />
                        <span className="font-bold text-white block">{p.title}</span>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <a
                    id="tms-join-link-btn"
                    href="https://hotmart.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg cursor-pointer font-sans select-none"
                  >
                    ÚNETE A TMS ↗
                  </a>
                  
                  <div className="text-[10px] text-slate-500 px-3 py-1 bg-[#050505] rounded border border-white/5 font-sans">
                    💡 EVALUACIÓN: Aprueba la cuenta o asigna el rol "Alumno" en el panel de Staff para desbloquearla.
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B.0: UNLOCKED HOTMART PAYMENT WALL */}
            {activeView === 'community_checkout' && (
              <div id="community-payment-wall" className="p-8 bg-[#0A0A0B] border border-white/5 rounded-3xl relative overflow-hidden text-center space-y-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl" />
                
                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex p-3 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-2xl animate-pulse mb-2">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white tracking-tight">Acceso Exclusivo: Comunidad Mensual VIP</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">No tienes activa tu membresía de la comunidad mensual. Únete hoy mismo a través de Hotmart para desbloquear los canales del chat privado VIP, clases operativas, biblioteca e historial de estrategias exclusivas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-xs text-left font-sans">
                  {[
                    { title: '# trading-vip Discord Chat', desc: 'Canal de debate en vivo con Santi Scalper y el equipo docente.', icon: MessageSquare },
                    { title: 'Clases Mensuales Exclusivas', desc: 'Sesiones semanales Premium Zoom exclusivas de mensualidad.', icon: Video },
                    { title: 'SMC Strategy Library', desc: 'Acceso ilimitado a todos los planos de estrategias ganadoras con candado.', icon: Layers }
                  ].map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <div id={`benefit-card-${idx}`} key={idx} className="p-4 bg-[#050505] border border-white/5 rounded-2xl space-y-1">
                        <Icon className="w-5 h-5 text-pink-400 mb-1" />
                        <span className="font-bold text-white block">{p.title}</span>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <a
                    id="hotmart-link-btn"
                    href="https://hotmart.com/es/marketplace/test-titan-mensualidad"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs transition-colors shadow-lg cursor-pointer font-sans"
                  >
                    CONTRATAR MENSUALIDAD EN HOTMART ↗
                  </a>
                  
                  <div className="text-[10px] text-slate-500 px-3 py-1 bg-[#050505] rounded border border-white/5 font-sans">
                    💡 EVALUACIÓN: Activa la mensualidad con la barra de abajo fácilmente.
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B.1: CHAT COMUNIDAD VIP */}
            {activeView === 'community_chat' && (
              <div id="community-chat-view" className="space-y-4">
                <ChatPanel chatType="comunidad" currentUser={user} />
              </div>
            )}

            {/* VIEW B.2: SESIONES VIP MENSUAL */}
            {activeView === 'community_meetings' && (
              <div id="community-meetings-view" className="space-y-6">
                <div>
                  <h3 className="text-lg font-sans font-bold text-white">Sesiones VIP de Mensualidad</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-mono">REUNIONES DE ALTO IMPACTO EXCLUSIVAS DE SOCIOS</p>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {comunidadMeetings.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500">No hay reuniones privadas para esta semana. Revisa en el chat VIP.</div>
                  ) : (
                    comunidadMeetings.map((m) => (
                      <div id={`com-meet-card-${m.id}`} key={m.id} className="p-5 bg-[#0A0A0B] border border-pink-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <span className="bg-pink-600/10 border border-pink-500/20 text-pink-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase font-mono">COMUNIDAD VIP MENSUAL</span>
                          <h4 className="text-base font-bold text-white font-sans">{m.title}</h4>
                          <div className="flex items-center gap-4 text-slate-500 text-[10px] font-mono">
                            <span>📆 {m.date}</span>
                            <span>⏰ {m.time} HORAS</span>
                          </div>
                        </div>

                        <a
                          id={`com-meet-link-btn-${m.id}`}
                          href={m.link}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                        >
                          INGRESAR A LA CLASE VIP <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW B.3: SALÓN DE LA FAMA */}
            {activeView === 'community_hof' && (
              <div id="community-hof-view" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white">Salón de la Fama Titan Master School</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">HISTORIAL DE TRADERS CON RESULTADOS REALES EXCEPCIONALES</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                  {hallOfFame.length === 0 ? (
                    <div className="col-span-2 p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500">El Hall of Fame está temporalmente en proceso de selección trimestral. ¡Sube tu récord hoy mismo!</div>
                  ) : (
                    hallOfFame.map((hof) => (
                      <div id={`hof-card-${hof.id}`} key={hof.id} className="p-6 bg-[#0A0A0B] rounded-3xl border border-white/5 hover:border-purple-500/20 transition-all space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <span className="font-mono text-[9px] text-yellow-500 uppercase font-bold bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/20 block mb-1">{hof.title}</span>
                            <span className="text-base font-bold text-white block">{hof.studentName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-mono block">{hof.date}</span>
                            <span className="text-xs font-mono font-bold text-emerald-400 block">{hof.result}</span>
                          </div>
                        </div>

                        <p className="text-slate-400 text-xs leading-relaxed">{hof.description}</p>

                        {/* Chart simulator placeholder */}
                        <div className="h-28 bg-[#050505] border border-white/5 rounded-xl relative flex items-center justify-center font-mono text-[10px] text-slate-500 overflow-hidden">
                          <div className="absolute inset-0 opacity-15 bg-gradient-to-r from-purple-600 via-pink-500 to-transparent" />
                          <span className="relative z-10 font-sans">📉 Gráfico del Histórico de Fondos</span>
                        </div>

                        {hof.prize && (
                          <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-center gap-2 text-yellow-400 text-xs font-mono">
                            <Award className="w-4 h-4 flex-shrink-0" />
                            <span>Premio Entregado: <strong className="text-white">{hof.prize}</strong></span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VIEW B.4: ESTRATEGIAS DESTACADAS */}
            {activeView === 'community_featured' && (
              <div id="community-featured-view" className="space-y-6">
                <div>
                  <h3 className="text-lg font-sans font-bold text-white">Estrategias Destacadas Académicas</h3>
                </div>

                <div className="space-y-6 text-xs font-sans">
                  {featuredStrategies.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500 font-sans">Todavía no se ha destacado ninguna estrategia esta semana.</div>
                  ) : (
                    [...featuredStrategies]
                      .sort((a, b) => {
                        // Pin first
                        if (a.pinned && !b.pinned) return -1;
                        if (!a.pinned && b.pinned) return 1;
                        // Order Index
                        const oA = a.orderIndex !== undefined ? a.orderIndex : 999;
                        const oB = b.orderIndex !== undefined ? b.orderIndex : 999;
                        if (oA !== oB) return oA - oB;
                        // Newest first
                        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
                      })
                      .map((sf) => {
                        const userMonths = getUserSeniority(user);
                        const meetsSeniority = userMonths >= (sf.requiredMonths || 0);
                        const isBypassed = !!(user?.manualForceUnlock || (user?.manualUnlocks || []).includes(sf.id));
                        const isLocked = !meetsSeniority && !isBypassed;

                        return (
                          <div
                            id={`sf-card-${sf.id}`}
                            key={sf.id}
                            className={`p-6 bg-gradient-to-br from-[#0A0A0B] to-[#050505] border border-white/5 rounded-3xl space-y-4 relative overflow-hidden transition-all duration-300 ${isLocked ? 'border-red-500/10' : 'hover:border-white/10'}`}
                          >
                            {isLocked && (
                              <div className="absolute inset-0 bg-[#000]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 space-y-3">
                                <Lock className="w-8 h-8 text-pink-500 animate-pulse" />
                                <span className="font-extrabold text-white font-sans text-sm tracking-wide uppercase">Contenido Cerrado por Antigüedad</span>
                                <p className="text-[11px] text-slate-400 max-w-sm font-sans leading-relaxed">
                                  Esta estrategia requiere un mínimo de <strong className="text-pink-400 font-mono">{sf.requiredMonths} {sf.requiredMonths === 1 ? 'Mes' : 'Meses'}</strong> de membresía constante en la academia para ser desbloqueada.
                                </p>
                                <div className="text-[9px] bg-[#0A0A0B] border border-white/5 text-slate-500 py-1 px-2.5 rounded font-mono uppercase">
                                  Tu antigüedad actual: {userMonths} {userMonths === 1 ? 'Mes' : 'Meses'}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
                              <div>
                                <span className="text-pink-400 text-[9px] font-mono font-bold uppercase flex items-center gap-1.5 tracking-wider">
                                  {sf.pinned && <Pin className="w-3.5 h-3.5 text-pink-400 rotate-45" />}
                                  MÉTODO DESTACADO
                                  {sf.requiredMonths !== undefined && sf.requiredMonths > 0 && (
                                    <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-1 py-0.5 rounded font-mono font-semibold uppercase">Exige {sf.requiredMonths} {sf.requiredMonths === 1 ? 'Mes' : 'Meses'}</span>
                                  )}
                                </span>
                                <h4 className="text-lg font-bold text-white block mt-1 font-sans">{sf.name}</h4>
                              </div>
                              <div className="text-right font-mono text-[10px] text-slate-500">
                                <span>Autor: {sf.author || 'Mesa Académica'}</span>
                                {sf.date && <span className="block">Fecha: {sf.date}</span>}
                              </div>
                            </div>

                            <p className="text-slate-350 text-xs leading-relaxed">{sf.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="p-3 bg-[#050505] border border-white/5 rounded-xl">
                                <span className="text-pink-400 font-bold block mb-1 uppercase text-[10px]">Parámetros Clave:</span>
                                <span className="text-slate-400 text-[11px] font-medium leading-relaxed">{sf.parameters}</span>
                              </div>
                              {sf.comments && (
                                <div className="p-3 bg-[#050505] border border-white/5 rounded-xl">
                                  <span className="text-purple-400 font-bold block mb-1 uppercase text-[10px]">Comentarios del Staff:</span>
                                  <span className="text-slate-400 text-[11px] leading-relaxed italic">"{sf.comments}"</span>
                                </div>
                              )}
                            </div>

                            {/* Beautiful simulation trading wave chart */}
                            <div className="h-32 bg-[#050505] border border-white/5 rounded-xl relative flex items-center justify-center font-mono text-[10px] text-slate-500 overflow-hidden">
                              <div className="absolute inset-0 opacity-15 bg-gradient-to-r from-purple-600 via-pink-500 to-transparent" />
                              <span className="relative z-10 font-sans">📊 Histograma de Ratio de Beneficio</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* VIEW B.5: BIBLIOTECA DE ESTRATEGIAS HISTÓRICAS */}
            {activeView === 'community_library' && (
              <div id="community-library-view" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0B] border border-white/5 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-purple-400" /> Biblioteca de Estrategias Ganadoras Históricas</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">RECURSOS DESBLOQUEABLES SEGÚN TU ANTIGÜEDAD ACADÉMICA (MESES)</p>
                  </div>

                  <div className="px-3.5 py-1.5 bg-[#050505] border border-purple-500/20 rounded-xl text-xs font-mono text-center flex items-center gap-2 text-purple-400">
                    <Clock className="w-4 h-4 animate-spin text-pink-400" />
                    <span>Tu antigüedad simulada: <strong>{simulatedMonths} {simulatedMonths === 1 ? 'Mes' : 'Meses'}</strong></span>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-sans">
                  {historicalStrategies.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500 font-mono">La biblioteca se está cargando...</div>
                  ) : (
                    historicalStrategies.map((sh) => {
                      const isBypassed = (user.manualUnlocks || []).includes(String(sh.requiredMonths));
                      const isLocked = simulatedMonths < sh.requiredMonths && !isBypassed;
                      
                      return (
                        <div
                          id={`hist-strat-card-${sh.id}`}
                          key={sh.id}
                          className={`p-5 rounded-3xl border transition-all relative overflow-hidden ${
                            isLocked 
                            ? 'bg-[#0A0A0B]/20 border-white/5 opacity-60' 
                            : 'bg-[#0A0A0B] border-white/5 hover:border-white/10'
                          }`}
                        >
                          {isLocked && (
                            <div className="absolute inset-0 bg-[#000]/65 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 space-y-2">
                              <Lock className="w-6 h-6 text-pink-500 animate-bounce" />
                              <span className="font-bold text-white font-sans text-sm">Biblioteca Cerrada</span>
                              <p className="text-[11px] text-slate-400 max-w-sm">Esta estrategia está disponible a partir del mes {sh.requiredMonths} de permanencia con nosotros. (Simula {sh.requiredMonths} meses en la barra lateral o solicita al administrador un bypass para verla inmediatamente)</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
                            <div>
                              <span className="text-purple-400 text-[9px] font-bold font-mono tracking-wider uppercase block">ESTRATEGIA HISTÓRICA — MES {sh.requiredMonths}</span>
                              <h4 className="text-base font-bold text-white block mt-0.5 font-sans">{sh.name}</h4>
                            </div>
                            <div className="text-right font-mono text-[10.5px]">
                              <span className="text-slate-500 block">Autor: {sh.author || 'Senior Advisor'}</span>
                              <span className="text-emerald-400 font-bold block">Histórico: {sh.result || 'Práctico'}</span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <p className="text-slate-400 text-xs leading-relaxed font-sans">{sh.description}</p>
                            <div className="p-3 bg-[#050505] rounded-xl font-mono text-[11px] border border-white/5 text-slate-400">
                              <strong className="text-purple-400 text-[10px] block uppercase mb-1">Métricas Técnicas:</strong>
                              {sh.parameters}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VIEW C.1: CENTRO DE ADMINISTRACIÓN */}
            {activeView === 'admin_view' && ['administrador', 'colaborador'].includes(user.role || '') && (
              <AdminPanel currentUser={user} />
            )}

          </main>
        </div>

      </div>

      {/* FLOATING SIMULATOR BAR FOOTER FOR SIMPLE TESTING */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-6 pb-12">
        {user?.role === 'administrador' && (
          <ControlPanel 
            currentUser={user} 
            onChangeUserRole={handleSimulatedRoleChange}
            onChangeMensualidad={handleSimulatedSubscriptionToggle}
            isFirebase={isFirebaseConfigured}
          />
        )}
        <div className="text-center mt-6 text-[11px] text-gray-400 font-sans space-y-1">
          <div>Titan Master School · Todos los derechos reservados</div>
          <div className="text-[10px] text-gray-500">
            Diseñado y desarrollado por <a href="https://presenciadenegocio.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 font-medium transition-colors underline decoration-dotted">PresenciaDeNegocio.com</a>
          </div>
        </div>
      </footer>

      {/* USER PROFILE EDITOR MODAL WINDOW */}
      {isEditingProfile && (
        <div id="profile-editor-backdrop" className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <form 
            onSubmit={handleSaveProfile} 
            className="w-full max-w-md bg-[#0A0A0B] border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 bg-white/[0.02] border-l border-b border-white/5 uppercase font-mono text-[9px] text-zinc-500">
              Settings Panel
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Configura tu Perfil de Alumno</h3>
              <p className="text-[10px] text-zinc-550 leading-relaxed font-sans">Cambia tu nombre en la academia o sube una foto / utiliza un avatar institucional.</p>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Input for displayName */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold font-sans">Nombre de la Matrícula</label>
                <input
                  id="profile-name-edit-input"
                  type="text"
                  required
                  placeholder="Nombre..."
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full bg-[#050505] border border-white/5 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              {/* Input for avatarUrl */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold font-sans">URL de la Foto de Perfil</label>
                <input
                  id="profile-avatar-edit-input"
                  type="url"
                  placeholder="https://images.unsplash.com/... o presiona un avatar abajo"
                  value={profileAvatarInput}
                  onChange={(e) => setProfileAvatarInput(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                />
              </div>

              {/* Quick Stock presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">Avatares Recomendados</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '🦁 León', url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=120&auto=format&fit=crop&q=60' },
                    { label: '🐂 Toro', url: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=120&auto=format&fit=crop&q=60' },
                    { label: '🐺 Lobo', url: 'https://images.unsplash.com/photo-1590424753858-3b6b192f59f4?w=120&auto=format&fit=crop&q=60' },
                    { label: '🦅 Halcón', url: 'https://images.unsplash.com/photo-1480044965905-02098d419e96?w=120&auto=format&fit=crop&q=60' }
                  ].map((pres, i) => (
                    <button
                      id={`preset-avatar-${i}`}
                      key={pres.label}
                      type="button"
                      onClick={() => setProfileAvatarInput(pres.url)}
                      className={`p-1.5 bg-[#050505] border border-white/5 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group transition-all text-[9.5px] ${profileAvatarInput === pres.url ? 'border-purple-500 bg-purple-500/5' : ''}`}
                    >
                      <img 
                        src={pres.url} 
                        alt={pres.label} 
                        className="w-7 h-7 rounded-full object-cover group-hover:scale-105 transition-transform" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[8px] text-zinc-400">{pres.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 text-xs">
              <button
                id="profile-editor-cancel"
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-white/5 rounded-xl transition-colors cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                id="profile-editor-save"
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-500/10"
              >
                GUARDAR CAMBIOS
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
