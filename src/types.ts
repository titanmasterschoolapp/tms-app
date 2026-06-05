/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'alumno' | 'miembro' | 'veterano' | 'old_school' | 'moderador' | 'colaborador' | 'administrador' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole | null;
  mensualidadActive: boolean;
  subscription: boolean;
  approved: boolean;
  avatarUrl?: string;
  manualUnlocks?: string[]; // IDs of historical strategies manually unlocked
  createdAt: string;
  joinedAt: string; // Dynamic date to calculate seniority (1-2-3-6 months)
  memberJoinedAt?: string; // Fecha inicio de membresía
  manualSeniorityMonths?: number; // Antigüedad actual editada manualmente
  blockUnlocks?: boolean; // Bloquear desbloqueos por antigüedad
  manualForceUnlock?: boolean; // Desbloquear manualmente todo
}

export interface ChatReply {
  id: string;
  userName: string;
  userRole: UserRole;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  userId?: string;
  status?: 'active' | 'pending_review' | 'rejected';
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  avatarUrl?: string;
  chatType: 'alumno' | 'comunidad';
  channelId?: string; // Links to dynamic chat channel
  status: 'active' | 'hidden' | 'pending_review';
  imageUrl?: string; // Optional image upload link
  documentUrl?: string; // Optional document link
  documentName?: string; // Optional document name
  reactions?: { [emoji: string]: string[] }; // { "🔥": ["uid1"] }
  createdAt: string;
  replies?: ChatReply[];
}

export interface ChatChannel {
  id: string;
  name: string;
  category: string; // Dynamic category/apartado: 'alumno' | 'comunidad' | 'Claustro' | 'Chat·General' etc.
  onlyStaffCanWrite: boolean;
  createdAt: string;
  type?: 'chat' | 'resources' | 'tools' | 'discounts' | 'meetings' | 'notices' | 'hof' | 'featured' | 'library';
  orderIndex?: number;
  pinned?: boolean;
  iconKey?: string; // Selected Lucide icon key matching ICON_GALLERY
  allowedRoles?: UserRole[]; // Custom role permissions
}

export interface ResourceReply {
  id: string;
  userName: string;
  userRole: UserRole;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  userId?: string;
  status?: 'active' | 'pending_review' | 'rejected';
}

export interface ResourceTopic {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isReleased?: boolean;
  releasedTo?: 'todos' | 'alumno' | 'miembro' | 'staff';
  allowedRoles?: UserRole[];
  replies?: ResourceReply[];
  
  // Dynamic controls
  pinned?: boolean;
  orderIndex?: number;
  commentsAllowed?: boolean; // false means read-only
  commentsTarget?: 'todos' | 'alumno' | 'staff' | 'ninguno'; // restrict writer roles
  isPrivate?: boolean; // resource is private (vs public)
  category?: string; // category classification name/id
}

export interface ToolReply {
  id: string;
  userName: string;
  userRole: UserRole;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  userId?: string;
  status?: 'active' | 'pending_review' | 'rejected';
}

export interface ToolTopic {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isReleased?: boolean;
  releasedTo?: 'todos' | 'alumno' | 'miembro' | 'staff';
  allowedRoles?: UserRole[];
  replies?: ToolReply[];

  // Dynamic controls
  pinned?: boolean;
  orderIndex?: number;
  commentsAllowed?: boolean;
  commentsTarget?: 'todos' | 'alumno' | 'staff' | 'ninguno';
  isPrivate?: boolean;
  category?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  link: string;
  type: 'alumno' | 'mensualidad';
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  urgent: boolean;
  createdAt: string;
}

export interface HallOfFameEntry {
  id: string;
  studentName: string;
  title: string;
  description: string;
  chartImage?: string;
  result: string;
  date: string;
  prize?: string;
  showPrize?: boolean;
  createdAt: string;
}

export interface StrategyFeatured {
  id: string;
  name: string;
  description: string;
  parameters: string;
  chartImage?: string;
  date?: string;
  author?: string;
  comments?: string;
  createdAt: string;
  orderIndex?: number;
  pinned?: boolean;
  requiredMonths?: number; // 0, 1, 3, 6, 12 months seniority requirement
}

export interface StrategyHistorical {
  id: string;
  name: string;
  description: string;
  parameters: string;
  chartImage?: string;
  author?: string;
  result?: string;
  requiredMonths: number; // Seniority restriction, e.g. 1, 2, 3, 6, 12 months
  createdAt: string;
}

export interface TradingTool {
  id: string;
  name: string;
  description: string;
  link: string;
  createdAt: string;
  type?: 'riesgo' | 'apalancamiento' | 'enlace';
  icon?: string;
  hidden?: boolean;
  orderIndex?: number;
}

export interface DiscountRef {
  id: string;
  name: string;
  description: string;
  link: string;
  category: 'fondeo' | 'herramientas';
  code: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: 'meeting' | 'notice' | 'strategy';
  createdAt: string;
  read: boolean;
}

export interface CustomCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface CategorizedCategory {
  id: string;
  channelId: string; // Parent ChatChannel's ID (e.g. 'pupil_chat', 'pupil_discounts', or custom)
  name: string;
  orderIndex: number;
  createdAt: string;
  allowedRoles?: UserRole[]; // Custom role permissions
}

export interface CategorizedSubChannel {
  id: string;
  channelId: string; // Parent ChatChannel's ID
  categoryId: string; // The parent CategorizedCategory's ID
  name: string; // e.g. '# general', '# apex', etc.
  orderIndex: number;
  readOnly?: boolean; // Toggles read-only mode where only staff can write
  createdAt: string;
  allowedRoles?: UserRole[]; // Custom role permissions
}

export interface CategorizedCoupon {
  id: string;
  channelId: string;
  subChannelId: string;
  name: string;
  coupon: string;
  description: string;
  code?: string;
  link?: string;
  active: boolean;
  orderIndex: number;
  createdAt: string;
  pinned?: boolean;
}

export interface FundingCompany {
  id: string;
  name: string;
  coupon: string;
  description: string;
  code?: string;
  link?: string;
  active: boolean;
  featured: boolean;
  orderIndex: number;
  createdAt: string;
  subChannelId?: string;
  pinned?: boolean;
}

export interface DashboardTexts {
  bienvenidoTitle: string;
  bienvenidoSubtitle: string;
  proximasClasesTitle: string;
  proximasClasesDesc: string;
  estatusSuscripcionTitle: string;
  estatusSuscripcionDesc: string;
  canalChatTitle: string;
  canalChatName: string;
  canalChatDesc: string;
  avisosUrgentesTitle: string;
  herramientaRapidaTitle: string;
  herramientaRapidaDesc: string;
  conveniosTitle: string;
  recursosTitleOverride: string;
  herramientasTitleOverride: string;
  herramientasSubtitleOverride: string;
  
  // New Editable Fields requested by user:
  avisosTitle?: string;
  avisosSubtitle?: string;
  sesionesTitle?: string;
  sesionesSubtitle?: string;
  recursosTitle?: string;
  recursosSubtitle?: string;
  herramientasTitle?: string;
  herramientasSubtitle?: string;
  discountsTitle?: string;
  discountsSubtitle?: string;
  chatGeneralTitle?: string;
  chatGeneralSubtitle?: string;
  comunidadTitle?: string;
  comunidadSubtitle?: string;
  hofTitle?: string;
  hofSubtitle?: string;
  featuredTitle?: string;
  featuredSubtitle?: string;
  historicalTitle?: string;
  historicalSubtitle?: string;

  // Index signature for dynamic dynamic created admin channels
  [key: string]: any;
}

