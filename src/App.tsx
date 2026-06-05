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
  Plus,
  Edit3,
  Trash2,
  Pin,
  X,
  Trophy,
  Calculator,
  TrendingUp,
  Star,
  FileText,
  Camera,
  Lightbulb
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
  ToolTopic,
  ChatChannel,
  FundingCompany,
  DashboardTexts
} from './types';
import { DataAPI, DEFAULT_DASHBOARD_TEXTS } from './lib/db';
import { isFirebaseConfigured } from './firebase';
import { optimizeAndUploadAvatar } from './lib/imageOptimizer';

import CalculadoraLotes from './components/CalculadoraLotes';
import CalculadoraApalancamiento from './components/CalculadoraApalancamiento';
import ControlPanel from './components/ControlPanel';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import RecursosBoard from './components/RecursosBoard';
import HerramientasBoard from './components/HerramientasBoard';
import CategorizedPanel from './components/CategorizedPanel';

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

export const formatChannelName = (item: { id: string; name: string }): string => {
  let cleanName = item.name || '';
  if (cleanName.startsWith('#')) {
    cleanName = cleanName.slice(1).trim();
  }
  return cleanName;
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
  const profileFileRef = React.useRef<HTMLInputElement>(null);
  const [profileDragActive, setProfileDragActive] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleProfileImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, WEBP).');
      return;
    }
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      const url = await optimizeAndUploadAvatar(file, user.uid);
      setProfileAvatarInput(url);
    } catch (err: any) {
      alert('Error al optimizar y subir imagen: ' + (err?.message || String(err)));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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

  // Dynamic Channel state & FundingCompany state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [companies, setCompanies] = useState<FundingCompany[]>([]);
  
  // Dashboard & global customized text states
  const [dashboardTexts, setDashboardTexts] = useState<DashboardTexts>(DEFAULT_DASHBOARD_TEXTS);
  const [editingTextKey, setEditingTextKey] = useState<keyof DashboardTexts | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  // Dropdown selectors for partners on main dashboard
  const [dashCompany1Id, setDashCompany1Id] = useState<string>(() => localStorage.getItem('TM_dashCompany1Id') || '');
  const [dashCompany2Id, setDashCompany2Id] = useState<string>(() => localStorage.getItem('TM_dashCompany2Id') || '');

  // Channel Creation/Modification modal states
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [formChannelName, setFormChannelName] = useState('');
  const [formChannelCategory, setFormChannelCategory] = useState<'alumno' | 'comunidad'>('alumno');
  const [formChannelType, setFormChannelType] = useState<any>('chat');
  const [formChannelPinned, setFormChannelPinned] = useState(false);
  const [formChannelOrder, setFormChannelOrder] = useState(0);
  const [formChannelOnlyStaff, setFormChannelOnlyStaff] = useState(false);
  const [formChannelIconKey, setFormChannelIconKey] = useState<string>('chat');
  const [formChannelAllowedRoles, setFormChannelAllowedRoles] = useState<UserRole[]>([]);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false);

  // Global lookup mapping keys to Lucide React icons
  const ICON_GALLERY: Record<string, { label: string; icon: any }> = {
    chat: { label: '💬 Chat', icon: MessageSquare },
    libro: { label: '📚 Libro', icon: BookOpen },
    herramienta: { label: '🛠️ Herramienta', icon: Wrench },
    trofeo: { label: '🏆 Trofeo', icon: Trophy },
    campana: { label: '🔔 Campana', icon: Bell },
    calculadora: { label: '🧮 Calculadora', icon: Calculator },
    grafico: { label: '📈 Gráfico', icon: TrendingUp },
    fuego: { label: '🔥 Fuego', icon: Flame },
    estrella: { label: '⭐ Estrella', icon: Star },
    archivo: { label: '📄 Archivo', icon: FileText },
    candado: { label: '🔒 Candado', icon: Lock },
    camara: { label: '📷 Cámara', icon: Camera },
    luces: { label: '💡 Idea / Foco', icon: Lightbulb },
    reunion: { label: '📹 Reunión', icon: Video },
    corona: { label: '👑 Corona', icon: Award },
    info: { label: 'ℹ️ Información', icon: Info },
  };

  // Helpers matching dynamic channel structure of Discord
  const getChannelIcon = (type?: string, iconKey?: string) => {
    if (iconKey && ICON_GALLERY[iconKey]) {
      return ICON_GALLERY[iconKey].icon;
    }
    switch (type) {
      case 'chat': return MessageSquare;
      case 'resources': return BookMarked;
      case 'tools': return Wrench;
      case 'discounts': return Tag;
      case 'meetings': return Video;
      case 'notices': return Info;
      case 'hof': return Award;
      case 'featured': return Flame;
      case 'library': return Layers;
      default: return MessageSquare;
    }
  };

  const canUserAccessChannel = (chan: ChatChannel) => {
    const userRole = user?.role || 'none';
    
    // Custom allowed roles configuration per Channel (Apartado)
    if (chan.allowedRoles && chan.allowedRoles.length > 0) {
      return chan.allowedRoles.includes(userRole as any);
    }

    const isSinRol = !user?.role || user?.role === 'none';
    if (isSinRol) {
      return chan.type === 'tools' || chan.id === 'pupil_panel';
    }
    if (chan.category === 'comunidad') {
      const hasPayingAccess = !!(user?.subscription || user?.mensualidadActive || ['administrador', 'colaborador', 'moderador', 'veterano', 'old_school'].includes(user?.role || ''));
      return hasPayingAccess;
    }
    return true;
  };

  const handleChannelClick = (chan: ChatChannel) => {
    setActiveView(chan.id);
  };

  const handleOpenAddChannel = (category: 'alumno' | 'comunidad') => {
    setEditingChannel(null);
    setFormChannelName('');
    setFormChannelCategory(category);
    setFormChannelType('chat');
    setFormChannelPinned(false);
    setFormChannelOrder(channels.filter(c => c.category === category).length);
    setFormChannelOnlyStaff(false);
    setFormChannelIconKey('chat');
    setFormChannelAllowedRoles([]);
    setConfirmDeleteChannel(false);
    setShowChannelModal(true);
  };

  const handleOpenEditChannel = (chan: ChatChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(chan);
    setFormChannelName(chan.name);
    setFormChannelCategory(chan.category as any);
    setFormChannelType(chan.type || 'chat');
    setFormChannelPinned(!!chan.pinned);
    setFormChannelOrder(chan.orderIndex !== undefined ? chan.orderIndex : 0);
    setFormChannelOnlyStaff(!!chan.onlyStaffCanWrite);
    setFormChannelIconKey(chan.iconKey || 'chat');
    setFormChannelAllowedRoles(chan.allowedRoles || []);
    setConfirmDeleteChannel(false);
    setShowChannelModal(true);
  };

  const handleSaveChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChannelName.trim()) return;

    const id = editingChannel ? editingChannel.id : 'chan_' + Math.random().toString(36).substr(2, 9);
    const saved: ChatChannel = {
      id,
      name: formChannelName.trim(),
      category: formChannelCategory,
      type: formChannelType,
      pinned: formChannelPinned,
      orderIndex: Number(formChannelOrder),
      onlyStaffCanWrite: formChannelOnlyStaff,
      iconKey: formChannelIconKey,
      allowedRoles: formChannelAllowedRoles,
      createdAt: editingChannel ? editingChannel.createdAt : new Date().toISOString()
    };

    await DataAPI.saveChatChannel(saved);
    setShowChannelModal(false);
    setActiveView(id);
    loadGlobalCollections();
  };

  const handleOpenEditText = (key: keyof DashboardTexts, currentValue: string) => {
    setEditingTextKey(key);
    setEditingTextValue(currentValue);
  };

  const handleSaveTextValue = async () => {
    if (!editingTextKey) return;
    const updated = {
      ...dashboardTexts,
      [editingTextKey]: editingTextValue
    };
    setDashboardTexts(updated);
    await DataAPI.saveDashboardTexts(updated);
    setEditingTextKey(null);
    loadGlobalCollections();
  };

  const renderEditableText = (key: keyof DashboardTexts, textClass: string = '', wrapperElement: string = 'span') => {
    const value = dashboardTexts?.[key] || DEFAULT_DASHBOARD_TEXTS[key] || '';
    const isStaff = ['administrador', 'colaborador'].includes(user?.role || '');

    if (!isStaff) {
      if (wrapperElement === 'p') return <p className={textClass}>{value}</p>;
      if (wrapperElement === 'h1') return <h1 className={textClass}>{value}</h1>;
      if (wrapperElement === 'h2') return <h2 className={textClass}>{value}</h2>;
      if (wrapperElement === 'h3') return <h3 className={textClass}>{value}</h3>;
      return <span className={textClass}>{value}</span>;
    }

    const triggerEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleOpenEditText(key, value);
    };

    return (
      <span className={`group relative inline-block max-w-full ${textClass}`}>
        <span>{value}</span>
        <button
          onClick={triggerEdit}
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 inline-flex items-center text-purple-400 bg-white/5 hover:bg-white/10 rounded-md cursor-pointer align-middle"
          title="Editar Texto"
        >
          <Edit3 className="w-2.5 h-2.5" />
        </button>
      </span>
    );
  };

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
      const [m, n, t, d, h, f, hi, r, tt, comp, chans, textConfig] = await Promise.all([
        DataAPI.getMeetings(),
        DataAPI.getNotices(),
        DataAPI.getTools(),
        DataAPI.getDiscounts(),
        DataAPI.getHallOfFame(),
        DataAPI.getStrategiesFeatured(),
        DataAPI.getStrategiesHistorical(),
        DataAPI.getResourceTopics(),
        DataAPI.getToolTopics(),
        DataAPI.getFundingCompanies(),
        DataAPI.getChatChannels(),
        DataAPI.getDashboardTexts()
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
      setCompanies(comp);
      setChannels(chans);
      if (textConfig) {
        setDashboardTexts(textConfig);
      }
    } catch (err) {
      console.error("Failed to load generic data", err);
    }
  };

  useEffect(() => {
    if (companies.length > 0) {
      const active1Id = localStorage.getItem('TM_dashCompany1Id') || dashCompany1Id;
      const active2Id = localStorage.getItem('TM_dashCompany2Id') || dashCompany2Id;
      const validCompany1 = companies.some(c => c.id === active1Id);
      const validCompany2 = companies.some(c => c.id === active2Id);

      if (!active1Id || !validCompany1) {
        const val = companies[0].id;
        setDashCompany1Id(val);
        localStorage.setItem('TM_dashCompany1Id', val);
      } else if (dashCompany1Id !== active1Id) {
        setDashCompany1Id(active1Id);
      }

      if (!active2Id || !validCompany2) {
        const val = companies[1]?.id || companies[0].id;
        setDashCompany2Id(val);
        localStorage.setItem('TM_dashCompany2Id', val);
      } else if (dashCompany2Id !== active2Id) {
        setDashCompany2Id(active2Id);
      }
    } else {
      if (dashCompany1Id) setDashCompany1Id('');
      if (dashCompany2Id) setDashCompany2Id('');
    }
  }, [companies, dashCompany1Id, dashCompany2Id]);

  // Subscribe to dynamic Discord-style channels list in real-time
  useEffect(() => {
    if (!user) return;
    const unsub = DataAPI.subscribeChatChannels((list) => {
      setChannels(list);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

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

  // Reset scroll to top on active section changes as requested
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeView]);

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
  const hasPayingAccess = ['administrador', 'colaborador'].includes(user?.role || '') || (['miembro', 'veterano', 'old_school', 'moderador'].includes(user?.role || '') && !!(user?.subscription || user?.mensualidadActive));

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

  // Find current active channel definition
  const activeChannel = channels.find(c => c.id === activeView);

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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <aside className="md:col-span-3 space-y-6">
            
            {/* SECCIÓN A: ALUMNO NAV */}
            <div className="bg-[#0A0A0B] border border-white/5 p-4 rounded-2xl space-y-2">
              <div className="px-2.5 pb-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">Sección Alumno</span>
                  {['administrador', 'colaborador'].includes(user?.role || '') && (
                    <button
                      onClick={() => handleOpenAddChannel('alumno')}
                      className="p-1 text-slate-500 hover:text-purple-400 rounded hover:bg-white/5 transition-all cursor-pointer inline-flex items-center"
                      title="Crear Apartado Alumno"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className={`text-[9px] py-0.5 px-1.5 rounded uppercase font-mono font-bold ${
                  isSinRol 
                  ? 'bg-[#121214] border border-white/5 text-slate-400' 
                  : 'bg-purple-500/10 border border-purple-500/25 text-purple-400'
                }`}>
                  {isSinRol ? 'Bloqueado' : 'Abierto'}
                </span>
              </div>

              <nav className="space-y-1 pt-2">
                <button
                  id="nav-pupil_panel"
                  onClick={() => setActiveView('pupil_panel')}
                  className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'pupil_panel' 
                    ? 'bg-white/5 text-white border border-white/5 shadow-md shadow-purple-500/5' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    Panel principal
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>

                {channels.filter(c => c.category === 'alumno').map((item) => {
                  const Icon = getChannelIcon(item.type, item.iconKey);
                  const isSelected = activeView === item.id;
                  const canAccess = canUserAccessChannel(item);
                  if (!canAccess) return null;

                  return (
                    <button
                      id={`nav-${item.id}`}
                      key={item.id}
                      onClick={() => handleChannelClick(item)}
                      className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected 
                        ? 'bg-white/5 text-white border border-white/5 shadow-md shadow-purple-500/5' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="break-words">{formatChannelName(item)}</span>
                        {item.pinned && <Pin className="w-2.5 h-2.5 text-yellow-500 shrink-0 rotate-45" />}
                      </span>
                      <div className="flex items-center gap-1">
                        {['administrador', 'colaborador'].includes(user?.role || '') && (
                          <span
                            onClick={(e) => handleOpenEditChannel(item, e)}
                            className="p-1 text-slate-600 hover:text-white rounded hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                            title="Editar Canal"
                          >
                            <Settings className="w-3 h-3" />
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
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
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-550 font-mono font-bold tracking-widest uppercase">COMUNIDAD</span>
                    {['administrador', 'colaborador'].includes(user?.role || '') && (
                      <button
                        onClick={() => handleOpenAddChannel('comunidad')}
                        className="p-1 text-slate-500 hover:text-pink-400 rounded hover:bg-white/5 transition-all cursor-pointer inline-flex items-center"
                        title="Crear Apartado Comunidad"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
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
                    channels.filter(c => c.category === 'comunidad').map((item) => {
                      const Icon = getChannelIcon(item.type, item.iconKey);
                      const isSelected = activeView === item.id;
                      const canAccess = canUserAccessChannel(item);
                      if (!canAccess) return null;

                      return (
                        <button
                          id={`nav-${item.id}`}
                          key={item.id}
                          onClick={() => handleChannelClick(item)}
                          className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-between transition-all cursor-pointer group ${
                            isSelected 
                            ? 'bg-white/5 text-white border border-white/5 shadow-md shadow-pink-500/5' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0 flex-1">
                            <Icon className="w-4 h-4 text-pink-400 shrink-0" />
                            <span className="break-words">{formatChannelName(item)}</span>
                            {item.pinned && <Pin className="w-2.5 h-2.5 text-yellow-500 shrink-0 rotate-45" />}
                          </span>
                          <div className="flex items-center gap-1">
                            {['administrador', 'colaborador'].includes(user?.role || '') && (
                              <span
                                onClick={(e) => handleOpenEditChannel(item, e)}
                                className="p-1 text-slate-600 hover:text-white rounded hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                                title="Editar Canal"
                              >
                                <Settings className="w-3 h-3" />
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      id="nav-join-community-private"
                      onClick={() => setActiveView('community_checkout')}
                      className="w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer border border-[#f43f5e]/15 bg-[#f43f5e]/5 text-pink-405 hover:bg-[#f43f5e]/10 shadow-md shadow-pink-500/5"
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



          </aside>

          {/* RIGHT SIDE WORKSPACE VIEWPORT */}
          <main className={`${['admin_view'].includes(activeView) ? 'md:col-span-12' : 'md:col-span-9'} space-y-8`}>
            
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
                  
                  <div className="space-y-3 relative z-10 text-left">
                    <div>
                      <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-widest block mb-1">Bienvenido de vuelta a</span>
                      <h1 className="text-3xl md:text-4xl font-black font-heading text-white tracking-tight uppercase leading-none">
                        {renderEditableText('bienvenidoTitle', '', 'span')}
                      </h1>
                      <div className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 tracking-tight mt-1">
                        {user.displayName}
                      </div>
                    </div>
                    <div className="text-slate-350 text-xs leading-relaxed max-w-xl font-sans mt-2">
                      {renderEditableText('bienvenidoSubtitle', '', 'span')}
                    </div>
                  </div>
                </div>

                {/* Dashboard Stats Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{renderEditableText('proximasClasesTitle', '', 'span')}</span>
                    <div className="text-lg font-bold text-white font-sans">{alumnoMeetings.length} Sesiones Libres</div>
                    <p className="text-[10px] text-slate-550">{renderEditableText('proximasClasesDesc', '', 'span')}</p>
                  </div>

                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{renderEditableText('estatusSuscripcionTitle', '', 'span')}</span>
                    <div className={`text-lg font-bold font-sans ${user.mensualidadActive ? 'text-emerald-400' : 'text-pink-400'}`}>
                      {user.mensualidadActive ? 'Activa' : 'No activa'}
                    </div>
                    <p className="text-[10px] text-slate-550 font-sans">{renderEditableText('estatusSuscripcionDesc', '', 'span')}</p>
                  </div>

                  <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-1 shadow-sm text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{renderEditableText('canalChatTitle', '', 'span')}</span>
                    <div className="text-lg font-bold text-purple-400 font-sans">{renderEditableText('canalChatName', '', 'span')}</div>
                    <p className="text-[10px] text-slate-550">{renderEditableText('canalChatDesc', '', 'span')}</p>
                  </div>
                </div>

                {/* Grid layout containing Recent Urgent alerts and Quick Lot size calculator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                  
                  {/* Urgent notices widget */}
                  <div className="p-5 bg-pink-500/5 border border-pink-500/10 rounded-2xl space-y-3 text-left">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-pink-500/10">
                      <ShieldAlert className="w-4 h-4 text-pink-400 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        {renderEditableText('avisosUrgentesTitle', '', 'span')}
                      </span>
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
                  <div className="p-5 bg-[#0A0A0B] border border-white/5 rounded-2xl space-y-3 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                        <Wrench className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          {renderEditableText('herramientaRapidaTitle', '', 'span')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed mt-2 font-sans">
                        {renderEditableText('herramientaRapidaDesc', '', 'span')}
                      </p>
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
                <div className="bg-[#0A0A0B] border border-white/5 p-5 rounded-2xl space-y-4 font-sans">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-white/5 text-left">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {renderEditableText('conveniosTitle', '', 'span')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companies.length === 0 ? (
                      <div className="col-span-2 text-center py-6 text-zinc-500 text-xs font-sans">
                        No hay partners de fondeo registrados por el momento.
                      </div>
                    ) : (
                      [
                        { 
                          selectedId: dashCompany1Id, 
                          setSelectedId: (val: string) => {
                            setDashCompany1Id(val);
                            localStorage.setItem('TM_dashCompany1Id', val);
                          }, 
                          label: 'Cupo Superior' 
                        },
                        { 
                          selectedId: dashCompany2Id, 
                          setSelectedId: (val: string) => {
                            setDashCompany2Id(val);
                            localStorage.setItem('TM_dashCompany2Id', val);
                          }, 
                          label: 'Cupo Inferior' 
                        }
                      ].map((slot, index) => {
                        const c = companies.find(item => item.id === slot.selectedId) || companies[index] || companies[0];
                        if (!c) return null;
                        const isStaff = ['administrador', 'colaborador'].includes(user?.role || '');

                        return (
                          <div id={`funding-company-card-${c.id}`} key={index} className="p-4 bg-zinc-950/50 border border-zinc-900 rounded-xl flex flex-col justify-between space-y-4 text-left relative group">
                            <div>
                              <div className="flex items-center gap-2.5 mb-2.5">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold font-mono text-xs shadow-[0_0_8px_rgba(239,68,68,0.1)] shrink-0">
                                  {c.name ? c.name.charAt(0) : 'P'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-black text-rose-450 font-sans tracking-wide uppercase block truncate">{c.name}</span>
                                  <span className="text-[8px] text-zinc-500 font-mono block">PARTNER OFICIAL</span>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase font-mono bg-rose-500/10 text-rose-400 shrink-0">
                                  {c.coupon}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                                {c.description}
                              </p>
                            </div>

                            {/* Staff Dropdown Switcher */}
                            {isStaff && (
                              <div className="pt-2 border-t border-white/5 space-y-1">
                                <span className="text-[9px] text-purple-400 font-mono uppercase block font-bold">Cambiar empresa ({slot.label}):</span>
                                <select
                                  value={slot.selectedId}
                                  onChange={(e) => slot.setSelectedId(e.target.value)}
                                  className="w-full bg-[#121214] border border-white/5 rounded-lg py-1 px-2 text-[10px] text-slate-300 focus:outline-none focus:border-purple-550"
                                >
                                  {companies.map(com => (
                                    <option key={com.id} value={com.id}>{com.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between border-t border-white/5 gap-2">
                              {c.code ? (
                                <>
                                  <span className="text-[10px] text-zinc-500 font-mono">Código: <strong className="text-white selection:bg-pink-400 font-mono">{c.code}</strong></span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.code!);
                                      alert(`¡Código de descuento "${c.code}" copiado!`);
                                    }}
                                    className="px-2.5 py-1 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-550/20 cursor-pointer transition-all"
                                  >
                                    Copiar
                                  </button>
                                </>
                              ) : (
                                <a 
                                  href={c.link || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full py-1.5 px-3 bg-[#E5AA00] hover:bg-[#D59A00] text-black rounded-lg text-[10px] font-bold uppercase text-center block transition-all hover:scale-[1.01]"
                                >
                                  Web Oficial ↗
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* VIEW A.2: CHAT GENERAL / DYNAMIC CHAT */}
            {(activeView === 'pupil_chat' || activeView === 'community_chat' || (activeChannel && activeChannel.type === 'chat')) && (() => {
              const chan = activeChannel || channels.find(c => c.id === activeView);
              const isDynamic = !!activeChannel && activeChannel.type === 'chat';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'chatGeneralTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'chatGeneralSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'CANAL DE COMUNICACIÓN Y PLANIFICACIÓN TÉCNICA';
              }

              return (
                <div id="pupil-chat-view-container" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
                  </div>
                  {chan ? (
                    <CategorizedPanel 
                      parentChannel={chan} 
                      currentUser={user} 
                      onRefreshParentChannels={loadGlobalCollections} 
                    />
                  ) : (
                    <ChatPanel 
                      chatType={activeChannel?.category === 'comunidad' ? 'comunidad' : activeView === 'community_chat' ? 'comunidad' : 'alumno'} 
                      currentUser={user} 
                      channelId={activeChannel?.id} 
                    />
                  )}
                </div>
              );
            })()}

            {/* VIEW A.3: RECURSOS / DYNAMIC RESOURCES */}
            {activeView === 'pupil_resources' && (
              <div id="pupil-resources-view" className="space-y-6">
                <div>
                  <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                    {renderEditableText('recursosTitle', '', 'span')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                    {renderEditableText('recursosSubtitle', '', 'span')}
                  </p>
                </div>
                <RecursosBoard 
                  currentUser={user} 
                  resourceTopics={resourceTopics} 
                  onRefresh={loadGlobalCollections} 
                  channelId={activeChannel?.id}
                  channelName={activeChannel?.name}
                  onlyStaffCanWrite={!!activeChannel?.onlyStaffCanWrite}
                />
              </div>
            )}

            {/* DYNAMIC TEMPLATE FOR RESOURCES (FOR APARTADOS CREATED BY ADMIN) */}
            {activeChannel && activeChannel.type === 'resources' && activeView !== 'pupil_resources' && (() => {
              const titleKey = `channel_title_${activeChannel.id}`;
              const descKey = `channel_desc_${activeChannel.id}`;
              
              if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
              if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'TEMAS DE SOPORTE Y DESCARGAS DEL APARTADO';

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
                  </div>
                  <CategorizedPanel 
                    parentChannel={activeChannel} 
                    currentUser={user} 
                    onRefreshParentChannels={loadGlobalCollections} 
                  />
                </div>
              );
            })()}

            {/* VIEW A.4: HERRAMIENTAS / DYNAMIC TOOLS */}
            {(activeView === 'pupil_tools' || (activeChannel && activeChannel.type === 'tools')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.type === 'tools' && activeView !== 'pupil_tools';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'herramientasTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'herramientasSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'HERRAMIENTAS, GUÍAS Y RECURSOS DEL DEBATE';
              }

              return (
                <div id="pupil-tools-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
                  </div>
                  <HerramientasBoard 
                    currentUser={user} 
                    toolTopics={toolTopics} 
                    onRefresh={loadGlobalCollections} 
                    channelId={activeChannel?.id}
                    channelName={activeChannel?.name}
                    onlyStaffCanWrite={!!activeChannel?.onlyStaffCanWrite}
                  />
                </div>
              );
            })()}

            {/* VIEW A.5: DESCUENTOS ACADÉMICOS */}
            {(activeView === 'pupil_discounts' || (activeChannel && activeChannel.type === 'discounts')) && (() => {
              const chan = activeChannel || channels.find(c => c.id === activeView);
              if (chan) {
                const isDynamic = !!activeChannel && activeChannel.id !== 'pupil_discounts';
                const titleKey = isDynamic ? `channel_title_${chan.id}` : 'discountsTitle';
                const descKey = isDynamic ? `channel_desc_${chan.id}` : 'discountsSubtitle';
                
                if (isDynamic) {
                  if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = chan.name;
                  if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'DESCUENTOS Y MATRICULAS EXCLUSIVAS CON CUPONES EXCLUSIVOS';
                }

                return (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                        {renderEditableText(titleKey as any, '', 'span')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                        {renderEditableText(descKey as any, '', 'span')}
                      </p>
                    </div>
                    <CategorizedPanel 
                      parentChannel={chan} 
                      currentUser={user} 
                      onRefreshParentChannels={loadGlobalCollections} 
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* VIEW A.6: SESIONES ZOOM/MEET */}
            {(activeView === 'pupil_meetings' || (activeChannel && activeChannel.type === 'meetings' && activeChannel.category === 'alumno')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'pupil_meetings';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'sesionesTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'sesionesSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'REUNIONES Y SESIONES DE APRENDIZAJE ABIERTO';
              }

              return (
                <div id="pupil-meetings-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
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

                          {m.link.toLowerCase().startsWith('http') || m.link.toLowerCase().includes('.') ? (
                            <a
                              id={`meet-link-btn-${m.id}`}
                              href={m.link.toLowerCase().startsWith('www') ? `https://${m.link}` : m.link}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full sm:w-auto py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                            >
                              INGRESAR A LA CLASE <ArrowUpRight className="w-4 h-4" />
                            </a>
                          ) : (
                            <div className="w-full sm:w-auto py-2 px-4 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono rounded-xl text-center text-[10px] uppercase font-bold tracking-wide">
                              {m.link}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* VIEW A.7: AVISOS IMPORTANTES */}
            {(activeView === 'pupil_notices' || (activeChannel && activeChannel.type === 'notices')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'pupil_notices';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'avisosTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'avisosSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'COMUNICADOS E INFORMACIÓN IMPORTANTE DEL CANAL';
              }

              return (
                <div id="pupil-notices-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
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
              );
            })()}

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


            {/* VIEW B.2: SESIONES VIP MENSUAL */}
            {(activeView === 'community_meetings' || (activeChannel && activeChannel.type === 'meetings' && activeChannel.category === 'comunidad')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'community_meetings';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'sesionesVIPTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'sesionesVIPSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'REUNIONES DE ALTO IMPACTO EXCLUSIVAS';
              }

              return (
                <div id="community-meetings-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
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

                        {m.link.toLowerCase().startsWith('http') || m.link.toLowerCase().includes('.') ? (
                          <a
                            id={`com-meet-link-btn-${m.id}`}
                            href={m.link.toLowerCase().startsWith('www') ? `https://${m.link}` : m.link}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                          >
                            INGRESAR A LA CLASE VIP <ArrowUpRight className="w-4 h-4" />
                          </a>
                        ) : (
                          <div className="w-full sm:w-auto py-2 px-4 bg-zinc-900 border border-zinc-800 text-pink-400 font-mono rounded-xl text-center text-[10px] uppercase font-bold tracking-wide">
                            {m.link}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

            {/* VIEW B.3: SALÓN DE LA FAMA */}
            {(activeView === 'community_hof' || (activeChannel && activeChannel.type === 'hof')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'community_hof';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'hofTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'hofSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'ALUMNOS DESTACADOS POR SUS LOGROS ACADÉMICOS';
              }

              return (
                <div id="community-hof-view" className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                        {renderEditableText(titleKey as any, '', 'span')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                        {renderEditableText(descKey as any, '', 'span')}
                      </p>
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
            );
          })()}

            {/* VIEW B.4: ESTRATEGIAS DESTACADAS */}
            {(activeView === 'community_featured' || (activeChannel && activeChannel.type === 'featured')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'community_featured';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'featuredTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'featuredSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'SISTEMAS Y METODOLOGÍAS DE TRADING DE ALTA PROBABILIDAD';
              }

              return (
                <div id="community-featured-view" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-sans font-bold text-white uppercase tracking-tight">
                      {renderEditableText(titleKey as any, '', 'span')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                      {renderEditableText(descKey as any, '', 'span')}
                    </p>
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
            );
          })()}

            {/* VIEW B.5: BIBLIOTECA DE ESTRATEGIAS HISTÓRICAS */}
            {(activeView === 'community_library' || (activeChannel && activeChannel.type === 'library')) && (() => {
              const isDynamic = !!activeChannel && activeChannel.id !== 'community_library';
              const titleKey = isDynamic ? `channel_title_${activeChannel.id}` : 'historicalTitle';
              const descKey = isDynamic ? `channel_desc_${activeChannel.id}` : 'historicalSubtitle';
              
              if (isDynamic) {
                if (!dashboardTexts[titleKey]) dashboardTexts[titleKey] = activeChannel.name;
                if (!dashboardTexts[descKey]) dashboardTexts[descKey] = 'COLECCIÓN COMPLETA DE ANÁLISIS HISTÓRICOS Y APRENDIZAJE';
              }

              return (
                <div id="community-library-view" className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0B] border border-white/5 p-5 rounded-2xl">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400 shrink-0" />
                        {renderEditableText(titleKey as any, '', 'span')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 uppercase font-mono">
                        {renderEditableText(descKey as any, '', 'span')}
                      </p>
                    </div>
                  </div>

                <div className="space-y-4 text-xs font-sans">
                  {historicalStrategies.length === 0 ? (
                    <div className="p-10 bg-[#0A0A0B] border border-white/5 text-center rounded-2xl text-slate-500 font-mono">La biblioteca se está cargando...</div>
                  ) : (
                    historicalStrategies.map((sh) => {
                      return (
                        <div
                          id={`hist-strat-card-${sh.id}`}
                          key={sh.id}
                          className="p-5 rounded-3xl border border-white/5 bg-[#0A0A0B] hover:border-white/10 transition-all relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
                            <div>
                              <span className="text-purple-400 text-[9px] font-bold font-mono tracking-wider uppercase block">ESTRATEGIA HISTÓRICA</span>
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
            );
          })()}

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

              {/* Input for avatarUrl & File Upload */}
              <div className="space-y-2 text-left">
                <label className="text-zinc-400 font-bold font-sans block">Foto de Perfil / Avatar</label>
                
                <input
                  type="file"
                  ref={profileFileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProfileImageUpload(e.target.files[0]);
                    }
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isUploadingAvatar) setProfileDragActive(true);
                  }}
                  onDragLeave={() => setProfileDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setProfileDragActive(false);
                    if (isUploadingAvatar) return;
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProfileImageUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onPaste={(e) => {
                    if (isUploadingAvatar) return;
                    if (e.clipboardData.files && e.clipboardData.files[0]) {
                      handleProfileImageUpload(e.clipboardData.files[0]);
                    }
                  }}
                  onClick={() => {
                    if (!isUploadingAvatar) profileFileRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    profileDragActive
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-white/10 hover:border-purple-500 bg-[#050505] text-zinc-400 hover:text-white'
                  } ${isUploadingAvatar ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isUploadingAvatar ? (
                    <div className="space-y-1.5 text-center py-2 w-full animate-pulse">
                      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
                      <p className="text-[11px] font-bold text-white">Optimizando y subiendo avatar...</p>
                      <p className="text-[9px] text-zinc-500 font-mono">Formateando a 256x256 px en Storage</p>
                    </div>
                  ) : profileAvatarInput ? (
                    <div className="flex items-center gap-3.5 w-full">
                      <img
                        src={profileAvatarInput}
                        alt="Preview"
                        className="w-12 h-12 rounded-full object-cover border border-purple-500/30 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-xs font-bold text-white block">¡Imagen Cargada!</span>
                        <span className="text-[9px] text-zinc-500 font-mono block">Arrastra otra o haz clic para cambiar</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileAvatarInput('');
                        }}
                        className="text-[10px] text-zinc-500 hover:text-rose-450 font-mono uppercase bg-zinc-900 border border-white/5 rounded-lg px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center py-2 w-full">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto text-purple-400">
                        📁
                      </div>
                      <p className="text-[11px] font-bold text-white">Selecciona o arrastra una imagen</p>
                      <p className="text-[9px] text-zinc-500 font-mono">Soporta JPG, PNG o WEBP. También puedes pegarla.</p>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <span className="text-[9px] text-zinc-500 font-mono">O introduce una enlace URL si lo prefieres:</span>
                  <input
                    id="profile-avatar-edit-input"
                    type="text"
                    placeholder="https://..."
                    value={profileAvatarInput.startsWith('data:') ? '' : profileAvatarInput}
                    onChange={(e) => setProfileAvatarInput(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-2 px-3 mt-1 text-zinc-300 focus:outline-none focus:border-purple-500 font-mono text-[10px]"
                  />
                </div>
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

      {/* CHANNEL EDITOR MODAL */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                {editingChannel ? 'Editar Apartado/Canal' : 'Crear Apartado/Canal'}
              </h3>
              <button 
                onClick={() => setShowChannelModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-all cursor-pointer inline-flex items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChannelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Nombre del Apartado</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Recursos, Psicologia, IA"
                  value={formChannelName}
                  onChange={(e) => setFormChannelName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Sección / Categoría</label>
                  <select
                    value={formChannelCategory}
                    onChange={(e: any) => setFormChannelCategory(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="alumno">Sección Alumno</option>
                    <option value="comunidad">Comunidad</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Tipo de Apartado</label>
                  <select
                    value={formChannelType}
                    onChange={(e: any) => setFormChannelType(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="chat">💬 Tipo Chat</option>
                    <option value="resources">📚 Tipo Recursos</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Icon Key Selection */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Icono del Apartado</label>
                <select
                  value={formChannelIconKey}
                  onChange={(e) => setFormChannelIconKey(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                >
                  {Object.entries(ICON_GALLERY).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Orden del Canal</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={formChannelOrder}
                    onChange={(e) => setFormChannelOrder(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="chan-pinned-chk"
                    checked={formChannelPinned}
                    onChange={(e) => setFormChannelPinned(e.target.checked)}
                    className="accent-purple-500 animate-none shrink-0"
                  />
                  <label htmlFor="chan-pinned-chk" className="text-[10px] text-slate-300 font-mono uppercase font-bold cursor-pointer flex items-center gap-1 select-none">
                    <Pin className="w-3 h-3 text-yellow-500" /> Fijar arriba
                  </label>
                </div>
              </div>

              {/* Scoped Role Permissions Configurator */}
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold text-left block">
                  Permisos de Acceso (Ninguno seleccionado = Público por Defecto)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B]/50 p-3 rounded-2xl border border-white/5 text-left text-xs text-zinc-300">
                  {[
                    { val: 'none', label: 'Sin Rol (Prospecto)' },
                    { val: 'alumno', label: 'Alumno (Libre)' },
                    { val: 'miembro', label: 'Miembro (Comunidad)' },
                    { val: 'veterano', label: 'Veterano (Antiguo)' },
                    { val: 'old_school', label: 'Old School (Comunidad)' },
                    { val: 'moderador', label: 'Moderador (Chat)' },
                    { val: 'colaborador', label: 'Colaborador' },
                    { val: 'administrador', label: 'Administrador' }
                  ].map((robj) => {
                    const isChecked = formChannelAllowedRoles.includes(robj.val as any);
                    return (
                      <label key={robj.val} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormChannelAllowedRoles(formChannelAllowedRoles.filter(r => r !== robj.val));
                            } else {
                              setFormChannelAllowedRoles([...formChannelAllowedRoles, robj.val as any]);
                            }
                          }}
                          className="accent-purple-500 rounded shrink-0"
                        />
                        <span>{robj.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {(formChannelType === 'chat' || formChannelType === 'resources' || formChannelType === 'tools' || formChannelType === 'discounts') && (
                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="chan-onlystaff-chk"
                    checked={formChannelOnlyStaff}
                    onChange={(e) => setFormChannelOnlyStaff(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <label htmlFor="chan-onlystaff-chk" className="text-[10px] text-slate-450 cursor-pointer font-sans leading-tight select-none">
                    🔒 Solo el Staff (Admins/Colaboradores) puede publicar contenido (Modo Solo Lectura para alumnos)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-white/5 pt-4 gap-3">
                {editingChannel ? (
                  !confirmDeleteChannel ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteChannel(true)}
                      className="py-2.5 px-4 bg-rose-950/45 hover:bg-[#881337] text-rose-300 border border-rose-900/40 font-semibold rounded-xl text-xs transition-all cursor-pointer font-sans"
                    >
                      Eliminar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-[#1B0C0E] border border-rose-950 p-1.5 rounded-xl">
                      <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-tight px-1.5">¿Borrar?</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await DataAPI.deleteChatChannel(editingChannel.id);
                          setShowChannelModal(false);
                          setActiveView('pupil_panel');
                          loadGlobalCollections();
                        }}
                        className="py-1.5 px-2.5 bg-red-650 hover:bg-red-600 text-white font-bold rounded-lg text-[10px] uppercase font-sans cursor-pointer transition-all shrink-0"
                      >
                        Sí, Borrar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteChannel(false)}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-350 rounded-lg text-[10px] font-semibold font-sans cursor-pointer transition-all"
                      >
                        No
                      </button>
                    </div>
                  )
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChannelModal(false)}
                    className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-purple-650 to-pink-650 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/10 transition-all cursor-pointer font-sans"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTextKey && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                Editar Parámetro de Texto
              </h3>
              <button 
                onClick={() => setEditingTextKey(null)}
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/5 transition-all cursor-pointer inline-flex items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] text-purple-400 font-mono uppercase block font-bold">Clave del Campo</span>
                <span className="text-xs text-white/50 font-mono block bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/5">
                  {editingTextKey}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Valor de Contenido</label>
                {editingTextValue.length > 50 ? (
                  <textarea
                    rows={4}
                    value={editingTextValue}
                    onChange={(e) => setEditingTextValue(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-secondary focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={editingTextValue}
                    onChange={(e) => setEditingTextValue(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingTextKey(null)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer font-sans"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTextValue}
                className="py-2.5 px-5 bg-gradient-to-r from-purple-650 to-pink-650 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-500/10 transition-all cursor-pointer font-sans"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
