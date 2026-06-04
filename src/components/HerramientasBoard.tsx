/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Plus, Trash2, Edit2, Send, MessageSquare, 
  Check, Eye, EyeOff, User, Clock, Lock, ShieldAlert,
  X, Pin, ArrowUp, ArrowDown
} from 'lucide-react';
import { ToolTopic, UserProfile, CustomCategory } from '../types';
import { DataAPI } from '../lib/db';
import CalculadoraLotes from './CalculadoraLotes';
import CalculadoraApalancamiento from './CalculadoraApalancamiento';

interface HerramientasBoardProps {
  currentUser: UserProfile;
  toolTopics: ToolTopic[];
  onRefresh: () => void;
  channelId?: string;
  channelName?: string;
  onlyStaffCanWrite?: boolean;
}

export default function HerramientasBoard({ 
  currentUser, 
  toolTopics, 
  onRefresh, 
  channelId,
  channelName,
  onlyStaffCanWrite
}: HerramientasBoardProps) {
  const isSinRol = !currentUser.role || currentUser.role === 'none';
  const isStaff = ['administrador', 'colaborador', 'moderador'].includes(currentUser.role || '');
  
  // Topic selection & categories list
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  
  // Modal / Form state for Creator
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ToolTopic | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formReleasedTo, setFormReleasedTo] = useState<'todos' | 'alumno' | 'miembro' | 'staff'>('todos');
  const [formIsReleased, setFormIsReleased] = useState(true);

  // New customizable fields
  const [formCategory, setFormCategory] = useState<string>('');
  const [formPinned, setFormPinned] = useState<boolean>(false);
  const [formOrderIndex, setFormOrderIndex] = useState<number>(0);
  const [formCommentsAllowed, setFormCommentsAllowed] = useState<boolean>(true);
  const [formCommentsTarget, setFormCommentsTarget] = useState<'todos' | 'alumno' | 'staff'>('todos');
  const [formIsPrivate, setFormIsPrivate] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Discussion reply state
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load Categories on mount & topics change
  useEffect(() => {
    DataAPI.getCustomCategories().then(list => {
      setCustomCategories(list);
    }).catch(console.error);
  }, [toolTopics]);

  // Filter topics based on permissions
  const visibleTopics = toolTopics.filter(t => {
    if (isStaff) return true; // Staff see all including drafts & private

    // If private, only staff can read
    if (t.isPrivate) return false;
    
    // Check if released
    const isReleased = t.isReleased !== false; 
    if (!isReleased) return false;

    // Check rank/role requirement
    const target = t.releasedTo || 'todos';
    if (target === 'todos') return true;
    if (target === 'alumno') return ['alumno', 'miembro', 'veterano', 'old_school', 'moderador', 'colaborador', 'administrador'].includes(currentUser.role || '');
    if (target === 'miembro') return ['miembro', 'veterano', 'old_school', 'moderador', 'colaborador', 'administrador'].includes(currentUser.role || '');
    if (target === 'staff') return ['moderador', 'colaborador', 'administrador'].includes(currentUser.role || '');
    
    return true;
  });

  // Sort: Pinned first, then orderIndex, then creation date desc
  const sortedTopics = [...visibleTopics].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    const indexA = a.orderIndex !== undefined ? a.orderIndex : 99999;
    const indexB = b.orderIndex !== undefined ? b.orderIndex : 99999;
    if (indexA !== indexB) return indexA - indexB;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter based on selected Category tab
  const filteredTopics = sortedTopics.filter(t => {
    if (selectedCategory === 'todos') return true;
    return t.category === selectedCategory;
  });

  // Select default topic
  useEffect(() => {
    if (filteredTopics.length > 0) {
      const exists = filteredTopics.some(t => t.id === selectedTopicId);
      if (!exists) {
        setSelectedTopicId(filteredTopics[0].id);
      }
    } else {
      setSelectedTopicId(null);
    }
  }, [selectedCategory, selectedTopicId, toolTopics]);

  const activeTopic = filteredTopics.find(t => t.id === selectedTopicId) || sortedTopics.find(t => t.id === selectedTopicId);

  // Scroll to bottom of comments when comments length changes, preserving initial scroll position on selection
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTopic?.replies?.length]);

  // Navigation click scroll handler
  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    window.scrollTo(0, 0); // Control de Scroll y Navegación
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    window.scrollTo(0, 0); // Control de Scroll y Navegación
  };

  const handleOpenCreate = () => {
    setEditingTopic(null);
    setFormTitle('');
    setFormContent('');
    setFormReleasedTo('todos');
    setFormIsReleased(true);
    setFormCategory(channelId || '');
    setFormPinned(false);
    setFormOrderIndex(sortedTopics.length + 1);
    setFormCommentsAllowed(true);
    setFormCommentsTarget('todos');
    setFormIsPrivate(false);
    setShowUpsertModal(true);
  };

  const handleOpenEdit = (topic: ToolTopic) => {
    setEditingTopic(topic);
    setFormTitle(topic.title);
    setFormContent(topic.content);
    setFormReleasedTo(topic.releasedTo || 'todos');
    setFormIsReleased(topic.isReleased !== false);
    setFormCategory(topic.category || '');
    setFormPinned(topic.pinned || false);
    setFormOrderIndex(topic.orderIndex !== undefined ? topic.orderIndex : 0);
    setFormCommentsAllowed(topic.commentsAllowed !== false);
    setFormCommentsTarget(topic.commentsTarget || 'todos');
    setFormIsPrivate(topic.isPrivate || false);
    setShowUpsertModal(true);
  };

  const handleSaveTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert("Por favor rellena el título y el contenido");
      return;
    }

    try {
      const topicId = editingTopic ? editingTopic.id : 'tt_' + Math.random().toString(36).substr(2, 9);
      const isNew = !editingTopic;

      const topic: ToolTopic = {
        id: topicId,
        title: formTitle.trim(),
        content: formContent.trim(),
        author: editingTopic ? editingTopic.author : currentUser.displayName,
        createdAt: editingTopic ? editingTopic.createdAt : new Date().toISOString(),
        isReleased: formIsReleased,
        releasedTo: formReleasedTo,
        replies: editingTopic ? editingTopic.replies : [],
        category: formCategory,
        pinned: formPinned,
        orderIndex: Number(formOrderIndex),
        commentsAllowed: formCommentsAllowed,
        commentsTarget: formCommentsTarget,
        isPrivate: formIsPrivate
      };

      await DataAPI.saveToolTopic(topic);
      setShowUpsertModal(false);
      onRefresh();
      
      if (isNew) {
        setSelectedTopicId(topicId);
      }
    } catch (err: any) {
      alert("Error al guardar herramienta: " + (err.message || err));
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    setDeleteConfirmId(topicId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await DataAPI.deleteToolTopic(deleteConfirmId);
      onRefresh();
      if (selectedTopicId === deleteConfirmId) {
        setSelectedTopicId(null);
      }
      setDeleteConfirmId(null);
      setShowUpsertModal(false);
    } catch (err: any) {
      alert("Error al eliminar guía: " + (err.message || err));
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTopicId) return;

    setReplyLoading(true);
    try {
      await DataAPI.postToolTopicReply(selectedTopicId, replyText.trim(), currentUser);
      setReplyText('');
      onRefresh();
    } catch (err: any) {
      alert("Error al enviar comentario: " + (err.message || err));
    } finally {
      setReplyLoading(false);
    }
  };

  // Comments constraints active check
  const commentsAllowed = activeTopic?.commentsAllowed !== false;
  const commentsTarget = activeTopic?.commentsTarget || 'todos';
  let canCommentActive = true;
  if (!commentsAllowed) {
    canCommentActive = false;
  } else if (commentsTarget === 'alumno') {
    canCommentActive = ['alumno', 'miembro', 'veterano', 'old_school', 'moderador', 'colaborador', 'administrador'].includes(currentUser.role || '');
  } else if (commentsTarget === 'staff') {
    canCommentActive = isStaff;
  }

  // If role is NONE (pendiene de aprobación), return restricted calculators only as specified in section 3
  if (isSinRol) {
    return (
      <div id="herramientas-main-board" className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          <CalculadoraLotes />
          <CalculadoraApalancamiento />
        </div>
      </div>
    );
  }

  return (
    <div id="herramientas-main-board" className="space-y-8">
      
      {/* 2 COLLAPSIBLE ACCORDION CALCULATORS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalculadoraLotes />
        <CalculadoraApalancamiento />
      </div>

      {/* COMPONENT: ADMINISTRABLE 'Herramientas y Recursos' SECTION */}
      <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-3xl space-y-6">
        
        {/* Section Title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider font-mono break-words">
              {channelName || 'Herramientas y Recursos'}
            </h3>
          </div>
            {isStaff && (
            <button
              id="btn-add-tool-topic"
              onClick={handleOpenCreate}
              className="p-1.5 px-3 bg-pink-600 hover:bg-pink-550 text-white rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(236,72,153,0.15)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Crear tema
            </button>
          )}
        </div>

        {/* Main Grid: Left Topics Feed (4 cols) & Right Detail Container (8 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[460px]">
          
          {/* Topics Feed list */}
          <div className="md:col-span-4 border-r border-white/5 pr-4 space-y-2 overflow-y-auto max-h-[500px]">
            {filteredTopics.length === 0 ? (
              <p className="text-xs text-zinc-650 italic py-6">No hay recursos ni hilos disponibles en esta categoría.</p>
            ) : (
              filteredTopics.map((topic) => {
                const isActive = topic.id === selectedTopicId;
                const isReleased = topic.isReleased !== false;
                const releaseMode = topic.releasedTo || 'todos';

                return (
                  <div
                    id={`tool-topic-item-${topic.id}`}
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group/item relative ${
                      isActive 
                        ? 'bg-pink-600/10 border-pink-500/30 text-white' 
                        : 'bg-zinc-950/35 border-zinc-900 text-zinc-430 hover:bg-zinc-950/60 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1 pb-1">
                      <span className="font-semibold text-xs truncate max-w-[150px] leading-tight block flex items-center gap-1">
                        {topic.pinned && <Pin className="w-3 h-3 text-pink-400 fill-pink-400/20 rotate-45 shrink-0" />}
                        {topic.title}
                      </span>
                      
                      {/* Status Badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        {topic.isPrivate && (
                          <span className="text-[8px] bg-red-550/10 border border-red-500/20 text-red-400 px-1.5 rounded uppercase font-mono font-medium">
                            Privado
                          </span>
                        )}
                        {isStaff && !isReleased ? (
                          <span className="text-[8px] bg-amber-500/15 border border-amber-500/20 text-amber-500 px-1 rounded uppercase font-mono font-medium flex items-center gap-0.5">
                            <EyeOff className="w-2 h-2" /> Draft
                          </span>
                        ) : null}
                        {releaseMode !== 'todos' && (
                          <span className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-440 px-1 rounded uppercase font-mono font-weight-bold">
                            {releaseMode}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-550 truncate mt-0.5">
                      {topic.content}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2 font-mono">
                      <span className="flex items-center gap-1"><User className="w-2.5 h-2.5 text-pink-500/80" /> {topic.author}</span>
                      <span className="flex items-center gap-1">
                        {topic.commentsAllowed === false ? (
                          <span className="text-zinc-650 italic">Solo Lectura</span>
                        ) : (
                          <><MessageSquare className="w-2.5 h-2.5" /> {(topic.replies || []).length}</>
                        )}
                      </span>
                    </div>

                    {/* Staff administrative quick hover actions on matching row */}
                    {isStaff && (
                      <div className="absolute right-2 top-11 opacity-0 group-hover/item:opacity-100 flex items-center gap-0.5 bg-zinc-950 border border-zinc-850 p-1 rounded-lg transition-all scale-90">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(topic); }}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                          className="p-1 text-zinc-400 hover:text-rose-450 cursor-pointer"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Selected Topics Pane */}
          <div className="md:col-span-8 flex flex-col justify-between pl-2 space-y-4 max-h-[500px]">
            {activeTopic ? (
              <div className="flex flex-col h-full justify-between space-y-4">
                
                {/* Headers and body content */}
                <div className="space-y-3">
                  <div className="pb-3 border-b border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activeTopic.pinned && <Pin className="w-4 h-4 text-pink-400 fill-pink-400/20 rotate-45" />}
                        <h3 className="text-base font-sans font-bold text-white flex items-center gap-1.5 leading-tight">
                          <Wrench className="w-4 h-4 text-pink-400" />
                          {activeTopic.title}
                        </h3>
                      </div>
                      
                      {isStaff && (
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            onClick={() => handleOpenEdit(activeTopic)}
                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 transition-all pointer-cursor"
                          >
                            <Edit2 className="w-3 h-3" /> Editar guía
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(activeTopic.id)}
                            className="text-xs text-rose-400 hover:text-white flex items-center gap-1 font-medium bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/30 rounded-lg px-2 py-1 transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.05)]"
                            title="Eliminar esta guía permanentemente"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar Guía
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1"><User className="w-3 h-3 text-pink-400/80" /> Por <strong>{activeTopic.author}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-550" /> {new Date(activeTopic.createdAt).toLocaleDateString()} {new Date(activeTopic.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {activeTopic.category && (
                        <>
                          <span>•</span>
                          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-pink-400 font-semibold">{activeTopic.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body textual detailed guides guidelines */}
                  <div className="text-xs leading-relaxed text-slate-300 bg-zinc-950/20 border border-zinc-900/50 rounded-2xl p-4 max-h-[170px] overflow-y-auto whitespace-pre-wrap font-sans">
                    {activeTopic.content}
                  </div>
                         {/* Forum Debate / Comments section */}
                {commentsAllowed && !onlyStaffCanWrite && (
                  <div className="space-y-2 flex-grow flex flex-col justify-between min-h-[220px]">
                    <div className="pb-1 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-440 font-mono uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Debate de Herramienta
                      </span>
                      {!commentsAllowed && (
                        <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase flex items-center gap-1 bg-zinc-900/60 p-1 px-2 rounded-lg border border-white/5">
                          <Lock className="w-3 h-3" /> Solo lectura
                        </span>
                      )}
                    </div>

                    {/* Replies feed */}
                    <div className="bg-[#050506] border border-white/[0.03] rounded-2xl p-3 flex-grow max-h-[160px] overflow-y-auto space-y-2 pr-1 select-text">
                      {(!activeTopic.replies || activeTopic.replies.length === 0) ? (
                        <p className="text-center text-[10px] text-zinc-650 italic py-6 font-mono uppercase tracking-wider">No hay comentarios en este debate de soporte</p>
                      ) : (
                        activeTopic.replies.map((rep) => {
                          const isRepStaff = ['administrador', 'colaborador', 'moderador'].includes(rep.userRole);
                          return (
                            <div id={`tool-rep-${rep.id}`} key={rep.id} className="p-2 border border-white/[0.03] bg-zinc-950/35 rounded-xl space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-100">{rep.userName}</span>
                                  <span className={`text-[8px] px-1 py-0.2 rounded uppercase font-mono tracking-wider font-bold ${
                                    isRepStaff 
                                      ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' 
                                      : 'bg-slate-850 text-slate-400'
                                  }`}>
                                    {rep.userRole}
                                  </span>
                                </div>
                                <span className="text-[9px] text-zinc-550 font-mono">{new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[11px] text-slate-350 leading-relaxed font-sans select-text">
                                {rep.text}
                              </p>
                            </div>
                          );
                        })
                      )}
                      <div ref={commentsEndRef} />
                    </div>

                    {/* Reply Form / Controls restricted matches */}
                    {canCommentActive ? (
                      <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                        <input
                          id="tool-reply-input"
                          type="text"
                          placeholder="Pregunta o comenta sobre este recurso..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          disabled={replyLoading}
                          className="flex-grow bg-zinc-950 border border-zinc-850/80 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-pink-500 font-sans"
                        />
                        <button
                          id="tool-reply-submit"
                          type="submit"
                          disabled={replyLoading || !replyText.trim()}
                          className="py-2 px-3 bg-pink-600 hover:bg-pink-550 disabled:bg-pink-600/30 disabled:text-zinc-500 text-white rounded-xl transition-all font-bold flex items-center justify-center gap-1.5 shrink-0 hover:scale-102"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="p-2 bg-zinc-900/30 rounded-xl border border-white/5 text-center text-[10px] text-zinc-500 italic font-mono uppercase tracking-wider">
                        {commentsAllowed 
                          ? `Aportaciones cerradas. Solo cuenta con permisos el rol: ${commentsTarget.toUpperCase()}`
                          : "El debate de esta herramienta ha sido bloqueado como Solo Lectura por el Staff académico"
                        }
                      </div>
                    )}
                  </div>
                )}          </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Wrench className="w-10 h-10 text-zinc-750 animate-pulse" />
                <div>
                  <h4 className="text-zinc-400 text-xs font-sans font-bold uppercase tracking-wider">Elige o Crea una Guía</h4>
                  <p className="text-[11px] text-zinc-650 font-mono font-medium">Selecciona una de las herramientas de la izquierda para ver su contenido, parámetros de trading y debatir.</p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Dynamic Creation / Editing Modal */}
      {showUpsertModal && (
        <div id="upsert-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div id="upsert-modal-panel" className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative space-y-4 my-8">
            
            <button
              onClick={() => setShowUpsertModal(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-widest">{editingTopic ? 'Editar Recurso de Herramienta' : 'Crear Recurso de Herramienta'}</h3>
              <p className="text-[10px] text-zinc-500 font-mono font-medium">PUBLICA GUÍAS DETALLADAS DE TRADINGVIEW, NINJATRADER O CONEXIONES</p>
            </div>

            <form onSubmit={handleSaveTopicSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 font-mono uppercase tracking-wider">Título del Recurso</label>
                  <input
                    id="tool-input-title"
                    type="text"
                    required
                    placeholder="Ej: Plantilla de Desequilibrios Premium para TradingView"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 font-mono uppercase tracking-wider">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500 font-mono"
                  >
                    <option value="">Ninguna</option>
                    {customCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1 font-mono uppercase tracking-wider">Contenido / Pasos detallados</label>
                <textarea
                  id="tool-input-content"
                  required
                  placeholder="Introduce aquí las reglas, instrucciones de conexión, enlaces de descarga del indicador, parámetros..."
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500 font-sans leading-relaxed"
                />
              </div>

              {/* Advanced Controls Section */}
              <div className="border border-white/5 p-4 rounded-2xl bg-zinc-950/65 space-y-3">
                <span className="block text-[10px] font-bold text-pink-400 font-mono uppercase tracking-widest border-b border-white/5 pb-1">Seguridad, Ubicación y Comentarios</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Commet rules */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={formCommentsAllowed}
                        onChange={(e) => setFormCommentsAllowed(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-pink-500 focus:ring-pink-500"
                      />
                      <span>Permitir Comentarios / Debate</span>
                    </label>

                    {formCommentsAllowed && (
                      <div>
                        <label className="block text-zinc-400 text-[10px] font-medium mb-1 font-mono uppercase tracking-wider">¿Quién puede comentar?</label>
                        <select
                          value={formCommentsTarget}
                          onChange={(e) => setFormCommentsTarget(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-white font-mono text-[11px]"
                        >
                          <option value="todos">Todos los rangos</option>
                          <option value="alumno">Alumnos o superior</option>
                          <option value="staff">Solo Staff</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Private vs public + pinned elements */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={formIsPrivate}
                        onChange={(e) => setFormIsPrivate(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-pink-500 focus:ring-pink-500"
                      />
                      <span>Recurso Privado (Solo Staff visible)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-pink-500 focus:ring-pink-500"
                      />
                      <span className="flex items-center gap-1"><Pin className="w-3.5 h-3.5 text-zinc-400" /> Fijar tema al inicio</span>
                    </label>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-medium mb-1 font-mono uppercase tracking-wider">Liberar a Rango / Rol</label>
                    <select
                      id="tool-select-role"
                      value={formReleasedTo}
                      onChange={(e) => setFormReleasedTo(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2 text-white font-mono text-[11px]"
                    >
                      <option value="todos">Todos (Visibilidad global)</option>
                      <option value="alumno">Rol Alumno en adelante</option>
                      <option value="miembro">Solo Miembros de la Comunidad</option>
                      <option value="staff">Solo Staff</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-medium mb-1 font-mono uppercase tracking-wider">Índice de Orden</label>
                      <input
                        type="number"
                        min="0"
                        value={formOrderIndex}
                        onChange={(e) => setFormOrderIndex(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-white font-mono text-[11px]"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label htmlFor="tool-check-released" className="flex items-center gap-1.5 cursor-pointer pb-2">
                        <input
                          id="tool-check-released"
                          type="checkbox"
                          checked={formIsReleased}
                          onChange={(e) => setFormIsReleased(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-950 text-pink-500 focus:ring-pink-500"
                        />
                        <span className="text-zinc-300 select-none">Hacer visible</span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center gap-2 pt-2">
                {editingTopic && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(editingTopic.id)}
                    className="py-2.5 px-4 bg-rose-955 hover:bg-rose-900 border border-rose-900/40 text-rose-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    ELIMINAR HERRAMIENTA
                  </button>
                )}
                <div className="flex gap-2 flex-grow justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUpsertModal(false)}
                    className="py-2.5 px-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-355 font-bold rounded-xl transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    id="tool-submit"
                    type="submit"
                    className="py-2.5 px-6 bg-pink-600 hover:bg-pink-550 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                  >
                    {editingTopic ? 'GUARDAR CAMBIOS' : 'PUBLICAR TEMA'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DIALOG MODAL --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full animate-bounce">
                <Trash2 className="w-6 h-6" />
              </div>
            </div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider font-mono">¿CONFIRMAR ELIMINACIÓN?</h4>
            <p className="text-xs text-slate-305 leading-relaxed font-sans">
              ¿Estás seguro de que deseas eliminar permanentemente esta guía de herramienta y todos sus datos? Esta operación es irreversible.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-350 border border-white/5 rounded-xl text-xs font-bold cursor-pointer transition-all font-sans"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all uppercase font-sans"
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
