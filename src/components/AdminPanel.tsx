/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Video, 
  BellRing, 
  Trash2, 
  Plus, 
  Check, 
  ShieldAlert, 
  Briefcase, 
  Layers, 
  FileEdit, 
  Clock, 
  Award, 
  Flame, 
  Download, 
  Percent,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Pin,
  Edit3,
  Settings
} from 'lucide-react';
import { 
  UserProfile, 
  Meeting, 
  Notice, 
  UserRole, 
  TradingTool, 
  DiscountRef, 
  HallOfFameEntry, 
  StrategyFeatured, 
  StrategyHistorical,
  ResourceTopic,
  ToolTopic,
  CustomCategory
} from '../types';
import { DataAPI } from '../lib/db';

interface AdminPanelProps {
  currentUser: UserProfile;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'meetings' | 'resources' | 'trading' | 'categories'>('users');
  
  // States for DB entity models
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [meetingsList, setMeetingsList] = useState<Meeting[]>([]);
  const [noticesList, setNoticesList] = useState<Notice[]>([]);
  const [toolsList, setToolsList] = useState<TradingTool[]>([]);
  const [discountsList, setDiscountsList] = useState<DiscountRef[]>([]);
  const [hallList, setHallList] = useState<HallOfFameEntry[]>([]);
  const [featuredStrats, setFeaturedStrats] = useState<StrategyFeatured[]>([]);
  const [historicalStrats, setHistoricalStrats] = useState<StrategyHistorical[]>([]);
  const [customCategoriesList, setCustomCategoriesList] = useState<CustomCategory[]>([]);
  
  // Custom states for dynamic topic creation (Resources and Tools)
  const [resourceTopics, setResourceTopics] = useState<ResourceTopic[]>([]);
  const [toolTopics, setToolTopics] = useState<ToolTopic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [meetingForm, setMeetingForm] = useState<Partial<Meeting>>({ title: '', date: '', time: '', link: '', type: 'alumno' });
  const [noticeForm, setNoticeForm] = useState<Partial<Notice>>({ title: '', content: '', urgent: false });
  const [toolForm, setToolForm] = useState<Partial<TradingTool>>({ name: '', description: '', link: '' });
  const [discountForm, setDiscountForm] = useState<Partial<DiscountRef>>({ name: '', description: '', link: '', category: 'fondeo', code: '' });
  const [hallForm, setHallForm] = useState<Partial<HallOfFameEntry>>({ studentName: '', title: '', description: '', result: '', date: '', prize: '' });
  const [featuredForm, setFeaturedForm] = useState<Partial<StrategyFeatured>>({ id: '', name: '', description: '', parameters: '', author: '', comments: '', orderIndex: 0, pinned: false, requiredMonths: 0 });
  const [historicalForm, setHistoricalForm] = useState<Partial<StrategyHistorical>>({ name: '', description: '', parameters: '', author: '', result: '', requiredMonths: 0 });
  const [categoryNameForm, setCategoryNameForm] = useState('');
  const [expandedUserUid, setExpandedUserUid] = useState<string | null>(null);
  
  // Dynamic topic creator states
  const [resourceTopicForm, setResourceTopicForm] = useState({ title: '', content: '' });
  const [toolTopicForm, setToolTopicForm] = useState({ title: '', content: '' });

  // Load lists on init
  const loadAllData = async () => {
    try {
      const [u, m, n, t, d, h, f, hi, resTopics, tTopics, cats] = await Promise.all([
        DataAPI.getUsers(),
        DataAPI.getMeetings(),
        DataAPI.getNotices(),
        DataAPI.getTools(),
        DataAPI.getDiscounts(),
        DataAPI.getHallOfFame(),
        DataAPI.getStrategiesFeatured(),
        DataAPI.getStrategiesHistorical(),
        DataAPI.getResourceTopics(),
        DataAPI.getToolTopics(),
        DataAPI.getCustomCategories()
      ]);
      setUsersList(u);
      setMeetingsList(m);
      setNoticesList(n);
      setToolsList(t);
      setDiscountsList(d);
      setHallList(h);
      setFeaturedStrats(f);
      setHistoricalStrats(hi);
      setResourceTopics(resTopics);
      setToolTopics(tTopics);
      setCustomCategoriesList(cats);
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // User Actions
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updated = { ...userToEdit, role: newRole };
    await DataAPI.updateUserProfile(updated);
    triggerToast(`Rol de ${userToEdit.displayName} cambiado a ${newRole}`);
    loadAllData();
  };

  const handleToggleMensualidad = async (userId: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const nextVal = !userToEdit.mensualidadActive;
    const updated = { 
      ...userToEdit, 
      mensualidadActive: nextVal,
      subscription: nextVal 
    };
    await DataAPI.updateUserProfile(updated);
    triggerToast(`Acceso mensual de ${userToEdit.displayName} ${nextVal ? 'Habilitado' : 'Deshabilitado'}`);
    loadAllData();
  };

  const handleToggleApproved = async (userId: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const nextVal = !userToEdit.approved;
    const updated = { 
      ...userToEdit, 
      approved: nextVal 
    };
    await DataAPI.updateUserProfile(updated);
    triggerToast(`Estado de aprobación de ${userToEdit.displayName} cambiado a ${nextVal ? 'APROBADO' : 'PENDIENTE'}`);
    loadAllData();
  };

  const handleUpdateName = async (userId: string, name: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit || !name.trim()) return;
    const updated = { ...userToEdit, displayName: name };
    await DataAPI.updateUserProfile(updated);
    triggerToast(`Nombre de usuario de ${userToEdit.displayName} cambiado a ${name}`);
    loadAllData();
  };

  const handleRemovePhoto = async (userId: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updated = { ...userToEdit, avatarUrl: undefined };
    await DataAPI.updateUserProfile(updated);
    triggerToast(`Foto de perfil de ${userToEdit.displayName} eliminada`);
    loadAllData();
  };

  const handleToggleUnlock = async (userId: string, month: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const currentUnlocks = userToEdit.manualUnlocks || [];
    let updated;
    if (currentUnlocks.includes(month)) {
      updated = currentUnlocks.filter(m => m !== month);
    } else {
      updated = [...currentUnlocks, month];
    }
    const updatedUser = { ...userToEdit, manualUnlocks: updated };
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(`Manual unlocks de ${userToEdit.displayName} modificados.`);
    loadAllData();
  };

