/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  MessageSquare, 
  AlertCircle, 
  Check, 
  Shield, 
  Sparkles, 
  CornerDownRight,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit,
  Settings,
  XCircle,
  Volume2
} from 'lucide-react';
import { ChatMessage, ChatChannel, UserProfile, UserRole } from '../types';
import { DataAPI } from '../lib/db';
import { formatChannelName } from '../App';
import { optimizeAndUploadChatImage } from '../lib/imageOptimizer';

interface ChatPanelProps {
  chatType: 'alumno' | 'comunidad';
  currentUser: UserProfile;
  channelId?: string;
}

export default function ChatPanel({ chatType, currentUser, channelId }: ChatPanelProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [showImageForm, setShowImageForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleImageFileLoad = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingImage(true);
    try {
      const url = await optimizeAndUploadChatImage(file, activeChannelId || chatType);
      setImageInputUrl(url);
      setShowImageForm(true);
    } catch (err: any) {
      alert('Error al optimizar y subir la imagen: ' + (err?.message || String(err)));
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  // Active Thread Reply States
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadText, setThreadText] = useState('');

  // Active channel id
  const [activeChannelId, setActiveChannelId] = useState<string>('pupil_chat');

  // Synchronize active channel from props
  useEffect(() => {
    if (channelId) {
      setActiveChannelId(channelId);
    }
  }, [channelId]);

  // Channel admin states
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  
  // Channel form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Chat·General' | 'Comunidad' | 'Claustro'>('Chat·General');
  const [formOnlyStaff, setFormOnlyStaff] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef<boolean>(true);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [previousMessagesLength, setPreviousMessagesLength] = useState(0);
  const isStaff = ['administrador', 'colaborador', 'moderador'].includes(currentUser.role);

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Load user profiles on mount to resolve current real-time user roles
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await DataAPI.getUsers();
        setUserProfiles(list || []);
      } catch (err) {
        console.error("Error loading user profiles for chat:", err);
      }
    };
    loadUsers();
  }, []);

  // Load Channels dynamically from DataAPI
  const fetchChannels = async () => {
    try {
      const list = await DataAPI.getChatChannels();
      setChannels(list);
      return list;
    } catch (err) {
      console.error("Error al cargar canales:", err);
      return [];
    }
  };

  // On mount, subscribe to channels
  useEffect(() => {
    const unsub = DataAPI.subscribeChatChannels((list) => {
      setChannels(list);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Set default active channel depending on mode
  useEffect(() => {
    if (channelId) return;
    if (channels.length > 0) {
      if (chatType === 'comunidad') {
        const found = channels.find(c => c.id === 'community_chat' || c.category === 'comunidad') || channels[0];
        setActiveChannelId(found.id);
      } else {
        const found = channels.find(c => c.id === 'pupil_chat' || c.category === 'alumno') || channels[0];
        setActiveChannelId(found.id);
      }
    }
  }, [chatType, channels.length, channelId]);

  // Reset thread panel and message errors when channel switches
  useEffect(() => {
    setActiveThreadId(null);
    setError(null);
  }, [activeChannelId]);

  // Synchronize Messages based on active channel
  useEffect(() => {
    if (!activeChannelId) return;
    
    const currentChan = channels.find(ch => ch.id === activeChannelId);
    if (!currentChan) return;

    // Check read permissions
    const canAccess = getHasReadAccess(currentChan.category, currentUser.role);
    if (!canAccess) {
      setMessages([]);
      return;
    }

    const unsub = DataAPI.subscribeMessages(activeChannelId, isStaff, (msgs) => {
      setMessages(msgs);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [activeChannelId, channels, currentUser.role, isStaff]);

  // Reset initial load state when channel changes to ensure it opens scrolled down initially
  useEffect(() => {
    isInitialLoad.current = true;
    setShowNewMessageIndicator(false);
  }, [activeChannelId]);

  // Keep scroll conditionally focused down or display new message indicators
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    if (isInitialLoad.current) {
      el.scrollTop = el.scrollHeight;
      isInitialLoad.current = false;
      setShowNewMessageIndicator(false);
      setPreviousMessagesLength(messages.length);
      return;
    }

    if (messages.length > previousMessagesLength) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isAtBottom) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
        setShowNewMessageIndicator(false);
      } else {
        setShowNewMessageIndicator(true);
      }
    }
    setPreviousMessagesLength(messages.length);
  }, [messages]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isAtBottom) {
      setShowNewMessageIndicator(false);
    }
  };

  // Helper helper to evaluate if a user can read a channel category
  const getHasReadAccess = (category: string, role: UserRole): boolean => {
    if (category === 'Claustro' || category === 'claustro') {
      return ['moderador', 'colaborador', 'administrador'].includes(role);
    }
    if (category === 'Comunidad' || category === 'comunidad') {
      return ['miembro', 'veterano', 'old_school', 'moderador', 'colaborador', 'administrador'].includes(role);
    }
    return ['alumno', 'miembro', 'veterano', 'old_school', 'moderador', 'colaborador', 'administrador'].includes(role);
  };

  // Convert name to slug format (lowercase, replace spaces/unsupported chars with hyphens)
  const sanitizeSlugName = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-');
  };

  // Handler for saving/editing channel
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = sanitizeSlugName(formName);
    if (!sanitizedName) {
      setAlertModal({
        show: true,
        title: "Nombre Inválido",
        message: "Por favor introduce un nombre válido para el canal."
      });
      return;
    }

    try {
      const channelId = editingChannel ? editingChannel.id : 'chan_' + Math.random().toString(36).substr(2, 9);
      const newChannel: ChatChannel = {
        id: channelId,
        name: sanitizedName,
        category: formCategory,
        onlyStaffCanWrite: formOnlyStaff,
        createdAt: editingChannel ? editingChannel.createdAt : new Date().toISOString()
      };

      await DataAPI.saveChatChannel(newChannel);
      
      // Select newly created channel
      if (!editingChannel) {
        setActiveChannelId(channelId);
      }

      // Reset states
      setShowChannelModal(false);
      setEditingChannel(null);
      setFormName('');
      setFormOnlyStaff(false);
      
      // Reload lists
      fetchChannels();
    } catch (err: any) {
      setAlertModal({
        show: true,
        title: "Error al guardar canal",
        message: err?.message || String(err)
      });
    }
  };

  // Handler for deleting channel
  const handleDeleteChannel = async (channelId: string) => {
    setConfirmModal({
      show: true,
      title: "Eliminar canal técnico",
      message: "¿Seguro que quieres eliminar este tema? Esta acción es definitiva y borrará de manera permanente el canal y todos sus contenidos.",
      confirmText: "SÍ, ELIMINAR",
      cancelText: "Atrás",
      onConfirm: async () => {
        try {
          await DataAPI.deleteChatChannel(channelId);
          // Select fallback
          const updated = await fetchChannels();
          const firstGen = updated.find(c => c.category === 'Chat·General') || updated[0];
          if (firstGen) {
            setActiveChannelId(firstGen.id);
          }
        } catch (err: any) {
          setAlertModal({
            show: true,
            title: "Error al eliminar canal",
            message: err?.message || String(err)
          });
        }
        setConfirmModal(null);
      }
    });
  };

  // Setup form for editing
  const startEditChannel = (chan: ChatChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(chan);
    setFormName(chan.name);
    setFormCategory(chan.category);
    setFormOnlyStaff(chan.onlyStaffCanWrite);
    setShowChannelModal(true);
  };

  // Setup form for adding
  const startAddChannel = (category: 'Chat·General' | 'Comunidad' | 'Claustro') => {
    setEditingChannel(null);
    setFormName('');
    setFormCategory(category);
    setFormOnlyStaff(category === 'Claustro' ? true : false);
    setShowChannelModal(true);
  };

  // Input message submittal
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageInputUrl.trim()) return;
    setError(null);

    try {
      await DataAPI.sendChatMessage(
        inputText.trim(), 
        currentUser, 
        chatType,
        activeChannelId,
        imageInputUrl.trim() || undefined
      );
      setInputText('');
      setImageInputUrl('');
      setShowImageForm(false);
    } catch (err: any) {
      console.error("Error al enviar mensaje:", err);
      setError(err?.message || "No se pudo enviar el mensaje.");
    }
  };

  // Thread replies sending
  const handleSendReply = async (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    if (!threadText.trim()) return;
    setError(null);

    try {
      await DataAPI.postChatReply(messageId, threadText.trim(), currentUser);
      setThreadText('');
    } catch (err: any) {
      console.error("Error al enviar respuesta:", err);
      setError(err?.message || "No se pudo enviar la respuesta.");
    }
  };

  // Moderation Handlers
  const handleHideMessage = async (msgId: string) => {
    try {
      await DataAPI.moderateMessage(msgId, 'hide');
    } catch (err: any) {
      setAlertModal({
        show: true,
        title: "Error al ocultar mensaje",
        message: err?.message || String(err)
      });
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setConfirmModal({
      show: true,
      title: "Eliminar mensaje",
      message: "¿Seguro que quieres eliminar este mensaje? Esta acción es definitiva y borrará de manera permanente el mensaje y todas sus respuestas asociadas.",
      confirmText: "SÍ, ELIMINAR",
      cancelText: "Atrás",
      onConfirm: async () => {
        try {
          await DataAPI.moderateMessage(msgId, 'delete');
        } catch (err: any) {
          setAlertModal({
            show: true,
            title: "Error al eliminar mensaje",
            message: err?.message || String(err)
          });
          console.error(err);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleApproveMessage = async (msgId: string) => {
    try {
      const targetMsg = messages.find(m => m.id === msgId);
      if (targetMsg) {
        await DataAPI.sendChatMessage(
          targetMsg.text, 
          {
            uid: targetMsg.userId,
            displayName: targetMsg.userName,
            email: '',
            role: targetMsg.userRole,
            mensualidadActive: true,
            subscription: true,
            approved: true,
            avatarUrl: targetMsg.avatarUrl,
            createdAt: targetMsg.createdAt,
            joinedAt: targetMsg.createdAt
          }, 
          targetMsg.chatType, 
          targetMsg.channelId, 
          targetMsg.imageUrl
        );
        await DataAPI.moderateMessage(msgId, 'delete');
      }
    } catch (err) {
      console.error("Error al aprobar mensaje", err);
    }
  };

  // Dynamic user role and name resolvers to reflect current live status
  const getDynamicUserRole = (userId: string, storedRole: UserRole): UserRole => {
    if (userId === currentUser.uid) {
      return currentUser.role;
    }
    const profile = userProfiles.find(u => u.uid === userId);
    return profile ? profile.role : storedRole;
  };

  const getDynamicUserName = (userId: string, storedName: string): string => {
    if (userId === currentUser.uid) {
      return currentUser.displayName;
    }
    const profile = userProfiles.find(u => u.uid === userId);
    return profile ? profile.displayName : storedName;
  };

  // Roles colors
  const getRoleNameColor = (role: UserRole) => {
    switch (role) {
      case 'administrador': return 'text-rose-400';
      case 'colaborador': return 'text-blue-400';
      case 'moderador': return 'text-purple-400';
      case 'miembro': return 'text-pink-400';
      case 'veterano': return 'text-pink-400 font-semibold';
      case 'old_school': return 'text-orange-400 font-bold';
      default: return 'text-indigo-200';
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'administrador':
        return <span className="bg-rose-500/10 border border-rose-500/30 text-rose-405 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Staff Admin</span>;
      case 'colaborador':
        return <span className="bg-blue-500/10 border border-blue-500/30 text-blue-405 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Colab</span>;
      case 'moderador':
        return <span className="bg-purple-500/10 border border-purple-500/30 text-purple-455 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Mod</span>;
      case 'miembro':
        return <span className="bg-pink-500/10 border border-pink-500/30 text-pink-455 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest text-[8px] font-black">Miembro</span>;
      case 'veterano':
        return <span className="bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 border border-pink-500/35 text-pink-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest text-[8px] font-black">Veterano</span>;
      case 'old_school':
        return <span className="bg-gradient-to-r from-orange-500/15 via-red-500/15 to-amber-500/15 border border-orange-500/35 text-orange-400 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest text-[8px] font-black">Old School</span>;
      default:
        return <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Alumno</span>;
    }
  };

  const renderMessageTextWithMentions = (text: string) => {
    if (!text.includes('@')) return text;
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold px-1 rounded mx-0.5 text-xs">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const activeChannel = channels.find(ch => ch.id === activeChannelId) || {
    id: 'pupil_chat',
    name: 'Chat general',
    category: 'alumno' as any,
    onlyStaffCanWrite: false,
    createdAt: ''
  };

  const activeThreadMessage = messages.find(m => m.id === activeThreadId);
  const hasReadAccess = getHasReadAccess(activeChannel.category, currentUser.role);
  const isReadOnlyChannelForUser = activeChannel.onlyStaffCanWrite && !isStaff;

  // Render Sidebar Left Panel
  const renderLeftSidebar = () => {
    const categories: { label: string; key: 'Chat·General' | 'Comunidad' | 'Claustro' }[] = [
      { label: 'GENERAL', key: 'Chat·General' },
      { label: 'COMUNIDAD', key: 'Comunidad' },
      { label: 'CLAUSTRO INTERNO', key: 'Claustro' }
    ];

    return (
      <div className="hidden md:flex flex-col h-full bg-[#080809] border-r border-white/5 py-3">
        {/* Sidebar Title */}
        <div className="px-4 pb-3 mb-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">SALA DE DEBATES</span>
          {isStaff && (
            <button
              onClick={() => startAddChannel('Chat·General')} 
              className="p-1 hover:bg-white/5 hover:text-purple-400 text-slate-505 rounded-lg transition-all"
              title="Añadir nuevo canal"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories and Channels */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          {categories.map((cat) => {
            // Strict role checking for categories
            if (cat.key === 'Claustro' && !isStaff) return null;

            const catChannels = channels.filter(ch => ch.category === cat.key);

            return (
              <div key={cat.key} className="space-y-1">
                <div className="flex items-center justify-between px-3">
                  <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider uppercase">
                    {cat.label}
                  </span>
                  {isStaff && (
                    <button
                      onClick={() => startAddChannel(cat.key)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded transition-all"
                      style={{ contentVisibility: 'auto' }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {catChannels.map((ch) => {
                    const isSelected = activeChannelId === ch.id;
                    const isAccessible = getHasReadAccess(ch.category, currentUser.role);

                    return (
                      <div
                        id={`sidebar-chan-wrapper-${ch.id}`}
                        key={ch.id}
                        onClick={() => {
                          setActiveChannelId(ch.id);
                          setActiveThreadId(null);
                        }}
                        className={`group/item w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                          isSelected 
                            ? 'bg-purple-600/10 border-purple-500/20 text-white font-bold' 
                            : 'hover:bg-white/[0.02] border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`text-xs ${isSelected ? 'text-purple-400 font-extrabold' : 'text-slate-500'}`}>
                            #
                          </span>
                          <span className="text-[11.5px] truncate font-sans tracking-tight">
                            {formatChannelName(ch)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Restriction Indicators */}
                          {!isAccessible ? (
                            <Lock className="w-2.5 h-2.5 text-pink-400/80 shrink-0" />
                          ) : ch.onlyStaffCanWrite ? (
                            <span className="text-[7.5px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded font-semibold uppercase">
                              Lectura
                            </span>
                          ) : null}

                          {/* Dynamic Channel Editing Controls for Staff */}
                          {isStaff && (
                            <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity gap-0.5 shrink-0 pl-1">
                              <button
                                type="button"
                                onClick={(e) => startEditChannel(ch, e)}
                                className="p-0.5 hover:bg-purple-600/30 text-slate-400 hover:text-purple-300 rounded"
                                title="Editar canal"
                              >
                                <Edit className="w-2.5 h-2.5" />
                              </button>
                              {true && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                                  className="p-0.5 hover:bg-rose-500/30 text-slate-400 hover:text-rose-450 rounded"
                                  title="Eliminar canal"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {catChannels.length === 0 && (
                    <span className="px-3 py-1.5 text-[10px] text-zinc-650 block italic">Sin canales</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footprint Profile */}
        <div className="p-3 mt-auto bg-black/40 border border-white/5 rounded-2xl mx-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple-600/15 border border-purple-500/25 flex items-center justify-center text-purple-300 font-mono text-[9.5px] font-bold uppercase">
            {currentUser.displayName.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] pr-2 font-bold text-white truncate leading-none">{currentUser.displayName}</p>
            <p className="text-[8px] font-mono text-indigo-400 uppercase mt-1 tracking-wider">{currentUser.role === 'administrador' ? '🔒 ADMIN' : currentUser.role}</p>
          </div>
        </div>
      </div>
    );
  };

  // Mobile channel switcher
  const renderMobileTabs = () => {
    return (
      <div className="md:hidden border-b border-white/5 bg-[#09090a] p-2 flex items-center gap-1.5 overflow-x-auto select-none">
        {channels.map((ch) => {
          if (ch.category === 'Claustro' && !isStaff) return null;
          
          const isSelected = activeChannelId === ch.id;
          const isAccessible = getHasReadAccess(ch.category, currentUser.role);
          
          return (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChannelId(ch.id);
                setActiveThreadId(null);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] uppercase font-sans font-bold tracking-tight border transition-all ${
                isSelected
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-zinc-950 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span># {ch.name}</span>
              {!isAccessible && <Lock className="w-2.5 h-2.5 text-pink-400" />}
            </button>
          );
        })}
        
        {isStaff && (
          <button
            onClick={() => startAddChannel('Chat·General')}
            className="flex-shrink-0 p-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-full text-xs font-bold font-sans"
            title="Crear canal"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const hasGlobalSidebar = !!channelId;

  return (
    <div 
      id="clean-chat-component" 
      className={`${hasGlobalSidebar ? 'flex w-full' : 'grid grid-cols-1 md:grid-cols-4'} bg-[#0A0A0B] border border-white/5 rounded-3xl overflow-hidden h-[630px] shadow-2xl relative font-sans`}
    >
      
      {/* 1. Left Channels Sidebar */}
      {!hasGlobalSidebar && renderLeftSidebar()}

      {/* 2. Central Chats Stream */}
      <div className={`${hasGlobalSidebar ? 'flex-1' : 'col-span-1 md:col-span-3'} flex flex-col h-full bg-[#050505] relative ${activeThreadId ? 'lg:col-span-2' : ''}`}>
        
        {/* Mobile top tabs */}
        {!hasGlobalSidebar && renderMobileTabs()}

        {/* Channel Active Header info */}
        <div className="p-4 border-b border-white/5 bg-[#0A0A0B] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-[10px] font-mono leading-none font-bold text-purple-400">
              #
            </span>
            <div className="min-w-0">
              <span className="font-sans font-black text-xs text-white uppercase tracking-wider block">
                {formatChannelName(activeChannel)}
              </span>
              <p className="text-[9.5px] text-slate-500 font-medium tracking-tight truncate hidden sm:block">
                Canal {activeChannel.category === 'Chat·General' ? 'público para todos los alumnos' : activeChannel.category === 'Comunidad' ? 'exclusivo para miembros de la comunidad' : 'privado para el Claustro Técnico'}  •  Por {activeChannel.onlyStaffCanWrite ? 'solo lectura' : 'sala abierta para debate'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              ONLINE
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        {!hasReadAccess ? (
          /* Custom access restriction cards */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#040405] relative overflow-hidden select-none animate-fadeIn">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 max-w-sm text-center space-y-5">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-center shadow-lg shadow-pink-500/5">
                <Lock className="w-5 h-5 text-pink-400" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[8.5px] font-mono font-bold text-pink-400 bg-pink-500/10 border border-pink-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Acceso Especial Comunidad
                </span>
                <h3 className="text-sm font-bold font-sans text-white uppercase tracking-tight">
                  Canal Reservado: {formatChannelName(activeChannel)}
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-2">
                  Esta sala de debates técnicos avanzados está reservada de manera exclusiva para <strong>Miembros de la comunidad</strong> (Membresía Hotmart) o integrantes del claustro de Titan Master School.
                </p>
              </div>

              {currentUser.role === 'alumno' && (
                <div className="pt-2">
                  <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-left space-y-1.5 mb-3">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-black block">Beneficios de la Comunidad</span>
                    <ul className="space-y-1 text-[10px] text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <Sparkles className="w-3 text-pink-400 shrink-0" /> Acceso a todos los debates técnicos de la comunidad
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles className="w-3 text-pink-400 shrink-0" /> Capturas de análisis diarios del mercado
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Sparkles className="w-3 text-pink-400 shrink-0" /> Plantillas descargables de alta precisión
                      </li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={() => window.open('https://hotmart.com', '_blank')}
                    className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-sans font-bold text-[10.5px] rounded-xl shadow-lg border border-pink-500/30 hover:scale-[1.01] transition-all cursor-pointer uppercase tracking-wider"
                  >
                    CONTRATAR MENSUALIDAD EN HOTMART ↗
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Conversation messages container */
          <>
            <div 
              ref={chatContainerRef} 
              onScroll={handleScroll} 
              className="flex-1 overflow-y-auto p-4 space-y-4 relative"
            >
              {showNewMessageIndicator && (
                <div className="sticky bottom-2 left-1/2 transform -translate-x-1/2 z-30">
                  <button 
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      setShowNewMessageIndicator(false);
                    }}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_12px_rgba(139,92,246,0.3)] animate-pulse border border-violet-400/20 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" /> Nuevos mensajes abajo ↓
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <MessageSquare className="w-9 h-9 text-zinc-800" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">El canal está listo</div>
                  <p className="text-[11px] text-zinc-550 max-w-xs leading-relaxed font-sans">
                    Comparte tus análisis técnicos, ideas de Stop Loss, metas logradas o dudas de trading regulado con el claustro.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isPendingMsg = msg.status === 'pending_review';
                  const dRole = getDynamicUserRole(msg.userId, msg.userRole);
                  const dName = getDynamicUserName(msg.userId, msg.userName);
                  
                  return (
                    <div 
                      id={`chat-msg-${msg.id}`} 
                      key={msg.id} 
                      className={`group flex items-start gap-3 hover:bg-white/[0.012] p-2 rounded-2xl transition-all relative ${
                        isPendingMsg ? 'bg-amber-500/5 border border-dashed border-amber-500/10 p-3' : ''
                      }`}
                    >
                      {/* Avatar */}
                      {msg.avatarUrl ? (
                        <img 
                          src={msg.avatarUrl} 
                          alt={dName} 
                          className="w-8 h-8 rounded-full object-cover border border-white/5 shadow"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 font-mono font-bold text-xs uppercase shrink-0">
                          {dName.substring(0, 2)}
                        </div>
                      )}

                      {/* Msg Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold font-sans cursor-default ${getRoleNameColor(dRole)}`}>
                            {dName}
                          </span>
                          {getRoleBadge(dRole)}
                          <span className="text-[9px] text-zinc-600 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {isPendingMsg && (
                            <span className="text-[8px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono font-bold animate-pulse">
                              En revisión
                            </span>
                          )}
                        </div>

                        {msg.text && (
                          <p className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap font-sans">
                            {renderMessageTextWithMentions(msg.text)}
                          </p>
                        )}

                        {/* User custom image url attachment */}
                        {msg.imageUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-white/5 max-w-sm bg-black/40">
                            <img 
                              src={msg.imageUrl} 
                              alt="Análisis de mercado adjuntado" 
                              className="max-h-56 max-w-full object-contain mx-auto"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Pending approvals details for moderator/admin */}
                        {isPendingMsg && isStaff && (
                          <div className="flex items-center gap-2 mt-2 bg-black border border-amber-500/20 p-2 rounded-xl text-xs max-w-md animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-zinc-400 text-[10px] flex-1">Enlace o imagen temporalmente retenida.</span>
                            <div className="flex gap-1.5">
                              <button 
                                id={`approve-${msg.id}`}
                                onClick={() => handleApproveMessage(msg.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2 py-1 rounded-lg border border-emerald-500/10 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> APROBAR
                              </button>
                              <button 
                                id={`reject-${msg.id}`}
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="bg-red-650 hover:bg-red-600 text-white font-bold text-[9px] px-2 py-1 rounded-lg border border-red-500/10 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <X className="w-3 h-3" /> RECHAZAR
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Response or delete interactives buttons */}
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-zinc-550 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-open-thread-${msg.id}`}
                            onClick={() => setActiveThreadId(msg.id)}
                            className="hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <MessageSquare className="w-3 h-3" /> Responder ({msg.replies?.length || 0})
                          </button>
                          
                          {isStaff && !isPendingMsg && (
                            <>
                              <button
                                onClick={() => handleHideMessage(msg.id)}
                                className="hover:text-amber-400 transition-colors cursor-pointer"
                                title="Cerrar visibilidad"
                              >
                                Ocultar
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="hover:text-rose-450 transition-colors cursor-pointer font-bold"
                                title="Eliminar mensaje permanentemente"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>

                        {/* Collapsed message replies threads preview */}
                        {msg.replies && msg.replies.length > 0 && !activeThreadId && (
                          <div className="mt-2 pl-3 border-l-2 border-purple-500/10 space-y-2">
                            {msg.replies.slice(0, 2).map((rep) => (
                              <div key={rep.id} className="flex gap-2 items-center text-[10.5px]">
                                <CornerDownRight className="w-3 h-3 text-zinc-650" />
                                <span className={`font-bold ${getRoleNameColor(rep.userRole)}`}>{rep.userName}</span>
                                <span className="text-zinc-300">{rep.text}</span>
                              </div>
                            ))}
                            {msg.replies.length > 2 && (
                              <button 
                                onClick={() => setActiveThreadId(msg.id)}
                                className="text-[10px] text-purple-400 font-bold hover:underline"
                              >
                                Ver las {msg.replies.length} respuestas...
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input section */}
            <div className="p-3 border-t border-white/5 bg-[#0A0A0B] space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFileLoad(e.target.files[0]);
                  }
                }}
              />

              {/* Image upload preview */}
              {isUploadingImage && (
                <div className="p-3 bg-[#050505] border border-white/5 rounded-2xl flex items-center gap-3 text-left animate-fadeIn">
                  <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Optimizando y subiendo imagen...</span>
                    <span className="text-[9px] text-zinc-500 font-mono block animate-pulse">Comprimiendo y guardando en Firebase Storage</span>
                  </div>
                </div>
              )}

              {imageInputUrl && !isUploadingImage && (
                <div className="p-3 bg-[#050505] border border-white/5 rounded-2xl flex items-center justify-between gap-4 text-left animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={imageInputUrl}
                      alt="Upload Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">Imagen adjunta</span>
                      <span className="text-[9px] text-zinc-500 font-mono block truncate">Arrastra otra o pega capturas directamente</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageInputUrl('')}
                    className="p-1 px-2.5 bg-rose-600/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/10 rounded-xl text-[10px] font-mono cursor-pointer transition-all"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {isReadOnlyChannelForUser ? (
                /* Information room barrier */
                <div className="p-3 border border-white/5 rounded-xl bg-white/[0.01] flex items-center justify-center text-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                    Canal oficial de anuncios. Solo el claustro docente puede publicar en esta sala.
                  </span>
                </div>
              ) : (
                <form 
                  onSubmit={handleSendMessage} 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageFileLoad(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`flex items-center gap-2 p-1 rounded-2xl transition-all ${dragActive ? 'bg-purple-600/10 ring-2 ring-purple-500/45' : ''}`}
                >
                  <button
                    id="btn-open-image-url-attach"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl border transition-all text-zinc-400 hover:text-purple-400 hover:bg-purple-500/5 ${
                      imageInputUrl.trim() ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-zinc-950 border-white/5'
                    }`}
                    title="Subir imagen desde el ordenador o arrastra aquí"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    id="chat-main-text-input"
                    type="text"
                    required={!imageInputUrl.trim()}
                    placeholder={imageInputUrl.trim() ? "Imagen lista para adjuntar. Presiona Enviar" : "Escribe un mensaje aquí... (o pega una captura)"}
                    value={inputText}
                    onPaste={(e) => {
                      if (e.clipboardData.files && e.clipboardData.files[0]) {
                        handleImageFileLoad(e.clipboardData.files[0]);
                      }
                    }}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-white/5 focus:outline-none focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-zinc-600"
                  />

                  <button
                    id="chat-send-main-submit"
                    type="submit"
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-505 text-white transition-all flex items-center justify-center font-bold cursor-pointer"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </>
        )}

      </div>

      {/* 3. Threaded Response Sub-panel right sidebar */}
      {activeThreadId && activeThreadMessage && (
        <div className="col-span-1 md:col-span-1 flex flex-col h-full bg-[#080809] border-t md:border-t-0 md:border-l border-white/5 select-none animate-fadeIn">
          
          <div className="p-3 bg-[#0A0A0B] border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">HILO DE REPRO</span>
            <button 
              id="btn-close-active-thread"
              onClick={() => { setActiveThreadId(null); setThreadText(''); }}
              className="p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-[#050505]/60 border-b border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-bold ${getRoleNameColor(getDynamicUserRole(activeThreadMessage.userId, activeThreadMessage.userRole))}`}>
                {getDynamicUserName(activeThreadMessage.userId, activeThreadMessage.userName)}
              </span>
              {getRoleBadge(getDynamicUserRole(activeThreadMessage.userId, activeThreadMessage.userRole))}
            </div>
            <p className="text-[11px] text-zinc-350 leading-relaxed font-sans">{activeThreadMessage.text}</p>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080809]">
            {(!activeThreadMessage.replies || activeThreadMessage.replies.length === 0) ? (
              <p className="text-center text-[10px] text-zinc-700 pt-8 font-mono">Nadie ha respondido a este análisis.</p>
            ) : (
              activeThreadMessage.replies.map((rep) => {
                const rRole = getDynamicUserRole(rep.userId, rep.userRole);
                const rName = getDynamicUserName(rep.userId, rep.userName);
                return (
                  <div key={rep.id} className="p-2.5 bg-black/40 border border-white/5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10.5px] font-bold ${getRoleNameColor(rRole)}`}>
                        {rName}
                      </span>
                      <span className="text-[8px] text-zinc-600 font-mono">
                        {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-zinc-300 leading-relaxed font-sans">{rep.text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick replies */}
          <form 
            onSubmit={(e) => handleSendReply(e, activeThreadMessage.id)} 
            className="p-3 bg-[#0A0A0B] border-t border-white/5 flex gap-2 items-center"
          >
            <input
              id="thread-quick-reply-input"
              type="text"
              required
              placeholder="Responder..."
              value={threadText}
              onChange={(e) => setThreadText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-white/5 focus:outline-none focus:border-purple-500 rounded-lg py-2 px-3 text-xs text-white"
            />
            <button
              id="thread-reply-submit"
              type="submit"
              className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-purple-400 hover:text-white hover:bg-purple-600 transition-all font-bold text-xs"
            >
              Responder
            </button>
          </form>

        </div>
      )}

      {/* 4. MODAL FOR CHANNEL CREATION / EDITING */}
      {showChannelModal && isStaff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A0A0B] border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-sans font-black tracking-wider text-white uppercase flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                {editingChannel ? 'EDITAR CANAL TÉCNICO' : 'NUEVO CANAL DE DEBATES'}
              </h3>
              <button 
                onClick={() => { setShowChannelModal(false); setEditingChannel(null); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChannel} className="space-y-4 text-xs">
              
              {/* Field 1: Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">
                  Nombre del Canal
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-650 font-mono font-bold">#</span>
                  <input
                    type="text"
                    required
                    placeholder="ej. pautas-diarias"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-xs text-white uppercase font-sans focus:outline-none focus:border-purple-500"
                  />
                </div>
                <span className="text-[9px] text-zinc-600 font-mono block">Solo se permiten minúsculas, números y guiones. Se autogenerará como slug.</span>
              </div>

              {/* Field 2: Category selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">
                  Nivel de Privacidad (Categoría)
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-purple-500 font-bold tracking-wider"
                >
                  <option value="Chat·General">GENERAL (Todo público)</option>
                  <option value="Comunidad">COMUNIDAD (Solo Miembros de la Comunidad)</option>
                  <option value="Claustro">CLAUSTRO INTERNO (Solo Staff)</option>
                </select>
              </div>

              {/* Field 3: Read-only toggle */}
              <div className="bg-zinc-950 border border-white/5 p-3 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5 pr-4 flex-1">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide block">Restringir Escritura</span>
                  <span className="text-[9.5px] text-zinc-600 leading-tight block">Solo el claustro académico (administradores y colaboradores) podrá publicar mensajes. Alumnos verán modo lectura.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formOnlyStaff}
                  onChange={(e) => setFormOnlyStaff(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 shrink-0 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowChannelModal(false); setEditingChannel(null); }}
                  className="w-1/2 py-2.5 bg-zinc-90 w bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl text-zinc-450 hover:text-white font-sans font-bold text-center transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-sans font-bold text-center rounded-xl transition-all shadow-md shadow-purple-600/15 cursor-pointer uppercase tracking-wider"
                >
                  {editingChannel ? 'Guardar Cambios' : 'Crear Canal'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Overlay Modal */}
      {confirmModal && confirmModal.show && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-fadeIn select-none">
          <div className="w-full max-w-sm bg-[#0E0E10] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-black text-xs text-white uppercase tracking-wider">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-[11px] text-zinc-350 leading-relaxed font-sans">
              {confirmModal.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                }}
                className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-450 hover:text-white rounded-xl border border-white/5 font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider text-center"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider text-center shadow-lg shadow-rose-600/10"
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Overlay Modal */}
      {alertModal && alertModal.show && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-fadeIn select-none">
          <div className="w-full max-w-sm bg-[#0E0E10] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-sans font-black text-xs text-white uppercase tracking-wider">
                {alertModal.title}
              </h3>
            </div>
            <p className="text-[11px] text-zinc-350 leading-relaxed font-sans">
              {alertModal.message}
            </p>
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-xl border border-white/5 font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider text-center"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
