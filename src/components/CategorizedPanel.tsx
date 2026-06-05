import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  X, 
  MessageSquare, 
  Check, 
  Shield, 
  Sparkles, 
  CornerDownRight, 
  Lock, 
  Plus, 
  Trash2, 
  Settings, 
  HelpCircle, 
  Edit3, 
  Lightbulb, 
  Copy, 
  ExternalLink,
  Volume2,
  Menu,
  FileText,
  Info,
  Pin
} from 'lucide-react';
import { 
  ChatChannel, 
  UserProfile, 
  UserRole, 
  CategorizedCategory, 
  CategorizedSubChannel, 
  CategorizedCoupon,
  ChatMessage,
  FundingCompany
} from '../types';
import { DataAPI } from '../lib/db';
import { formatChannelName } from '../App';

interface CategorizedPanelProps {
  parentChannel: ChatChannel;
  currentUser: UserProfile;
  onRefreshParentChannels?: () => void;
}

export default function CategorizedPanel({ parentChannel, currentUser, onRefreshParentChannels }: CategorizedPanelProps) {
  const isStaff = ['administrador', 'colaborador'].includes(currentUser.role || '');
  const userRole = currentUser.role || 'none';
  const [categories, setCategories] = useState<CategorizedCategory[]>([]);
  const [subChannels, setSubChannels] = useState<CategorizedSubChannel[]>([]);
  const [coupons, setCoupons] = useState<CategorizedCoupon[]>([]);

  // Selected states
  const [selectedSubChannelId, setSelectedSubChannelId] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  // Modals / Editors
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormAllowedRoles, setCatFormAllowedRoles] = useState<UserRole[]>([]);
  const [catFormOrderIndex, setCatFormOrderIndex] = useState<number>(0);

  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subFormCategoryId, setSubFormCategoryId] = useState('');
  const [subFormName, setSubFormName] = useState('');
  const [subFormAllowedRoles, setSubFormAllowedRoles] = useState<UserRole[]>([]);
  const [subFormOrderIndex, setSubFormOrderIndex] = useState<number>(0);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CategorizedCoupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    name: '',
    coupon: '',
    description: '',
    code: '',
    link: '',
    active: true
  });

  // Edit Board Header Title Directly
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerFormName, setHeaderFormName] = useState('');

  // Scoped Chat Room States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [showImageForm, setShowImageForm] = useState(false);
  const [documentInputUrl, setDocumentInputUrl] = useState('');
  const [documentInputName, setDocumentInputName] = useState('');
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [subFormReadOnly, setSubFormReadOnly] = useState(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Active Thread Reply States
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadText, setThreadText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Common UI feedback modals
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Initial Load Core Collections
  const loadData = async (preferId?: string) => {
    try {
      const catsObj = await DataAPI.getCategorizedCategories(parentChannel.id);
      const subsObj = await DataAPI.getCategorizedSubChannels(parentChannel.id);
      
      const cats = [...catsObj].sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
      const subs = [...subsObj].sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

      let coups: CategorizedCoupon[] = [];
      if (parentChannel.type === 'discounts') {
        const fcs = await DataAPI.getFundingCompanies();
        coups = fcs.map((fc) => ({
          id: fc.id,
          channelId: parentChannel.id,
          subChannelId: fc.subChannelId || '',
          name: fc.name,
          coupon: fc.coupon,
          description: fc.description,
          code: fc.code || '',
          link: fc.link || '',
          active: fc.active,
          orderIndex: fc.orderIndex || 0,
          createdAt: fc.createdAt || new Date().toISOString(),
          pinned: !!fc.pinned
        }));
      } else {
        coups = await DataAPI.getCategorizedCoupons(parentChannel.id);
      }

      setCategories(cats);
      setSubChannels(subs);
      setCoupons(coups);

      // Default Active Selection setup
      const userRole = currentUser?.role || 'none';
      const isStaff = ['administrador', 'colaborador'].includes(userRole);

      // Filter subchannels by category permissions and subchannel permissions for default selection
      const allowedSubs = subs.filter(s => {
        if (isStaff) return true;
        
        // Find if parent category allows
        const parentCat = cats.find(c => c.id === s.categoryId);
        if (parentCat) {
          const isCatAllowed = !parentCat.allowedRoles || parentCat.allowedRoles.length === 0 || parentCat.allowedRoles.includes(userRole as any);
          if (!isCatAllowed) return false;
        }

        const isSubAllowed = !s.allowedRoles || s.allowedRoles.length === 0 || s.allowedRoles.includes(userRole as any);
        return isSubAllowed;
      });

      const activeId = preferId || selectedSubChannelId;
      if (allowedSubs.length > 0) {
        // If preferred/current exists, hold selection; else fallback to first allowed subchannel
        const checkExists = allowedSubs.some(s => s.id === activeId);
        if (checkExists) {
          setSelectedSubChannelId(activeId);
        } else {
          setSelectedSubChannelId(allowedSubs[0].id);
        }
      } else {
        setSelectedSubChannelId(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading categorized systems:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setHeaderFormName(parentChannel.name);
  }, [parentChannel.id]);

  // Scroll to top of window whenever active subchannel, active thread, or parent channel changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedSubChannelId, parentChannel.id, activeThreadId]);

  // Subscribe to scoped chat messages if the active subchannel is clicked and type is 'chat'
  useEffect(() => {
    if (!selectedSubChannelId || parentChannel.type !== 'chat') {
      setChatMessages([]);
      return;
    }

    const unsub = DataAPI.subscribeMessages(selectedSubChannelId, true, (msgs) => {
      const visibleMsgs = msgs.filter(m => 
        m.status === 'active' || 
        isStaff || 
        m.userId === currentUser.uid
      );
      setChatMessages(visibleMsgs);
      // Auto Scroll
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [selectedSubChannelId, parentChannel.type]);

  // Handle header title save
  const handleSaveHeaderTitle = async () => {
    if (!headerFormName.trim()) return;
    try {
      const updated = { ...parentChannel, name: headerFormName.trim() };
      await DataAPI.saveChatChannel(updated);
      setIsEditingHeader(false);
      if (onRefreshParentChannels) {
        onRefreshParentChannels();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // --- Category Handlers ---
  const handleOpenCatModal = (catId?: string) => {
    if (catId) {
      const cat = categories.find(c => c.id === catId);
      if (cat) {
        setEditingCatId(cat.id);
        setCatFormName(cat.name);
        setCatFormAllowedRoles(cat.allowedRoles || []);
        setCatFormOrderIndex(cat.orderIndex !== undefined ? cat.orderIndex : 0);
      }
    } else {
      setEditingCatId(null);
      setCatFormName('');
      setCatFormAllowedRoles([]);
      setCatFormOrderIndex(categories.length);
    }
    setShowCatModal(true);
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) return;

    try {
      const id = editingCatId || 'cat_' + Math.random().toString(36).substring(2, 11);
      const newCat: CategorizedCategory = {
        id,
        channelId: parentChannel.id,
        name: catFormName.trim(),
        orderIndex: Number(catFormOrderIndex),
        allowedRoles: catFormAllowedRoles,
        createdAt: new Date().toISOString()
      };
      await DataAPI.saveCategorizedCategory(newCat);
      setShowCatModal(false);
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Categoría',
      message: `¿Estás seguro de que deseas eliminar permanentemente la categoría "${name}"? Todo su contenido y canales asociados se verán inaccesibles.`,
      onConfirm: async () => {
        try {
          await DataAPI.deleteCategorizedCategory(catId);
          setConfirmModal(null);
          loadData();
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      }
    });
  };

  // --- SubChannel Handlers ---
  const handleOpenSubModal = (categoryId: string, subId?: string) => {
    setSubFormCategoryId(categoryId);
    if (subId) {
      const subObj = subChannels.find(s => s.id === subId);
      if (subObj) {
        setEditingSubId(subId);
        setSubFormName(subObj.name);
        setSubFormReadOnly(!!subObj.readOnly);
        setSubFormAllowedRoles(subObj.allowedRoles || []);
        setSubFormOrderIndex(subObj.orderIndex !== undefined ? subObj.orderIndex : 0);
      }
    } else {
      setEditingSubId(null);
      setSubFormName('');
      setSubFormReadOnly(false);
      setSubFormAllowedRoles([]);
      setSubFormOrderIndex(subChannels.filter(s => s.categoryId === categoryId).length);
    }
    setShowSubModal(true);
  };

  const handleSaveSubChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormName.trim()) return;

    try {
      const id = editingSubId || 'subchan_' + Math.random().toString(36).substring(2, 11);
      const cleanName = subFormName.trim().toLowerCase().replace(/[^a-z0-9\-_\s]/g, '').replace(/\s+/g, '-');

      const newSub: any = {
        id,
        channelId: parentChannel.id,
        categoryId: subFormCategoryId,
        name: cleanName,
        orderIndex: Number(subFormOrderIndex),
        readOnly: subFormReadOnly,
        allowedRoles: subFormAllowedRoles,
        createdAt: new Date().toISOString()
      };

      await DataAPI.saveCategorizedSubChannel(newSub);
      setShowSubModal(false);
      await loadData(id);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteSubChannel = (subId: string, name: string) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Canal del Chat',
      message: `¿Estás seguro de que deseas eliminar permanentemente el canal #${name}? Esta acción no se puede deshacer y borrará todo su historial.`,
      onConfirm: async () => {
        try {
          await DataAPI.deleteCategorizedSubChannel(subId);
          setConfirmModal(null);
          loadData();
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      }
    });
  };

  // --- Scoped Coupons Handlers ---
  const handleOpenCouponModal = (coup?: CategorizedCoupon) => {
    if (!selectedSubChannelId) {
      alert('Por favor selecciona un canal primero antes de añadir cupones.');
      return;
    }
    if (coup) {
      setEditingCoupon(coup);
      setCouponForm({
        name: coup.name,
        coupon: coup.coupon,
        description: coup.description,
        code: coup.code || '',
        link: coup.link || '',
        active: coup.active
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        name: '',
        coupon: '',
        description: '',
        code: '',
        link: '',
        active: true
      });
    }
    setShowCouponModal(true);
  };

  const handleSaveCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubChannelId) {
      alert("No hay ningún canal activo o seleccionado para guardar este elemento. Por favor crea o selecciona un canal primero.");
      return;
    }

    try {
      const id = editingCoupon ? editingCoupon.id : 'coup_' + Math.random().toString(36).substring(2, 11);
      
      if (parentChannel.type === 'discounts') {
        const fc: FundingCompany = {
          id,
          name: couponForm.name.trim(),
          coupon: couponForm.coupon.trim(),
          description: couponForm.description.trim(),
          code: couponForm.code.trim() || "",
          link: couponForm.link.trim() || "",
          active: couponForm.active,
          featured: false,
          orderIndex: editingCoupon ? (editingCoupon.orderIndex || 0) : coupons.length,
          createdAt: editingCoupon ? (editingCoupon.createdAt || new Date().toISOString()) : new Date().toISOString(),
          subChannelId: selectedSubChannelId,
          pinned: editingCoupon ? !!editingCoupon.pinned : false
        };
        await DataAPI.saveFundingCompany(fc);
      } else {
        const newCoup: CategorizedCoupon = {
          id,
          channelId: parentChannel.id,
          subChannelId: selectedSubChannelId,
          name: couponForm.name.trim(),
          coupon: couponForm.coupon.trim(),
          description: couponForm.description.trim(),
          code: couponForm.code.trim() || "",
          link: couponForm.link.trim() || "",
          active: couponForm.active,
          orderIndex: editingCoupon ? (editingCoupon.orderIndex || 0) : coupons.filter(c => c.subChannelId === selectedSubChannelId).length,
          createdAt: editingCoupon ? (editingCoupon.createdAt || new Date().toISOString()) : new Date().toISOString(),
          pinned: editingCoupon ? !!editingCoupon.pinned : false
        };
        await DataAPI.saveCategorizedCoupon(newCoup);
      }
      
      setShowCouponModal(false);
      await loadData(selectedSubChannelId);
      if (onRefreshParentChannels) {
        onRefreshParentChannels();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteCoupon = (coupId: string, name: string) => {
    setConfirmModal({
      show: true,
      title: parentChannel.type === 'resources' ? 'Eliminar Recurso' : 'Eliminar Convenio',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${name}"?`,
      onConfirm: async () => {
        try {
          if (parentChannel.type === 'discounts') {
            await DataAPI.deleteFundingCompany(coupId);
          } else {
            await DataAPI.deleteCategorizedCoupon(coupId);
          }
          setConfirmModal(null);
          loadData();
          if (onRefreshParentChannels) {
            onRefreshParentChannels();
          }
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      }
    });
  };

  // --- Scoped Chat Send Message ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubChannelId || (!inputText.trim() && !imageInputUrl.trim() && !documentInputUrl.trim())) return;
    setError(null);

    try {
      await DataAPI.sendChatMessage(
        inputText.trim(), 
        currentUser, 
        parentChannel.category === 'comunidad' ? 'comunidad' : 'alumno',
        selectedSubChannelId, // Isolated Scoped Channel ID
        imageInputUrl.trim() || undefined,
        documentInputUrl.trim() || undefined,
        documentInputName.trim() || undefined
      );
      setInputText('');
      setImageInputUrl('');
      setShowImageForm(false);
      setDocumentInputUrl('');
      setDocumentInputName('');
      setShowDocumentForm(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al enviar mensaje');
    }
  };

  const handleApproveMessage = async (msgId: string) => {
    try {
      await DataAPI.moderateMessage(msgId, 'approve');
    } catch (err: any) {
      alert('Error al aprobar: ' + err.message);
    }
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      await DataAPI.toggleMessageReaction(msgId, emoji, currentUser.uid);
    } catch (err: any) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent, msgId: string) => {
    e.preventDefault();
    if (!threadText.trim()) return;

    try {
      await DataAPI.postChatReply(msgId, threadText.trim(), currentUser);
      setThreadText('');
    } catch (err: any) {
      alert('Error al responder: ' + err.message);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Mensaje',
      message: '¿Estás seguro de que deseas eliminar este mensaje del chat técnico permanentemente?',
      onConfirm: async () => {
        try {
          await DataAPI.moderateMessage(msgId, 'delete');
          setConfirmModal(null);
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      }
    });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'administrador':
        return <span className="bg-rose-500/10 border border-rose-500/30 text-rose-455 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Staff</span>;
      case 'colaborador':
        return <span className="bg-blue-500/10 border border-blue-500/30 text-blue-455 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Colab</span>;
      case 'moderador':
        return <span className="bg-purple-500/10 border border-purple-500/30 text-purple-455 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Mod</span>;
      case 'miembro':
        return <span className="bg-pink-500/10 border border-pink-500/30 text-pink-455 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase text-[8px] font-black">Miembro VIP</span>;
      case 'veterano':
        return <span className="bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 border border-pink-500/35 text-pink-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase text-[8px] font-black">Veterano VIP</span>;
      case 'old_school':
        return <span className="bg-gradient-to-r from-orange-500/15 via-red-500/15 to-amber-500/15 border border-orange-500/35 text-orange-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase text-[8px] font-black">Old School</span>;
      default:
        return <span className="bg-zinc-900 border border-zinc-805 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">Alumno</span>;
    }
  };

  const getRoleColor = (role: UserRole) => {
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

  // Find active subchannel object
  const activeSubChannelObj = subChannels.find(s => s.id === selectedSubChannelId);
  const sortedCoupons = [...coupons].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0);
  });
  const scopedCoupons = sortedCoupons.filter(c => c.subChannelId === selectedSubChannelId);

  return (
    <div id={`categorized-workspace-${parentChannel.id}`} className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#0A0A0B] border border-white/5 p-5 rounded-3xl min-h-[580px] font-sans relative">
      
      {/* LEFT SIDEBAR PANEL: Categories & Channels (4 cols) */}
      <div className={`md:col-span-4 border-r border-white/5 md:pr-4 flex flex-col justify-between space-y-6 transition-all duration-300 ${
        isMobileListOpen 
          ? 'fixed inset-0 z-50 bg-[#0A0A0B]/98 backdrop-blur-md p-6 overflow-y-auto block' 
          : 'hidden md:flex'
      }`}>
        <div className="space-y-5 relative">
          {isMobileListOpen && (
            <button 
              type="button"
              onClick={() => setIsMobileListOpen(false)}
              className="md:hidden absolute -top-1 -right-1 p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* Main Title of the Panel (Editable!) */}
          <div className="pb-3 border-b border-white/5 flex items-center justify-between min-h-[38px] gap-2">
            <div className="flex-1 min-w-0">
              {isEditingHeader ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={headerFormName}
                    onChange={(e) => setHeaderFormName(e.target.value)}
                    className="w-full bg-[#121214] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHeaderTitle();
                    }}
                  />
                  <button onClick={handleSaveHeaderTitle} className="px-2 py-1 bg-purple-600 text-white text-[10px] rounded hover:bg-purple-700 font-bold uppercase transition-all shrink-0">Listo</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 h-full">
                  {parentChannel.type === 'discounts' ? (
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                  <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider break-words">
                    {parentChannel.name}
                  </h3>
                  {isStaff && (
                    <button 
                      onClick={() => setIsEditingHeader(true)} 
                      className="p-1 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-all shrink-0 cursor-pointer inline-flex items-center"
                      title="Editar título"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isStaff && (
              <button
                onClick={() => handleOpenCatModal()}
                className="py-1.5 px-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                title="Añadir Categoría Principal"
              >
                <Plus className="w-3.5 h-3.5" /> CATEGORÍA
              </button>
            )}
          </div>

          {/* Categories Render Lists */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <div className="text-left py-4 text-slate-650 text-xs italic">Ningún debate creado aún.</div>
            ) : (
              categories
                .filter((cat) => {
                  if (isStaff) return true;
                  return !cat.allowedRoles || cat.allowedRoles.length === 0 || cat.allowedRoles.includes(userRole as any);
                })
                .map((cat) => {
                  const catSubs = subChannels.filter(s => {
                    if (s.categoryId !== cat.id) return false;
                    if (isStaff) return true;
                    return !s.allowedRoles || s.allowedRoles.length === 0 || s.allowedRoles.includes(userRole as any);
                  });

                  return (
                    <div key={cat.id} className="space-y-1 text-left group/cat shadow-sm p-1.5 rounded-xl border border-white/[0.01] bg-[#0c0c0e]/30">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                        {cat.name}
                      </span>
                      {isStaff && (
                        <div className="flex items-center gap-1.5 opacity-40 group-hover/cat:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenSubModal(cat.id)}
                            className="p-1 hover:bg-zinc-800 text-purple-400 hover:text-purple-300 rounded cursor-pointer transition-all"
                            title="Crear Canal #"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenCatModal(cat.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded cursor-pointer transition-all"
                            title="Editar Categoría"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 hover:bg-rose-950 text-rose-500 hover:text-rose-455 rounded cursor-pointer transition-all"
                            title="Eliminar Categoría"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 pt-0.5">
                      {catSubs.map((sub) => {
                        const isSelected = selectedSubChannelId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              setSelectedSubChannelId(sub.id);
                              setActiveThreadId(null);
                              setIsMobileListOpen(false);
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
                              <span className="text-[11.5px] break-words font-sans tracking-tight">
                                {sub.name}
                              </span>
                            </div>

                            {isStaff && (
                              <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity gap-0.5 shrink-0 pl-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSubModal(cat.id, sub.id);
                                  }}
                                  className="p-0.5 hover:bg-purple-600/30 text-slate-400 hover:text-purple-300 rounded cursor-pointer"
                                title="Editar"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubChannel(sub.id, sub.name);
                                  }}
                                  className="p-0.5 hover:bg-rose-500/30 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {catSubs.length === 0 && (
                        <div className="px-3 py-1.5 text-[10px] text-zinc-600 block italic">Sin canales</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CENTRAL WORKSPACE: Scoped Chat OR Promo Codes (8 cols) */}
      <div className="md:col-span-8 flex flex-col h-full min-h-[500px]">
        {/* Mobile Header Menu Bar */}
        <div className="md:hidden flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileListOpen(true)}
              className="p-1.5 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer active:scale-95 transition-all flex items-center justify-center"
              title="Abrir Menú"
            >
              <Menu className="w-5 h-5 text-purple-400" />
            </button>
            <span className="text-xs font-bold text-slate-300 font-mono uppercase">
              # {activeSubChannelObj?.name || 'Seleccionar Canal'}
            </span>
          </div>
          {isStaff && (parentChannel.type === 'discounts' || parentChannel.type === 'resources') && selectedSubChannelId && (
            <button
              type="button"
              onClick={() => handleOpenCouponModal()}
              className="py-1 px-2.5 bg-gradient-to-r from-purple-650 to-pink-650 text-white font-bold rounded-lg text-[9px] uppercase cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {parentChannel.type === 'resources' ? 'RECURSO / TEMA' : 'CUPÓN'}
            </button>
          )}
        </div>

        {!selectedSubChannelId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0D0D10]/50 border border-white/5 rounded-3xl text-center space-y-3 min-h-[460px]">
            <HelpCircle className="w-10 h-10 text-slate-600 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-slate-350">Ningún canal activo</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Selecciona o crea una sala en el menú de la izquierda para desplegar tus contenidos.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full justify-between">
            
            {/* Sub-Channel Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 text-left">
              <div>
                <span className="text-[11px] font-mono text-purple-400 font-bold uppercase block tracking-wider">Módulo Activo</span>
                <h4 className="text-secondary font-bold text-xs flex items-center gap-1">
                  <span># {activeSubChannelObj?.name}</span>
                </h4>
              </div>

              {/* Action Button: Staff can Add Coupons if discounts or resources type */}
              {isStaff && (parentChannel.type === 'discounts' || parentChannel.type === 'resources') && (
                <button
                  onClick={() => handleOpenCouponModal()}
                  className="py-1.5 px-3 bg-gradient-to-r from-purple-650 to-pink-650 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl text-[10px] uppercase shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{parentChannel.type === 'resources' ? 'Crear Recurso / Tema' : 'Añadir Cupón/Partner'}</span>
                </button>
              )}
            </div>

            {/* CASE 1: IS DISCOUNTS FOR SUB-CHANNEL (Displays promotion cards) */}
            {parentChannel.type === 'discounts' && (
              <div className="flex-1 overflow-y-auto max-h-[480px] space-y-4 pr-1 text-left animate-fade-in">
                {scopedCoupons.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs italic bg-[#0F0F12]/30 border border-white/5 rounded-2xl">
                    No hay cupones cargados en #{activeSubChannelObj?.name} todavía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scopedCoupons.map((c) => {
                      const isPinned = !!c.pinned;
                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 bg-zinc-950/60 border rounded-2xl flex flex-col justify-between space-y-4 relative group hover:border-white/10 transition-all shadow-inner ${
                            isPinned ? 'border-purple-550/30 shadow-[0_0_12px_-4px_rgba(168,85,247,0.2)] bg-purple-950/5' : 'border-white/5'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-black font-sans text-purple-400 uppercase tracking-wide flex items-center gap-1">
                                {isPinned && <Pin className="w-3 h-3 text-purple-400 rotate-45 shrink-0" />}
                                {c.name}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full font-bold uppercase font-mono">
                                {c.coupon}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                              {c.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                            {c.code ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  Código: <strong className="text-white selection:bg-pink-400 font-mono">{c.code}</strong>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(c.code!);
                                      alert(`Código "${c.code}" copiado al portapapeles.`);
                                    }}
                                    className="px-2.5 py-1 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold uppercase hover:bg-purple-600/20 cursor-pointer transition-all flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" /> Copiar
                                  </button>
                                  {c.link && (
                                    <a
                                      href={c.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-slate-500 hover:text-white bg-white/5 rounded-lg border border-white/5"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              c.link && (
                                <a
                                  href={c.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold uppercase text-center block transition-all"
                                >
                                  Acceso Oficial ↗
                                </a>
                              )
                            )}
                          </div>

                          {/* Staff Edit Controls */}
                          {isStaff && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={async () => {
                                  try {
                                    const updated = {
                                      id: c.id,
                                      name: c.name,
                                      coupon: c.coupon,
                                      description: c.description,
                                      code: c.code || "",
                                      link: c.link || "",
                                      active: c.active,
                                      featured: false,
                                      orderIndex: c.orderIndex,
                                      createdAt: c.createdAt,
                                      subChannelId: selectedSubChannelId || '',
                                      pinned: !isPinned
                                    };
                                    await DataAPI.saveFundingCompany(updated);
                                    loadData();
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                className={`p-1 bg-zinc-900 border rounded-lg hover:text-white transition-all cursor-pointer ${
                                  isPinned ? 'border-purple-500 text-purple-400' : 'border-white/5 text-slate-450'
                                }`}
                                title={isPinned ? 'Desfijar' : 'Fijar arriba'}
                              >
                                <Pin className="w-3 h-3 rotate-45" />
                              </button>
                              <button
                                onClick={() => handleOpenCouponModal(c)}
                                className="p-1 bg-[#121214] border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-purple-500 transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(c.id, c.name)}
                                className="p-1 px-1.5 bg-zinc-900 border border-white/5 rounded-lg text-rose-500 hover:text-rose-400 hover:border-rose-500 transition-all cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CASES 2: IS RESOURCES FOR SUB-CHANNEL (Displays cleaner topics / lesson cards) */}
            {parentChannel.type === 'resources' && (
              <div className="flex-1 overflow-y-auto max-h-[480px] space-y-4 pr-1 text-left animate-fade-in">
                {scopedCoupons.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs italic bg-[#0F0F12]/30 border border-white/5 rounded-2xl">
                    No hay recursos ni temarios cargados en #{activeSubChannelObj?.name} todavía.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scopedCoupons.map((c) => {
                      const isPinned = !!c.pinned;
                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 bg-zinc-900/40 border rounded-2xl flex flex-col justify-between space-y-4 relative group hover:border-white/10 transition-all shadow-inner ${
                            isPinned ? 'border-purple-500/35 bg-purple-950/5 shadow-[0_0_12px_-4px_rgba(168,85,247,0.25)]' : 'border-white/5'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-white tracking-wide font-sans flex items-center gap-1">
                                {isPinned && <Pin className="w-3 h-3 text-purple-400 rotate-45 shrink-0" />}
                                {c.name}
                              </span>
                              {c.coupon && (
                                <span className="text-[8.5px] px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md font-bold uppercase tracking-wider font-sans">
                                  {c.coupon}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
                              {c.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                            {c.code ? (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Nota: <strong className="text-zinc-300 font-mono">{c.code}</strong>
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-650 font-mono">Titan Master Resource</span>
                            )}
                            
                            <div className="flex items-center gap-1.5 font-mono">
                              {c.code && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(c.code!);
                                    alert(`Nota copiada al portapapeles.`);
                                  }}
                                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-md text-[9px] font-bold uppercase cursor-pointer transition-all"
                                >
                                  Copiar Nota
                                </button>
                              )}
                              {c.link && (
                                <a
                                  href={c.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-[9px] font-bold uppercase cursor-pointer transition-all flex items-center gap-0.5"
                                >
                                  Acceder <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Staff Edit Controls */}
                          {isStaff && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={async () => {
                                  try {
                                    const updated = {
                                      ...c,
                                      pinned: !isPinned
                                    };
                                    await DataAPI.saveCategorizedCoupon(updated);
                                    loadData();
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                className={`p-1 bg-zinc-900 border rounded-lg hover:text-white transition-all cursor-pointer ${
                                  isPinned ? 'border-purple-500 text-purple-400' : 'border-white/5 text-slate-450'
                                }`}
                                title={isPinned ? 'Desfijar' : 'Fijar arriba'}
                              >
                                <Pin className="w-3 h-3 rotate-45" />
                              </button>
                              <button
                                onClick={() => handleOpenCouponModal(c)}
                                className="p-1 bg-[#121214] border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-purple-500 transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(c.id, c.name)}
                                className="p-1 px-1.5 bg-zinc-900 border border-white/5 rounded-lg text-rose-500 hover:text-rose-400 hover:border-rose-500 transition-all cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CASE 3: IS CHAT FOR SUB-CHANNEL (Displays isolated chat system) */}
            {parentChannel.type === 'chat' && (
              <div className="flex-1 flex flex-col justify-between h-full min-h-[440px]">
                
                {/* Messages feed */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto max-h-[380px] space-y-3.5 pr-2"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 text-xs italic bg-[#0F0F12]/30 border border-white/5 rounded-3xl">
                      No hay mensajes en #{activeSubChannelObj?.name} todavía. Sé el primero en escribir.
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const msgRoleColor = getRoleColor(msg.userRole);
                      const isOwn = msg.userId === currentUser.uid;
                      const isPendingReview = msg.status === 'pending_review';

                      return (
                        <div key={msg.id} className="space-y-1.5">
                          <div id={`scoped-msg-${msg.id}`} className={`flex items-start gap-2.5 p-2 rounded-2xl transition-all hover:bg-white/[0.01] relative group text-left ${isOwn ? 'bg-purple-500/[0.02]' : ''} ${isPendingReview ? 'border border-dashed border-amber-500/20 bg-amber-500/[0.01]' : ''}`}>
                            {msg.avatarUrl ? (
                              <img src={msg.avatarUrl} alt={msg.userName} className="w-8 h-8 rounded-full border border-white/5 object-cover shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                                {msg.userName.substring(0, 2)}
                              </div>
                            )}
 
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11.5px] font-semibold break-words ${msgRoleColor}`}>{msg.userName}</span>
                                {getRoleBadge(msg.userRole)}
                                <span className="text-[8px] text-slate-500 font-mono">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isPendingReview && (
                                  <span className="bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider flex items-center gap-1">
                                    🕒 PENDIENTE DE APROBACIÓN
                                  </span>
                                )}
                              </div>
 
                              <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed break-words whitespace-pre-wrap selection:bg-pink-600">
                                {msg.text}
                              </p>
 
                              {msg.imageUrl && (
                                <div className="mt-1.5 rounded-xl overflow-hidden border border-white/5 max-w-sm">
                                  <img src={msg.imageUrl} alt="Sube" className="max-h-52 object-contain" referrerPolicy="no-referrer" />
                                </div>
                              )}

                              {msg.documentUrl && (
                                <div className="mt-1.5 max-w-sm">
                                  <a 
                                    href={msg.documentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-zinc-950 hover:bg-[#121214] border border-white/5 rounded-2xl p-3 cursor-pointer select-none transition-all duration-300"
                                  >
                                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-[11px] font-bold text-white break-words font-sans">
                                        {msg.documentName || 'Documento adjunto'}
                                      </p>
                                      <p className="text-[8.5px] text-zinc-500 break-words font-mono uppercase tracking-wider mt-0.5">
                                        Descargar / Abrir Enlace ↗
                                      </p>
                                    </div>
                                  </a>
                                </div>
                              )}

                              {/* Reactions Bar UI */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {['❤️', '🔥', '👍', '😂', '🚀', '🎯'].map(emoji => {
                                  const voters = msg.reactions?.[emoji] || [];
                                  const hasVoted = voters.includes(currentUser.uid);
                                  if (voters.length === 0) return null;
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(msg.id, emoji)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] cursor-pointer transition-all ${
                                        hasVoted 
                                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 font-extrabold' 
                                          : 'bg-white/[0.01] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span>{voters.length}</span>
                                    </button>
                                  );
                                })}

                                {/* Quick Add Reaction Hover Bar */}
                                <div className="inline-flex items-center gap-1 ml-1">
                                  {['❤️', '🔥', '👍', '😂', '🚀', '🎯'].map(emoji => {
                                    const voters = msg.reactions?.[emoji] || [];
                                    if (voters.length > 0) return null; // already shown
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:scale-125 transition-all text-xs filter grayscale-[20%] hover:grayscale-0 cursor-pointer"
                                        title={`Reaccionar ${emoji}`}
                                      >
                                        {emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
 
                              {/* Thread Replies List */}
                              {msg.replies && msg.replies.length > 0 && (
                                <div className="mt-2.5 pl-3 border-l-2 border-purple-500/20 space-y-2">
                                  {msg.replies.map((rep) => (
                                    <div key={rep.id} className="text-left text-[10px] leading-relaxed py-0.5">
                                      <span className={`font-semibold ${getRoleColor(rep.userRole)}`}>{rep.userName}</span>: <span className="text-zinc-400">{rep.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
 
                              {/* Inline Thread drafting box */}
                              {activeThreadId === msg.id && (
                                <form onSubmit={(e) => handleSendReply(e, msg.id)} className="mt-2.5 flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-white/5">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Responder en debate..."
                                    value={threadText}
                                    onChange={(e) => setThreadText(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-[10.5px] text-white focus:outline-none placeholder-slate-600 font-sans px-1"
                                  />
                                  <button type="submit" className="p-1 px-2.5 bg-purple-600 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-purple-700 cursor-pointer">Enviar</button>
                                </form>
                              )}
                            </div>
 
                            {/* Message Actions */}
                            <div className="absolute right-2 top-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-[#121214] border border-white/5 p-1 rounded-xl shadow-md z-10">
                              {isStaff && isPendingReview && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveMessage(msg.id)}
                                  className="p-1 text-emerald-400 hover:text-white rounded hover:bg-emerald-600/20 transition-all text-[9px] font-bold uppercase flex items-center gap-1 mr-1"
                                  title="Aprobar enlace / adjunto"
                                >
                                  <Check className="w-3.5 h-3.5" /> Aprobar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveThreadId(activeThreadId === msg.id ? null : msg.id);
                                  setThreadText('');
                                }}
                                className="p-1 text-slate-500 hover:text-white rounded hover:bg-white/5 transition-all text-[9px] font-bold uppercase flex items-center gap-1"
                              >
                                <CornerDownRight className="w-3 h-3" /> Responder
                              </button>
                              {(isOwn || isStaff) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-500 rounded cursor-pointer transition-all"
                                  title="Eliminar mensaje"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
 
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
 
                {/* Scoped Chat Box */}
                {!(isStaff || (!parentChannel.onlyStaffCanWrite && !activeSubChannelObj?.readOnly)) ? (
                  // Empty space as a read-only channel to maintain clean interface
                  null
                ) : (
                  <form onSubmit={handleSendMessage} className="mt-4 border-t border-white/5 pt-3.5 space-y-2">
                    {error && <span className="text-[10px] text-rose-450 text-left block">⚠️ {error}</span>}
                    
                    {!isStaff && (imageInputUrl.trim() || documentInputUrl.trim() || /https?:\/\//i.test(inputText)) && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-550/30 p-2 px-3 rounded-xl text-[10px] text-amber-300 text-left">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Este mensaje contiene un enlace o archivo adjunto. Se enviará a moderación para revisión previa antes de ser público.</span>
                      </div>
                    )}

                    {showImageForm && (
                      <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/5 p-2 rounded-xl">
                        <input
                          type="url"
                          placeholder="Inserta el URL de tu imagen de análisis (ej: Discord o Lightshot)..."
                          value={imageInputUrl}
                          onChange={(e) => setImageInputUrl(e.target.value)}
                          className="flex-1 bg-transparent text-[11px] text-white focus:outline-none font-sans"
                        />
                        <button 
                          type="button" 
                          onClick={() => { setImageInputUrl(''); setShowImageForm(false); }}
                          className="text-slate-500 hover:text-white text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {showDocumentForm && (
                      <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl space-y-2 text-left">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            placeholder="Inserta el enlace del documento (PDF, Docs, Google Drive)..."
                            value={documentInputUrl}
                            onChange={(e) => setDocumentInputUrl(e.target.value)}
                            className="flex-1 bg-transparent text-[11px] text-white focus:outline-none font-sans border-b border-white/5 pb-1"
                          />
                          <button 
                            type="button" 
                            onClick={() => { setDocumentInputUrl(''); setDocumentInputName(''); setShowDocumentForm(false); }}
                            className="text-slate-500 hover:text-white text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Nombre descriptivo del documento (ej: Plantilla de Trading Plan)..."
                          value={documentInputName}
                          onChange={(e) => setDocumentInputName(e.target.value)}
                          className="w-full bg-transparent text-[10px] text-zinc-400 focus:outline-none font-sans"
                        />
                      </div>
                    )}
 
                    <div className="flex items-center gap-2 bg-[#0C0C0E] border border-white/5 rounded-2xl p-1.5 px-3">
                      <button
                        type="button"
                        onClick={() => { setShowImageForm(!showImageForm); setShowDocumentForm(false); }}
                        className={`p-1.5 rounded-xl cursor-pointer transition-all shrink-0 ${showImageForm ? 'text-purple-400 bg-white/5' : 'text-slate-450 hover:text-purple-400 hover:bg-white/5'}`}
                        title="Sube imagen"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowDocumentForm(!showDocumentForm); setShowImageForm(false); }}
                        className={`p-1.5 rounded-xl cursor-pointer transition-all shrink-0 ${showDocumentForm ? 'text-blue-400 bg-white/5' : 'text-slate-450 hover:text-blue-400 hover:bg-white/5'}`}
                        title="Sube documento / PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
 
                      <input
                        type="text"
                        placeholder={`Escribe un mensaje de debate en #${activeSubChannelObj?.name}...`}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 bg-transparent border-none text-[12px] text-white placeholder-slate-705 focus:outline-none font-sans py-1.5 px-2.5"
                      />
 
                      <button
                        type="submit"
                        disabled={!inputText.trim() && !imageInputUrl.trim() && !documentInputUrl.trim()}
                        className="p-2 py-2 px-3.5 bg-gradient-to-r from-purple-650 to-pink-650 disabled:from-zinc-900 disabled:to-zinc-900 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-md hover:scale-[1.01] transition-all cursor-pointer shrink-0"
                      >
                        <span>Enviar</span> <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
 
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- CATEGORY POPUP FORM MODAL --- */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                {editingCatId ? 'Editar Categoría' : 'Añadir Categoría Principal'}
              </h3>
              <button 
                onClick={() => setShowCatModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-350 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-mono uppercase font-bold text-left block">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="ej: GENERAL, COMUNIDAD, RECOMIENDOS"
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-550 text-left font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-mono uppercase font-bold text-left block">Orden de Visualización (Index)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={catFormOrderIndex}
                  onChange={(e) => setCatFormOrderIndex(Number(e.target.value))}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-550 text-left font-sans font-mono"
                />
                <span className="text-[9px] text-zinc-500 font-mono block text-left">Determina el orden de aparición (0 para el primero, luego 1, 2, etc.).</span>
              </div>

              {/* Category-Level Granular Permissions Configurator */}
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold text-left block">
                  Permisos de Acceso (Nada seleccionado = Público por Defecto)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B]/50 p-2.5 rounded-2xl border border-white/5 text-left text-xs text-zinc-300">
                  {[
                    { val: 'none', label: 'Sin Rol' },
                    { val: 'alumno', label: 'Alumno' },
                    { val: 'miembro', label: 'Miembro' },
                    { val: 'veterano', label: 'Veterano' },
                    { val: 'old_school', label: 'Old School' },
                    { val: 'moderador', label: 'Moderador' },
                    { val: 'colaborador', label: 'Colaborador' },
                    { val: 'administrador', label: 'Administrador' }
                  ].map((robj) => {
                    const isChecked = catFormAllowedRoles.includes(robj.val as any);
                    return (
                      <label key={robj.val} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCatFormAllowedRoles(catFormAllowedRoles.filter(r => r !== robj.val));
                            } else {
                              setCatFormAllowedRoles([...catFormAllowedRoles, robj.val as any]);
                            }
                          }}
                          className="accent-purple-500 rounded shrink-0"
                        />
                        <span className="text-[11px]">{robj.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-350 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-gradient-to-r from-purple-650 to-pink-650 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SUBCHANNEL POPUP FORM MODAL --- */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                {editingSubId ? 'Editar Canal #' : 'Añadir Canal #'}
              </h3>
              <button 
                onClick={() => setShowSubModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-350 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubChannelSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-mono uppercase font-bold text-left block">Nombre del Canal</label>
                <input
                  type="text"
                  required
                  placeholder="ej: general, btc-debate, apex, e2t"
                  value={subFormName}
                  onChange={(e) => setSubFormName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-550 text-left font-sans"
                />
                <span className="text-[9px] text-slate-500 font-mono block text-left">Se convertirá automáticamente al formato slug sin espacios ni caracteres especiales.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-450 font-mono uppercase font-bold text-left block">Orden de Visualización del Canal (Index)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={subFormOrderIndex}
                  onChange={(e) => setSubFormOrderIndex(Number(e.target.value))}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-550 text-left font-sans font-mono"
                />
                <span className="text-[9px] text-zinc-550 font-mono block text-left">Determina el orden de aparición dentro de su categoría parent.</span>
              </div>

              {/* ReadOnly permissions checkbox toggler */}
              <div className="flex items-center space-x-2 pt-1 pb-1 text-left">
                <input
                  type="checkbox"
                  id="sub-readonly-chk"
                  checked={subFormReadOnly}
                  onChange={(e) => setSubFormReadOnly(e.target.checked)}
                  className="accent-purple-500 rounded shrink-0"
                />
                <label htmlFor="sub-readonly-chk" className="text-[11px] text-zinc-300 font-semibold cursor-pointer select-none">
                  Canal en modo Solo lectura
                </label>
              </div>

              {/* Sub-Channel Level Granular Permissions Configurator */}
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                <label className="text-[10px] text-zinc-400 font-mono uppercase font-bold text-left block">
                  Permisos de Acceso del Canal (Nada seleccionado = Hereda de Categoría)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B]/50 p-2.5 rounded-2xl border border-white/5 text-left text-xs text-zinc-300">
                  {[
                    { val: 'none', label: 'Sin Rol' },
                    { val: 'alumno', label: 'Alumno' },
                    { val: 'miembro', label: 'Miembro' },
                    { val: 'veterano', label: 'Veterano' },
                    { val: 'old_school', label: 'Old School' },
                    { val: 'moderador', label: 'Moderador' },
                    { val: 'colaborador', label: 'Colaborador' },
                    { val: 'administrador', label: 'Administrador' }
                  ].map((robj) => {
                    const isChecked = subFormAllowedRoles.includes(robj.val as any);
                    return (
                      <label key={robj.val} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-white transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSubFormAllowedRoles(subFormAllowedRoles.filter(r => r !== robj.val));
                            } else {
                              setSubFormAllowedRoles([...subFormAllowedRoles, robj.val as any]);
                            }
                          }}
                          className="accent-purple-500 rounded shrink-0"
                        />
                        <span className="text-[11px]">{robj.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-355 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-gradient-to-r from-purple-650 to-pink-650 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Guardar Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- COUPON POPUP FORM MODAL --- */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                {parentChannel.type === 'resources'
                  ? (editingCoupon ? 'Editar Recurso / Tema' : 'Crear Recurso / Tema')
                  : (editingCoupon ? 'Editar Partner / Promo' : 'Cargar Partner / Promo')
                }
              </h3>
              <button 
                onClick={() => setShowCouponModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-350 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCouponSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                  {parentChannel.type === 'resources' ? 'Título del Recurso' : 'Nombre de la Firma / Servicio'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={parentChannel.type === 'resources' ? "ej: Manual de Psicotrading, CheatSheet de Patrones" : "ej: Apex Trader Funding, TradingView"}
                  value={couponForm.name}
                  onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                  {parentChannel.type === 'resources' ? 'Etiqueta o Tag del Tema (ej: ¡NUEVO!, ¡IMPORTANTE!)' : 'Etiqueta de Descuento (Badge)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={parentChannel.type === 'resources' ? "ej: ¡PDF DESCARGABLE!, ¡VIDEO EXPLICATIVO!" : "ej: ¡80% DESCUENTO ACTIVO!, ¡40% REEMBOLSO!"}
                  value={couponForm.coupon}
                  onChange={(e) => setCouponForm({ ...couponForm, coupon: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-550"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                  {parentChannel.type === 'resources' ? 'Contenido o Descripción del Recurso' : 'Descripción de Beneficios'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={parentChannel.type === 'resources' ? "Detalla los contenidos del recurso o tema, guías paso a paso..." : "Explica qué incluye la promoción, de manera detallada y atractiva..."}
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-550 font-sans text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                    {parentChannel.type === 'resources' ? 'Código de Acceso / Nota corta (Opcional)' : 'Código Promocional (Opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={parentChannel.type === 'resources' ? "ej: CONTRASEÑA123" : "ej: TITAN80"}
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
                    {parentChannel.type === 'resources' ? 'Enlace del Recurso (Opcional)' : 'Enlace de Registro (Opcional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={couponForm.link}
                    onChange={(e) => setCouponForm({ ...couponForm, link: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-350 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-gradient-to-r from-purple-650 to-pink-650 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Guardar Promoción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DIALOG MODAL --- */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl w-full max-w-sm p-6 text-center space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider font-mono">{confirmModal.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{confirmModal.message}</p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer uppercase"
              >
                Confirmar Borrado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