  const getUserSeniorityForDisplay = (userProfile: any): number => {
    if (!userProfile) return 0;
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

  const handleUpdateMemberJoinedAt = async (userId: string, dateVal: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updatedUser = { ...userToEdit, memberJoinedAt: dateVal };
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(`Fecha de inicio de membresía actualizada.`);
    loadAllData();
  };

  const handleUpdateManualSeniority = async (userId: string, monthsVal: number | null) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updatedUser = { 
      ...userToEdit, 
      manualSeniorityMonths: monthsVal === null ? null : Number(monthsVal)
    };
    if (monthsVal === null) {
      delete (updatedUser as any).manualSeniorityMonths;
    }
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(`Antigüedad manual de ${userToEdit.displayName} actualizada.`);
    loadAllData();
  };

  const handleToggleBlockUnlocks = async (userId: string, blockVal: boolean) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updatedUser = { ...userToEdit, blockUnlocks: blockVal };
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(blockVal ? "Desbloqueos automáticos bloqueados." : "Desbloqueos automáticos permitidos.");
    loadAllData();
  };

  const handleToggleForceUnlock = async (userId: string, forceVal: boolean) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const updatedUser = { ...userToEdit, manualForceUnlock: forceVal };
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(forceVal ? "Fuerza Bruta (Bypass completo) habilitado." : "Fuerza Bruta deshabilitado.");
    loadAllData();
  };

  const handleToggleStrategyUnlock = async (userId: string, stratId: string) => {
    const userToEdit = usersList.find(u => u.uid === userId);
    if (!userToEdit) return;
    const currentUnlocks = userToEdit.manualUnlocks || [];
    let updated;
    if (currentUnlocks.includes(stratId)) {
      updated = currentUnlocks.filter(id => id !== stratId);
    } else {
      updated = [...currentUnlocks, stratId];
    }
    const updatedUser = { ...userToEdit, manualUnlocks: updated };
    await DataAPI.updateUserProfile(updatedUser);
    triggerToast(`Bypass de estrategia modificado.`);
    loadAllData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.uid) {
      alert("No puedes eliminarte a ti mismo de la plataforma.");
      return;
    }
    if (confirm("¿Estás seguro de eliminar este usuario permanentemente?")) {
      await DataAPI.deleteUser(userId);
      triggerToast("Usuario eliminado correctamente.");
      loadAllData();
    }
  };

  // Resource Topic Form
  const handleSaveResourceTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTopicForm.title.trim() || !resourceTopicForm.content.trim()) return;

    const topic: ResourceTopic = {
      id: 'rt_' + Math.random().toString(36).substr(2, 9),
      title: resourceTopicForm.title,
      content: resourceTopicForm.content,
      author: currentUser.displayName,
      createdAt: new Date().toISOString()
    };

    await DataAPI.saveResourceTopic(topic);
    setResourceTopicForm({ title: '', content: '' });
    triggerToast("Tema de recurso guardado con éxito.");
    loadAllData();
  };

  const handleDeleteResourceTopic = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este tema de recurso permanentemente?")) {
      await DataAPI.deleteResourceTopic(id);
      triggerToast("Tema de recurso eliminado.");
      loadAllData();
    }
  };

  // Tool Topic Form
  const handleSaveToolTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolTopicForm.title.trim() || !toolTopicForm.content.trim()) return;

    const topic: ToolTopic = {
      id: 'tt_' + Math.random().toString(36).substr(2, 9),
      title: toolTopicForm.title,
      content: toolTopicForm.content,
      author: currentUser.displayName,
      createdAt: new Date().toISOString()
    };

    await DataAPI.saveToolTopic(topic);
    setToolTopicForm({ title: '', content: '' });
    triggerToast("Tema de herramienta guardado con éxito.");
    loadAllData();
  };

  const handleDeleteToolTopic = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este tema de herramienta permanentemente?")) {
      await DataAPI.deleteToolTopic(id);
      triggerToast("Tema de herramienta eliminado.");
      loadAllData();
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameForm.trim()) return;
    try {
      const isDuplicated = customCategoriesList.some(c => c.name.toLowerCase() === categoryNameForm.trim().toLowerCase());
      if (isDuplicated) {
        alert("Esta categoría ya existe.");
        return;
      }
      const cat: CustomCategory = {
        id: 'cat_' + Math.random().toString(36).substr(2, 9),
        name: categoryNameForm.trim(),
        createdAt: new Date().toISOString()
      };
      await DataAPI.saveCustomCategory(cat);
      setCategoryNameForm('');
      triggerToast("Categoría creada con éxito.");
      loadAllData();
    } catch (err: any) {
      alert("Error al guardar categoría: " + err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la categoría "${name}"?`)) {
      try {
        await DataAPI.deleteCustomCategory(id);
        triggerToast("Categoría eliminada.");
        loadAllData();
      } catch (err: any) {
        alert("Error al eliminar categoría: " + err.message);
      }
    }
  };

  // Meeting Form Submiter
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date || !meetingForm.time || !meetingForm.link) {
      alert("Por favor rellena todos los campos de la sesión.");
      return;
    }
    const final: Meeting = {
      id: 'meet_' + Math.random().toString(36).substr(2, 9),
      title: meetingForm.title,
      date: meetingForm.date,
      time: meetingForm.time,
      link: meetingForm.link,
      type: meetingForm.type as 'alumno' | 'mensualidad',
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveMeeting(final);
    await DataAPI.addNotificationBroadcast(
      `🎙️ Nueva Reunión: ${final.title}`,
      `Programada para el ${final.date} a las ${final.time}. ¡No te la pierdas!`,
      'meeting'
    );
    setMeetingForm({ title: '', date: '', time: '', link: '', type: 'alumno' });
    triggerToast("Reunión programada e interna notificada.");
    loadAllData();
  };

  const handleDeleteMeeting = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta sesión programada?")) {
      await DataAPI.deleteMeeting(id);
      triggerToast("Reunión eliminada.");
      loadAllData();
    }
  };

  // Notice Form Submiter
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return;
    const final: Notice = {
      id: 'not_' + Math.random().toString(36).substr(2, 9),
      title: noticeForm.title,
      content: noticeForm.content,
      urgent: !!noticeForm.urgent,
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveNotice(final);
    await DataAPI.addNotificationBroadcast(
      `📢 ${noticeForm.urgent ? 'Aviso urgente' : 'Aviso'}: ${final.title}`,
      final.content.substring(0, 100) + '...',
      'notice'
    );
    setNoticeForm({ title: '', content: '', urgent: false });
    triggerToast("Anuncio importante publicado.");
    loadAllData();
  };

  const handleDeleteNotice = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este aviso docente?")) {
      await DataAPI.deleteNotice(id);
      triggerToast("Aviso eliminado.");
      loadAllData();
    }
  };

  // Basic Tools Form Submiter
  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolForm.name || !toolForm.description || !toolForm.link) return;
    const final: TradingTool = {
      id: 'tool_' + Math.random().toString(36).substr(2, 9),
      name: toolForm.name,
      description: toolForm.description,
      link: toolForm.link,
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveTool(final);
    setToolForm({ name: '', description: '', link: '' });
    triggerToast("Herramienta académica agregada.");
    loadAllData();
  };

  const handleDeleteTool = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta herramienta académica?")) {
      await DataAPI.deleteTool(id);
      triggerToast("Herramienta removida.");
      loadAllData();
    }
  };

  // Promo Code Discounts Form Submiter
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.name || !discountForm.description || !discountForm.link || !discountForm.code) return;
    const final: DiscountRef = {
      id: 'dsc_' + Math.random().toString(36).substr(2, 9),
      name: discountForm.name,
      description: discountForm.description,
      link: discountForm.link,
      category: discountForm.category as 'fondeo' | 'herramientas',
      code: discountForm.code,
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveDiscount(final);
    setDiscountForm({ name: '', description: '', link: '', category: 'fondeo', code: '' });
    triggerToast("Cupón de descuento publicado.");
    loadAllData();
  };

  const handleDeleteDiscount = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este cupón de descuento?")) {
      await DataAPI.deleteDiscount(id);
      triggerToast("Cupón de descuento removido.");
      loadAllData();
    }
  };

  // Hall of fame Submiter
  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallForm.studentName || !hallForm.title || !hallForm.description || !hallForm.result || !hallForm.date) return;
    const final: HallOfFameEntry = {
      id: 'hof_' + Math.random().toString(36).substr(2, 9),
      studentName: hallForm.studentName,
      title: hallForm.title,
      description: hallForm.description,
      result: hallForm.result,
      date: hallForm.date,
      prize: hallForm.prize || '',
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveHallOfFame(final);
    setHallForm({ studentName: '', title: '', description: '', result: '', date: '', prize: '' });
    triggerToast("Ingreso agregado al Salón de la Fama.");
    loadAllData();
  };

  const handleDeleteHall = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este ingreso del Salón de la Fama?")) {
      await DataAPI.deleteHallOfFame(id);
      triggerToast("Premio removido del Hall.");
      loadAllData();
    }
  };

  // Strategies: Featured Submiter
  const handleSaveFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuredForm.name || !featuredForm.description || !featuredForm.parameters) return;
    const isEditing = !!featuredForm.id;
    const finalId = isEditing ? featuredForm.id! : 'sf_' + Math.random().toString(36).substr(2, 9);

    const final: StrategyFeatured = {
      id: finalId,
      name: featuredForm.name,
      description: featuredForm.description,
      parameters: featuredForm.parameters,
      author: featuredForm.author || 'Propio',
      comments: featuredForm.comments || '',
      createdAt: isEditing ? (featuredForm.createdAt || new Date().toISOString()) : new Date().toISOString(),
      orderIndex: Number(featuredForm.orderIndex) || 0,
      pinned: !!featuredForm.pinned,
      requiredMonths: Number(featuredForm.requiredMonths) || 0
    };
    await DataAPI.saveStrategyFeatured(final);
    
    if (!isEditing) {
      await DataAPI.addNotificationBroadcast(
        `⭐ Estrategia Destacada: ${final.name}`,
        `Nueva estrategia añadida por el claustro de profesores.`,
        'strategy'
      );
    }
    setFeaturedForm({ id: '', name: '', description: '', parameters: '', author: '', comments: '', orderIndex: 0, pinned: false, requiredMonths: 0 });
    triggerToast(isEditing ? "Estrategia destacada actualizada." : "Estrategia destacada guardada.");
    loadAllData();
  };

  const handleEditFeatured = (sf: StrategyFeatured) => {
    setFeaturedForm({
      id: sf.id,
      name: sf.name,
      description: sf.description,
      parameters: sf.parameters,
      author: sf.author || '',
      comments: sf.comments || '',
      orderIndex: sf.orderIndex || 0,
      pinned: !!sf.pinned,
      requiredMonths: sf.requiredMonths || 0,
      createdAt: sf.createdAt
    });
  };

  const handleDeleteFeatured = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta estrategia destacada?")) {
      await DataAPI.deleteStrategyFeatured(id);
      triggerToast("Estrategia destacada removida.");
      loadAllData();
    }
  };

  // Strategies: Historical Submiter
  const handleSaveHistorical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historicalForm.name || !historicalForm.description || !historicalForm.parameters) return;
    const final: StrategyHistorical = {
      id: 'sh_' + Math.random().toString(36).substr(2, 9),
      name: historicalForm.name,
      description: historicalForm.description,
      parameters: historicalForm.parameters,
      author: historicalForm.author || 'Equipo Titan',
      result: historicalForm.result || '',
      requiredMonths: Number(historicalForm.requiredMonths) || 0,
      createdAt: new Date().toISOString()
    };
    await DataAPI.saveStrategyHistorical(final);
    setHistoricalForm({ name: '', description: '', parameters: '', author: '', result: '', requiredMonths: 0 });
    triggerToast("Estrategia ganadora histórica agregada.");
    loadAllData();
  };

  const handleDeleteHistorical = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta estrategia histórica?")) {
      await DataAPI.deleteStrategyHistorical(id);
      triggerToast("Estrategia histórica eliminada.");
      loadAllData();
    }
  };



  return (
    <div id="admin-dashboard-container" className="space-y-6">
      
      {/* Dynamic Toast Feedback bar */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 py-3 px-5 bg-zinc-900 border border-emerald-500 text-emerald-400 text-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center gap-2 font-medium animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Admin Panel Header Banner */}
      <div className="bg-gradient-to-r from-violet-900/40 via-pink-900/25 to-blue-900/15 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-2xl animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-sans font-bold text-white tracking-tight">Centro de Control de Profesores ({currentUser.role.toUpperCase()})</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Controla las reuniones, suscripciones de alumnos, material docente y las estrategias comunitarias en tiempo real.</p>
          </div>
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2 overflow-x-auto">
        <button
          id="tab-btn-users"
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-zinc-900 border-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-4 h-4" /> Alumnos ({usersList.length})
        </button>
        <button
          id="tab-btn-meetings"
          onClick={() => setActiveTab('meetings')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'meetings' ? 'bg-zinc-900 border-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Video className="w-4 h-4" /> Sesiones Zoom/Meet
        </button>
        <button
          id="tab-btn-resources"
          onClick={() => setActiveTab('resources')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'resources' ? 'bg-zinc-900 border-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <BellRing className="w-4 h-4" /> Avisos y Herramientas
        </button>
        <button
          id="tab-btn-trading"
          onClick={() => setActiveTab('trading')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'trading' ? 'bg-zinc-900 border-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Layers className="w-4 h-4" /> Biblioteca de Trading
        </button>
        <button
          id="tab-btn-categories"
          onClick={() => setActiveTab('categories')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-zinc-900 border-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Layers className="w-4 h-4 text-violet-400" /> Categorías ({customCategoriesList.length})
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div id="tab-users-view" className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
          
          {/* Header & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider font-mono">Gestión de Alumnos, Roles y Sesiones</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Busca alumnos, gestiona penalizaciones, fotos o desbloquea meses a conveniencia.</p>
            </div>
            
            {/* Search Input Filter */}
            <div className="w-full md:w-80">
              <input
                id="admin-search-users"
                type="text"
                placeholder="🔍 Buscar por nombre o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-violet-500 rounded-xl py-2 px-3.5 text-xs text-white placeholder-zinc-500 font-sans"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-widest font-mono text-[10px]">
                  <th className="py-3 px-2">Alumno / Info</th>
                  <th className="py-3 px-2">Nombre Editable</th>
                  <th className="py-3 px-2">Correo</th>
                  <th className="py-3 px-2">Privilegios (Rol)</th>
                  <th className="py-3 px-2">Aprobado</th>
                  <th className="py-3 px-2">Suscripción (Mensual)</th>
                  <th className="py-3 px-2">Fecha Reg.</th>
                  <th className="py-3 px-1">Desbloqueos Manuales (Bypass de meses)</th>
                  <th className="py-3 px-2 text-right">Fuerza Bruta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {usersList
                  .filter(u => 
                    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-550 italic">Ningún alumno coincide con los filtros establecidos.</td>
                  </tr>
                ) : (
                  usersList
                    .filter(u => 
                      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => {
                      const isCurrentUserRow = user.uid === currentUser.uid;
                      const manualUnlocks = user.manualUnlocks || [];
                      const isExpanded = expandedUserUid === user.uid;
                      
                      return (
                        <React.Fragment key={user.uid}>
                          <tr id={`user-row-${user.uid}`} className={`hover:bg-zinc-900/10 transition-colors ${isExpanded ? 'bg-zinc-900/10' : ''}`}>
                            
                            {/* Photo Avatar & displays profile */}
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                {user.avatarUrl ? (
                                  <div className="relative group">
                                    <img 
                                      src={user.avatarUrl} 
                                      alt={user.displayName} 
                                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      id={`remove-user-avatar-${user.uid}`}
                                      onClick={() => handleRemovePhoto(user.uid)}
                                      title="Quitar foto (Incumple normas)"
                                      className="absolute -top-1 -right-1 bg-red-650 hover:bg-red-650 text-white p-0.5 rounded-full border border-zinc-950 scale-75 cursor-pointer text-[8px]"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 font-mono text-[10px]">
                                    {user.displayName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-white truncate max-w-[120px]">{user.displayName}</div>
                                  <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest">{user.role || 'SIN ROL'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Editable Display Name inline */}
                            <td className="py-3 px-2">
                              <input
                                id={`edit-username-input-${user.uid}`}
                                type="text"
                                defaultValue={user.displayName}
                                onBlur={(e) => handleUpdateName(user.uid, e.target.value)}
                                placeholder="Editar nombre..."
                                className="bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-violet-500 rounded p-1 text-xs text-white w-28 font-mono"
                              />
                            </td>

                            <td className="py-3 px-2 text-zinc-400 font-mono truncate max-w-[130px]">{user.email}</td>
                            
                            {/* Role selecting */}
                            <td className="py-3 px-2">
                              <select
                                id={`user-role-select-${user.uid}`}
                                value={user.role === null ? "" : user.role}
                                disabled={isCurrentUserRow}
                                onChange={(e) => handleRoleChange(user.uid, (e.target.value === "" ? null : e.target.value) as any)}
                                className="bg-zinc-950 border border-zinc-850 rounded-lg p-1.5 text-xs text-zinc-305 outline-none focus:border-violet-500 font-mono"
                              >
                                <option value="">Sin Rol (Pendiente)</option>
                                <option value="alumno">Alumno (Libre)</option>
                                <option value="miembro">Miembro (Comunidad)</option>
                                <option value="moderador">Moderador (Chat)</option>
                                <option value="colaborador">Colaborador</option>
                                <option value="administrador">Administrador</option>
                              </select>
                            </td>

                            {/* Approval Switch */}
                            <td className="py-3 px-2">
                              <button
                                id={`toggle-approved-btn-${user.uid}`}
                                onClick={() => handleToggleApproved(user.uid)}
                                disabled={isCurrentUserRow}
                                className={`flex items-center gap-1.5 py-1 px-2 rounded-lg text-[9px] font-bold tracking-wide font-mono transition-all ${
                                  user.approved 
                                  ? 'bg-violet-500/10 border border-violet-500/20 text-[#a78bfa]' 
                                  : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                                }`}
                              >
                                {user.approved ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-[#a78bfa]" />
                                    <span>APROBADO</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-rose-400" />
                                    <span>PENDIENTE</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Subscription Status Toggle */}
                            <td className="py-3 px-2">
                              <button
                                id={`toggle-sub-btn-${user.uid}`}
                                onClick={() => handleToggleMensualidad(user.uid)}
                                disabled={isCurrentUserRow}
                                className={`flex items-center gap-1.5 py-1 px-2 rounded-lg text-[9px] font-bold tracking-wide font-mono transition-all ${
                                  user.mensualidadActive 
                                  ? 'bg-emerald-500/10 border border-[#10b981]/20 text-emerald-400' 
                                  : 'bg-zinc-950 border border-zinc-850 text-zinc-500'
                                }`}
                              >
                                {user.mensualidadActive ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                    <span>SUSCRIPCIÓN ACTIVA</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-zinc-700" />
                                    <span>BLOQUEADO</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Registration Date */}
                            <td className="py-3 px-2 text-zinc-400 font-mono text-[10px] whitespace-nowrap">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/D'}
                            </td>

                            {/* Optional Bypass strategy locking manually */}
                            <td className="py-3 px-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {['1', '2', '3', '6', '12'].map((m) => {
                                  const isUnlocked = manualUnlocks.includes(m);
                                  return (
                                    <button
                                      id={`manual-unlock-${user.uid}-${m}`}
                                      key={m}
                                      onClick={() => handleToggleUnlock(user.uid, m)}
                                      title={`Bypasear bloqueo temporal de mes ${m} para este alumno`}
                                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                                        isUnlocked 
                                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-black' 
                                        : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-550'
                                      }`}
                                    >
                                      MEs {m}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Delete & Settings user buttons */}
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setExpandedUserUid(isExpanded ? null : user.uid)}
                                  className={`p-1 rounded transition-colors ${isExpanded ? 'text-pink-405 bg-pink-500/10' : 'text-zinc-500 hover:text-white'}`}
                                  title="Gestionar Antigüedad y Desbloqueos de Estrategias"
                                >
                                  <Settings className="w-4 h-4 cursor-pointer" />
                                </button>
                                <button
                                  id={`delete-user-btn-${user.uid}`}
                                  onClick={() => handleDeleteUser(user.uid)}
                                  disabled={isCurrentUserRow}
                                  title="Dar de baja permanente"
                                  className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-950/25 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>

                          </tr>

                          {/* Extended details panel with date joined inputs, block bypass locks, force unlocks etc. */}
                          {isExpanded && (
                            <tr className="bg-zinc-950/45 border-b border-zinc-850">
                              <td colSpan={9} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-left">
                                  
                                  {/* COL 1: ANTIGÜEDAD */}
                                  <div className="space-y-3 bg-zinc-900/10 p-4 rounded-xl border border-zinc-850">
                                    <h4 className="text-[10px] font-mono uppercase font-bold text-pink-400 tracking-wider">⏱️ Antigüedad de Membresía</h4>
                                    
                                    <div className="space-y-1">
                                      <label className="block text-zinc-400 text-[10px] uppercase font-mono tracking-wider">Fecha inicio como miembro:</label>
                                      <input
                                        type="date"
                                        value={user.memberJoinedAt ? user.memberJoinedAt.substring(0, 10) : (user.joinedAt ? user.joinedAt.substring(0, 10) : '')}
                                        onChange={(e) => handleUpdateMemberJoinedAt(user.uid, e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white font-mono text-xs"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-zinc-400 uppercase font-mono tracking-wider">Antigüedad Manual (Meses):</span>
                                        {user.manualSeniorityMonths !== undefined && user.manualSeniorityMonths !== null && (
                                          <button onClick={() => handleUpdateManualSeniority(user.uid, null)} className="text-pink-400 font-bold hover:underline">Reset</button>
                                        )}
                                      </div>
                                      <input
                                        type="number"
                                        min={0}
                                        placeholder="Ej: 3"
                                        value={user.manualSeniorityMonths !== undefined && user.manualSeniorityMonths !== null ? user.manualSeniorityMonths : ''}
                                        onChange={(e) => handleUpdateManualSeniority(user.uid, e.target.value === '' ? null : Number(e.target.value))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white font-mono text-xs"
                                      />
                                    </div>

                                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850 font-mono text-[10px] text-slate-400 space-y-1">
                                      <div>Antigüedad actual calculada: <strong className="text-white font-bold">{getUserSeniorityForDisplay(user)} {getUserSeniorityForDisplay(user) === 1 ? 'Mes' : 'Meses'}</strong></div>
                                      <div className="text-[9px] text-zinc-550 italic leading-snug">Calculado basándose en la fecha de alta real o valor establecido manualmente.</div>
                                    </div>
                                  </div>

                                  {/* COL 2: LIMITADORES */}
                                  <div className="space-y-3 bg-zinc-900/10 p-4 rounded-xl border border-zinc-850">
                                    <h4 className="text-[10px] font-mono uppercase font-bold text-violet-400 tracking-wider">🔒 Limitadores y Fuerza Bruta</h4>
                                    
                                    {/* Block unlocks check */}
                                    <label className="flex items-start gap-2.5 p-2 bg-zinc-950/70 rounded-lg border border-zinc-850 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!user.blockUnlocks}
                                        onChange={(e) => handleToggleBlockUnlocks(user.uid, e.target.checked)}
                                        className="rounded border-zinc-800 bg-zinc-900 text-purple-500 focus:ring-purple-500 w-4 h-4 mt-0.5"
                                      />
                                      <div>
                                        <span className="block text-white font-bold text-xs">Bloquear Desbloqueos</span>
                                        <span className="block text-[9px] text-zinc-500 leading-normal mt-0.5">Impide por completo que este usuario desbloquee estrategias usando su antigüedad.</span>
                                      </div>
                                    </label>

                                    {/* Force unlock bypass check */}
                                    <label className="flex items-start gap-2.5 p-2 bg-zinc-950/70 rounded-lg border border-zinc-850 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!user.manualForceUnlock}
                                        onChange={(e) => handleToggleForceUnlock(user.uid, e.target.checked)}
                                        className="rounded border-zinc-800 bg-zinc-900 text-purple-500 focus:ring-purple-500 w-4 h-4 mt-0.5"
                                      />
                                      <div>
                                        <span className="block text-white font-bold text-xs">Fuerza Bruta (Bypass total)</span>
                                        <span className="block text-[9px] text-zinc-500 leading-normal mt-0.5">Otorga acceso instantáneo a todas las estrategias en la academia.</span>
                                      </div>
                                    </label>
                                  </div>

                                  {/* COL 3: BYPASS MANUAL */}
                                  <div className="space-y-3 bg-zinc-900/10 p-4 rounded-xl border border-zinc-850">
                                    <h4 className="text-[10px] font-mono uppercase font-bold text-pink-400 tracking-wider">🎯 Desbloquear Manualmente</h4>
                                    <p className="text-[9px] text-zinc-500 leading-normal mb-2">Presiona una estrategia para concederle un bypass de antigüedad individual a este usuario:</p>

                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                      <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Estrategias Destacadas</div>
                                      {featuredStrats.map(sf => {
                                        const isUnlocked = (user.manualUnlocks || []).includes(sf.id);
                                        return (
                                          <button
                                            key={sf.id}
                                            onClick={() => handleToggleStrategyUnlock(user.uid, sf.id)}
                                            className={`w-full text-left p-1.5 rounded text-[9px] flex items-center justify-between border transition-colors ${
                                              isUnlocked 
                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold' 
                                              : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                            }`}
                                          >
                                            <span className="truncate max-w-[135px]">{sf.name}</span>
                                            <span className="text-[8px] font-mono shrink-0">{isUnlocked ? 'DESBLOQUEADO' : 'CERRADO'}</span>
                                          </button>
                                        );
                                      })}

                                      <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider font-mono mt-3">Estrategias Históricas</div>
                                      {historicalStrats.map(sh => {
                                        const isUnlocked = (user.manualUnlocks || []).includes(sh.id);
                                        return (
                                          <button
                                            key={sh.id}
                                            onClick={() => handleToggleStrategyUnlock(user.uid, sh.id)}
                                            className={`w-full text-left p-1.5 rounded text-[9px] flex items-center justify-between border transition-colors ${
                                              isUnlocked 
                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold' 
                                              : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                            }`}
                                          >
                                            <span className="truncate max-w-[135px]">{sh.name}</span>
                                            <span className="text-[8px] font-mono shrink-0">{isUnlocked ? 'DESBLOQUEADO' : 'CERRADO'}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MEETINGS MANAGEMENT */}
      {activeTab === 'meetings' && (
        <div id="tab-meetings-view" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Meeting Form */}
          <div className="lg:col-span-1 bg-zinc-900/45 border border-zinc-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono">Programar Nueva Sesión</h3>
            <form onSubmit={handleSaveMeeting} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Título de la Sesión</label>
                <input
                  id="meet-form-title"
                  type="text"
                  placeholder="Ej: Análisis Posició NY"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-500 mb-1">Fecha de Sesión</label>
                  <input
                    id="meet-form-date"
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Hora (Horario Local)</label>
                  <input
                    id="meet-form-time"
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Enlace de Zoom / Meet</label>
                <input
                  id="meet-form-link"
                  type="url"
                  placeholder="https://zoom.us/..."
                  value={meetingForm.link}
                  onChange={(e) => setMeetingForm({ ...meetingForm, link: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Tipo de Acceso / Restricción</label>
                <select
                  id="meet-form-type"
                  value={meetingForm.type}
                  onChange={(e) => setMeetingForm({ ...meetingForm, type: e.target.value as 'alumno' | 'mensualidad' })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                >
                  <option value="alumno">Público Alumno (Abierto)</option>
                  <option value="mensualidad">Comunidad de Mensualidad Activa (Restringido)</option>
                </select>
              </div>

              <button
                id="meet-form-submit"
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold rounded-lg mt-2 flex items-center justify-center gap-1.5 transition-all text-xs"
              >
                <Plus className="w-4 h-4" /> PUBLICAR REUNIÓN
              </button>
            </form>
          </div>

          {/* Scheduled Meetings List */}
          <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono">Sesiones Programadas Activas</h3>
            <div className="space-y-2.5">
              {meetingsList.length === 0 ? (
                <div className="text-center py-10 text-zinc-550 text-xs">No hay sesiones organizadas para esta semana.</div>
              ) : (
                meetingsList.map((m) => (
                  <div id={`meet-item-${m.id}`} key={m.id} className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{m.title}</span>
                        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase ${
                          m.type === 'mensualidad' 
                          ? 'bg-pink-500/10 border-pink-500/25 text-pink-400' 
                          : 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                        }`}>
                          {m.type === 'mensualidad' ? 'Mensualidad' : 'Alumno'}
                        </span>
                      </div>
                      <div className="text-zinc-400 font-mono flex items-center gap-2 text-[10px]">
                        <span>📆 {m.date}</span>
                        <span>⏰ {m.time}</span>
                        <a href={m.link} target="_blank" rel="noreferrer" className="text-blue-400 underline truncate max-w-xs">{m.link}</a>
                      </div>
                    </div>
                    <button
                      id={`delete-meet-${m.id}`}
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPORT MATERIALS & ALERTS */}
      {activeTab === 'resources' && (
        <div id="tab-resources-view" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SECTION: AVISOS / NOTICES */}
          <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono">Crear Avisos del Profesor</h3>
            <form onSubmit={handleSaveNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Título del Anuncio</label>
                <input
                  id="notice-form-title"
                  type="text"
                  placeholder="Ej: Mantenimiento del Broker"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Descripción / Contenido</label>
                <textarea
                  id="notice-form-content"
                  placeholder="Ingresa los detalles sobre el aviso o regla del mercado académico..."
                  rows={3}
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="notice-form-urgent"
                  type="checkbox"
                  checked={noticeForm.urgent}
                  onChange={(e) => setNoticeForm({ ...noticeForm, urgent: e.target.checked })}
                  className="rounded border-zinc-750 bg-zinc-950 text-violet-500 focus:ring-violet-500"
                />
                <label htmlFor="notice-form-urgent" className="text-zinc-300 font-medium cursor-pointer">Marcar como urgente (Aviso de alta volatilidad/Riesgo)</label>
              </div>

              <button
                id="notice-submit-btn"
                type="submit"
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors text-xs"
              >
                PUBLICAR AVISO
              </button>
            </form>

            <div className="h-[1px] bg-zinc-800 my-4" />

            <div className="space-y-2">
              {noticesList.map((n) => (
                <div id={`notice-el-${n.id}`} key={n.id} className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{n.title}</span>
                      {n.urgent && <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] px-1 rounded">Urgente</span>}
                    </div>
                    <p className="text-zinc-500 mt-0.5 max-w-md truncate">{n.content}</p>
                  </div>
                  <button id={`delete-notice-${n.id}`} onClick={() => handleDeleteNotice(n.id)} className="text-zinc-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: BASIC TOOLS & DISCOUNTS */}
          <div className="space-y-6">
            
            {/* Form Tools */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono">Herramientas Básicas Estudiantes</h3>
              <form onSubmit={handleSaveTool} className="space-y-2 text-xs">
                <input
                  id="tool-form-name"
                  type="text"
                  placeholder="Nombre de la Herramienta (Ej: TradingView Indicator)"
                  value={toolForm.name}
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
                <input
                  id="tool-form-desc"
                  type="text"
                  placeholder="Pequeña descripción"
                  value={toolForm.description}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
                <input
                  id="tool-form-link"
                  type="url"
                  placeholder="Enlace de descarga o hoja de cálculo"
                  value={toolForm.link}
                  onChange={(e) => setToolForm({ ...toolForm, link: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                />
                <button id="tool-submit-btn" type="submit" className="w-full py-2 bg-violet-600/20 hover:bg-violet-600/35 text-violet-400 font-bold border border-violet-500/20 rounded-lg text-xs">
                  AGREGAR HERRAMIENTA
                </button>
              </form>

              <div className="space-y-2">
                {toolsList.map((t) => (
                  <div id={`tool-el-${t.id}`} key={t.id} className="p-2.5 bg-zinc-950/40 border border-zinc-850 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{t.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono truncate max-w-xs block">{t.link}</span>
                    </div>
                    <button id={`delete-tool-${t.id}`} onClick={() => handleDeleteTool(t.id)} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo discounts */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono">Cupones y Promo Descuentos</h3>
              <form onSubmit={handleSaveDiscount} className="grid grid-cols-2 gap-2 text-xs">
                <input
                  id="disc-form-name"
                  type="text"
                  placeholder="Empresa (Ej: Funding Pips)"
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                />
                <input
                  id="disc-form-desc"
                  type="text"
                  placeholder="Detalle (Ej: 15% Descuento directo)"
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                  className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                />
                <input
                  id="disc-form-link"
                  type="url"
                  placeholder="Enlace promocional"
                  value={discountForm.link}
                  onChange={(e) => setDiscountForm({ ...discountForm, link: e.target.value })}
                  className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white font-mono"
                />
                <input
                  id="disc-form-code"
                  type="text"
                  placeholder="Código Cupon (Ej: TITAN25)"
                  value={discountForm.code}
                  onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white font-mono font-bold uppercase"
                />
                <select
                  id="disc-form-cat"
                  value={discountForm.category}
                  onChange={(e) => setDiscountForm({ ...discountForm, category: e.target.value as 'fondeo' | 'herramientas' })}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white"
                >
                  <option value="fondeo">Empresas Fondeo</option>
                  <option value="herramientas">Herramientas Trading</option>
                </select>

                <button id="disc-submit-btn" type="submit" className="col-span-2 py-2 bg-pink-600/20 hover:bg-pink-600/35 text-pink-400 font-bold border border-pink-500/20 rounded-lg text-xs">
                  AGREGAR CUPÓN DE DESCUENTO
                </button>
              </form>

              <div className="space-y-2">
                {discountsList.map((d) => (
                  <div id={`disc-el-${d.id}`} key={d.id} className="p-2.5 bg-zinc-950/40 border border-zinc-850 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{d.name} <span className="text-[10px] bg-pink-500/10 text-pink-400 py-0.5 px-1.5 rounded">{d.code}</span></span>
                      <span className="text-[10px] text-zinc-550 italic block">{d.description}</span>
                    </div>
                    <button id={`delete-disc-${d.id}`} onClick={() => handleDeleteDiscount(d.id)} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: TRADING LIBRARY & HALL OF FAME */}
      {activeTab === 'trading' && (
        <div id="tab-trading-view" className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Featured Strategies Admin Form */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 text-pink-400"><Flame className="w-4 h-4 text-pink-400" /> Estrategias Destacadas Académicas</h3>
              
              <form onSubmit={handleSaveFeatured} className="space-y-3 text-xs">
                <input
                  id="feat-strat-name"
                  type="text"
                  placeholder="Nombre de la Estrategia Destacada"
                  value={featuredForm.name}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-bold"
                />
                
                <textarea
                  id="feat-strat-desc"
                  placeholder="Explicación del método..."
                  rows={2}
                  value={featuredForm.description}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
                
                <input
                  id="feat-strat-param"
                  type="text"
                  placeholder="Parámetros técnicos (Ej: M15 / EMA 50 / USDJPY)"
                  value={featuredForm.parameters}
                  onChange={(e) => setFeaturedForm({ ...featuredForm, parameters: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="feat-strat-author"
                    type="text"
                    placeholder="Autor (Opcional)"
                    value={featuredForm.author}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, author: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                  />
                  <input
                    id="feat-strat-comments"
                    type="text"
                    placeholder="Comentarios del claustro"
                    value={featuredForm.comments}
                    onChange={(e) => setFeaturedForm({ ...featuredForm, comments: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                {/* Pin + Order Custom Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <div className="space-y-1">
                    <label className="block text-zinc-500 text-[9px] font-mono uppercase font-bold tracking-wider">Prioridad Orden</label>
                    <input
                      type="number"
                      placeholder="Índice (Ej: 0, 1, 2)"
                      value={featuredForm.orderIndex || 0}
                      onChange={(e) => setFeaturedForm({ ...featuredForm, orderIndex: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-zinc-500 text-[9px] font-mono uppercase font-bold tracking-wider">Antigüedad Exigida</label>
                    <select
                      value={featuredForm.requiredMonths || 0}
                      onChange={(e) => setFeaturedForm({ ...featuredForm, requiredMonths: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white text-[11px] font-mono h-[30px]"
                    >
                      <option value={0}>Inmediato (0)</option>
                      <option value={1}>1 mes</option>
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-center pt-2">
                    <label className="flex items-center gap-1.5 text-zinc-300 font-semibold cursor-pointer select-none text-[10px]">
                      <input
                        type="checkbox"
                        checked={featuredForm.pinned || false}
                        onChange={(e) => setFeaturedForm({ ...featuredForm, pinned: e.target.checked })}
                        className="rounded border-zinc-800 bg-zinc-900 text-pink-500 focus:ring-pink-500 w-3.5 h-3.5"
                      />
                      <span>Fijar arriba / Pin</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button id="feat-submit-btn" type="submit" className="flex-1 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-lg transition-colors text-xs flex items-center justify-center gap-1">
                    {featuredForm.id ? 'ACTUALIZAR ESTRATEGIA' : 'GUARDAR Y DESTACAR ESTRATEGIA'}
                  </button>
                  {featuredForm.id && (
                    <button
                      type="button"
                      onClick={() => setFeaturedForm({ id: '', name: '', description: '', parameters: '', author: '', comments: '', orderIndex: 0, pinned: false, requiredMonths: 0 })}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {featuredStrats.map((sf) => (
                  <div id={`feat-strat-el-${sf.id}`} key={sf.id} className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl flex items-center justify-between text-xs transition-all">
                    <div>
                      <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                        {sf.pinned && <Pin className="w-3 h-3 text-pink-400 rotate-45 shrink-0" />}
                        {sf.name}
                        {sf.requiredMonths > 0 && (
                          <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-1 rounded font-mono uppercase font-semibold">
                            Mes {sf.requiredMonths}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono block">Orden: {sf.orderIndex || 0} | Params: {sf.parameters}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button id={`edit-feat-${sf.id}`} onClick={() => handleEditFeatured(sf)} className="text-zinc-500 hover:text-white transition-colors" title="Editar">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button id={`delete-feat-${sf.id}`} onClick={() => handleDeleteFeatured(sf.id)} className="text-zinc-500 hover:text-red-400 transition-colors" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historical library Admin Form with Custom Months lock limit */}
            <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 text-violet-400"><Clock className="w-4 h-4 text-violet-400" /> Estrategias Ganadoras Históricas</h3>
              <form onSubmit={handleSaveHistorical} className="space-y-3 text-xs">
                <input
                  id="hist-strat-name"
                  type="text"
                  placeholder="Nombre Estratégia Histórica"
                  value={historicalForm.name}
                  onChange={(e) => setHistoricalForm({ ...historicalForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-bold"
                />
                <textarea
                  id="hist-strat-desc"
                  placeholder="Planos e indicaciones de este sistema ganador del pasado..."
                  rows={2}
                  value={historicalForm.description}
                  onChange={(e) => setHistoricalForm({ ...historicalForm, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
                <input
                  id="hist-strat-params"
                  type="text"
                  placeholder="Estructura técnica (Temporalidad, activos claves)"
                  value={historicalForm.parameters}
                  onChange={(e) => setHistoricalForm({ ...historicalForm, parameters: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    id="hist-strat-author"
                    type="text"
                    placeholder="Autor"
                    value={historicalForm.author}
                    onChange={(e) => setHistoricalForm({ ...historicalForm, author: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                  />
                  <input
                    id="hist-strat-res"
                    type="text"
                    placeholder="Resultado Histórico (Winrate)"
                    value={historicalForm.result}
                    onChange={(e) => setHistoricalForm({ ...historicalForm, result: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
                  />
                  <select
                    id="hist-strat-months"
                    value={historicalForm.requiredMonths}
                    onChange={(e) => setHistoricalForm({ ...historicalForm, requiredMonths: Number(e.target.value) })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono font-bold text-violet-400"
                  >
                    <option value={0}>Mes 0 (Libre)</option>
                    <option value={1}>Mes 1</option>
                    <option value={2}>Mes 2</option>
                    <option value={3}>Mes 3</option>
                    <option value={6}>Mes 6</option>
                    <option value={12}>Mes 12</option>
                  </select>
                </div>
                <button id="hist-submit-btn" type="submit" className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-colors text-xs flex items-center justify-center gap-1">
                  GUARDAR ESTRATEGIA A BIBLIOTECA
                </button>
              </form>

              <div className="space-y-2">
                {historicalStrats.map((sh) => (
                  <div id={`hist-strat-el-${sh.id}`} key={sh.id} className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{sh.name}</span>
                      <span className="text-[10px] text-violet-400 font-mono block">Suscripción Desbloqueo: {sh.requiredMonths} {sh.requiredMonths === 1 ? 'Mes' : 'Meses'}</span>
                    </div>
                    <button id={`delete-hist-${sh.id}`} onClick={() => handleDeleteHistorical(sh.id)} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Salón de la Fama Admin Form */}
          <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 text-yellow-400"><Award className="w-4 h-4 text-yellow-400" /> Salón de la Fama - Añadir Ganador</h3>
            <form onSubmit={handleSaveHall} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <input
                id="hall-form-student"
                type="text"
                placeholder="Nombre completo del Alumno"
                value={hallForm.studentName}
                onChange={(e) => setHallForm({ ...hallForm, studentName: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
              />
              <input
                id="hall-form-title"
                type="text"
                placeholder="Distinción (Ej: Ganador Trimestral Q2)"
                value={hallForm.title}
                onChange={(e) => setHallForm({ ...hallForm, title: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
              />
              <input
                id="hall-form-result"
                type="text"
                placeholder="Retorno Logrado (Ej: +42.5% Cuenta Real)"
                value={hallForm.result}
                onChange={(e) => setHallForm({ ...hallForm, result: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-bold"
              />
              <textarea
                id="hall-form-desc"
                placeholder="Cómo lo logró o descripción..."
                rows={2}
                value={hallForm.description}
                onChange={(e) => setHallForm({ ...hallForm, description: e.target.value })}
                className="col-span-1 md:col-span-3 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
              />
              <input
                id="hall-form-date"
                type="text"
                placeholder="Periodo/Fecha (Ej: Trimestre Abril-Junio 2026)"
                value={hallForm.date}
                onChange={(e) => setHallForm({ ...hallForm, date: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
              />
              <input
                id="hall-form-prize"
                type="text"
                placeholder="Premio Recibido (Ej: Fondeo $50k FTMO)"
                value={hallForm.prize}
                onChange={(e) => setHallForm({ ...hallForm, prize: e.target.value })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white"
              />
              <button id="hall-submit-btn" type="submit" className="py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-xs leading-none transition-colors">
                AGREGAR GANADOR
              </button>
            </form>

            <div className="space-y-2">
              {hallList.map((h) => (
                <div id={`hall-item-${h.id}`} key={h.id} className="p-3 bg-zinc-950/45 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{h.studentName} — {h.title}</span>
                    <span className="text-[10px] text-yellow-400 font-mono block">Logro: {h.result}</span>
                  </div>
                  <button id={`delete-hall-${h.id}`} onClick={() => handleDeleteHall(h.id)} className="text-zinc-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'categories' && (
        <div id="tab-categories-view" className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider font-mono">Gestión de Categorías para Recursos y Herramientas</h3>
            <p className="text-[10px] text-zinc-550 font-mono mt-0.5">Controla las clasificaciones de temas para que crezcan y filtren dinámicamente sin tocar código.</p>
          </div>

          <form onSubmit={handleSaveCategory} className="flex gap-2 max-w-md">
            <input
              type="text"
              required
              placeholder="Nueva Categoría (ej: Psicología, NinjaTrader,...)"
              value={categoryNameForm}
              onChange={(e) => setCategoryNameForm(e.target.value)}
              className="flex-grow bg-zinc-950 border border-zinc-805 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-sans"
            />
            <button
              type="submit"
              className="py-2 px-4 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {customCategoriesList.length === 0 ? (
              <p className="text-xs text-zinc-650 italic font-mono uppercase">No hay categorías personalizadas guardadas.</p>
            ) : (
              customCategoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl"
                >
                  <span className="font-semibold text-xs text-slate-200">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
