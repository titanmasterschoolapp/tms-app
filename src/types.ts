/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'alumno' | 'miembro' | 'moderador' | 'colaborador' | 'administrador' | 'none';

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
}

export interface ChatReply {
  id: string;
  userName: string;
  userRole: UserRole;
  avatarUrl?: string;
  text: string;
  createdAt: string;
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
  createdAt: string;
  replies?: ChatReply[];
}

export interface ChatChannel {
  id: string;
  name: string;
  category: 'Chat·General' | 'Comunidad' | 'Claustro';
  onlyStaffCanWrite: boolean;
  createdAt: string;
}

export interface ResourceReply {
  id: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}

export interface ResourceTopic {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isReleased?: boolean;
  releasedTo?: 'todos' | 'alumno' | 'miembro' | 'staff';
  replies?: ResourceReply[];
  
  // Dynamic controls
  pinned?: boolean;
  orderIndex?: number;
  commentsAllowed?: boolean; // false means read-only
  commentsTarget?: 'todos' | 'alumno' | 'staff'; // restrict writer roles
  isPrivate?: boolean; // resource is private (vs public)
  category?: string; // category classification name/id
}

export interface ToolReply {
  id: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}

export interface ToolTopic {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isReleased?: boolean;
  releasedTo?: 'todos' | 'alumno' | 'miembro' | 'staff';
  replies?: ToolReply[];

  // Dynamic controls
  pinned?: boolean;
  orderIndex?: number;
  commentsAllowed?: boolean;
  commentsTarget?: 'todos' | 'alumno' | 'staff';
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
