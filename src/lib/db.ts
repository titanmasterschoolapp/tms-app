/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';

import { db, auth, isFirebaseConfigured } from '../firebase';
import { 
  UserProfile, 
  ChatMessage, 
  ChatReply,
  Meeting, 
  Notice, 
  HallOfFameEntry, 
  StrategyFeatured, 
  StrategyHistorical, 
  TradingTool, 
  DiscountRef, 
  AppNotification,
  UserRole,
  ChatChannel,
  ResourceTopic,
  ToolTopic,
  ResourceReply,
  ToolReply,
  CustomCategory,
  FundingCompany,
  DashboardTexts,
  CategorizedCategory,
  CategorizedSubChannel,
  CategorizedCoupon
} from '../types';

// Error handling based on firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively sanitizes a data object for Firestore:
 * 1. Replaces `undefined` or `null` values with empty strings "".
 * 2. This prevents any 'Function setDoc() called with invalid data. Unsupported field value: undefined' errors.
 */
export function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return "";
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanFirestoreData(item));
  }
  const cleaned: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined || val === null) {
      cleaned[key] = "";
    } else {
      cleaned[key] = cleanFirestoreData(val);
    }
  }
  return cleaned;
}

// Validation connection to Firestore on boot as per guidelines
async function testFirestoreConnection() {
  if (isFirebaseConfigured && db) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration: Client is offline.");
      }
    }
  }
}
testFirestoreConnection();

// Initial seed data for the localStorage fallback
const SEED_MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: 'Sesión Operativa en Vivo - Apertura de London & NY',
    date: '2026-06-01',
    time: '08:00',
    link: 'https://zoom.us/j/test-titan-1',
    type: 'alumno',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm2',
    title: 'Masterclass: Análisis de Liquidez y Bloques de Ordenes Avanzados',
    date: '2026-06-03',
    time: '19:00',
    link: 'https://meet.google.com/test-titan-2',
    type: 'mensualidad',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm3',
    title: 'Consultoría Grupal de Psicotrading y Gestión del Riesgo',
    date: '2026-06-05',
    time: '17:30',
    link: 'https://zoom.us/j/test-titan-3',
    type: 'alumno',
    createdAt: new Date().toISOString()
  }
];

const SEED_NOTICES: Notice[] = [
  {
    id: 'n1',
    title: '⚠️ Alta Volatilidad: Datos de Empleos Agrícolas (NFP) Mañana',
    content: 'Se espera un fuerte movimiento en el dólar y el oro mañana. Recuerden reducir el apalancamiento al 50% de lo habitual o abstenerse de operar durante el comunicado.',
    urgent: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'n2',
    title: 'Nueva Herramienta Disponible: Calculadora de Riesgo Integrada',
    content: 'Hemos añadido la Calculadora de Lotes Titan directo en tu panel de Alumno. Úsala para calcular la posición exacta según tus pips de Stop Loss.',
    urgent: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
  }
];

const SEED_HALL_OF_FAME: HallOfFameEntry[] = [
  {
    id: 'hof1',
    studentName: 'Mateo Rodríguez',
    title: '🏆 Ganador Trimestral Q1 2026',
    description: 'Implementación perfecta de la Estrategia Fractal H4 en el par EUR/USD. Logró una efectividad del 78% con un ratio riesgo/beneficio promedio de 1:3.',
    result: '+34.5% Cuenta Real',
    date: 'Enero - Marzo 2026',
    prize: 'Cuenta Fondeada $50,000 USD (Funding Pips)',
    createdAt: new Date().toISOString()
  },
  {
    id: 'hof2',
    studentName: 'Sofía Valenzuela',
    title: '⚡ Estratégia de Alto Rendimiento',
    description: 'Operación perfecta de caza de liquidez en USD/JPY durante sesión asiática. Excelente paciencia esperando la confirmación de quiebre de estructura estructural (MSB).',
    result: '+18.2% en una semana',
    date: 'Mayo 2026',
    prize: 'Pase Premium VIP de por vida',
    createdAt: new Date().toISOString()
  }
];

const SEED_STRATEGIES_FEATURED: StrategyFeatured[] = [
  {
    id: 'sf1',
    name: 'Caza de Liquidez Interna (ASI-NY Split)',
    description: 'Estrategia basada en identificar el máximo y mínimo de la sesión de Asia, buscar falsas rupturas (Judas Swing) durante la sesión de Londres, y tomar la tendencia en Nueva York.',
    parameters: 'Temporalidad: M15/M5. Activo: EUR/USD, GBP/USD. Sesiones: Asia (20:00-02:00 EST), NY (08:00-11:00 EST).',
    date: '2026-05-25',
    author: 'Equipo Titan Premium',
    comments: 'Excelente para traders que les apasiona operar el London Close o la apertura americana.',
    createdAt: new Date().toISOString()
  }
];

const SEED_STRATEGIES_HISTORICAL: StrategyHistorical[] = [
  {
    id: 'sh_0',
    name: 'Estrategia Fractal H4 (Acceso Inmediato)',
    description: 'Análisis de estructura macro para identificar tendencias institucionales. Uso de retrocesos de Fibonacci del 61.8% y 78.6% alineados con el sesgo diario.',
    parameters: 'Temporalidad: H4 (Estructura) y H1/M15 (Entradas). Activo: Índices (NAS100, US30) y Divisas mayores.',
    author: 'Santi Scalper',
    result: 'Ratio promedio 1:2.5',
    requiredMonths: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sh_1',
    name: 'Rompimiento de Rango Diario (Desbloquea al Mes 1)',
    description: 'Estrategia de breakout de volatilidad utilizando el canal de Donchian modificado para capturar expansiones de momentum tras periodos prolongados de compresión de precios.',
    parameters: 'Temporalidad: Diario/H1. Activo: Gold (XAU/USD), GBP/JPY.',
    author: 'Pro-Trader Titan',
    result: 'Efectividad histórica 62%',
    requiredMonths: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sh_2',
    name: 'Rebote en Bloque de Ordenes (Desbloquea al Mes 2)',
    description: 'Detección automática de Order Blocks de alta probabilidad (última vela contraria antes de un movimiento fuerte que deja FVG - Fair Value Gap).',
    parameters: 'Temporalidad: H1. Filtro: Validado con volumen institucional y manipulación previa de máximos o mínimos.',
    author: 'Admin Titan',
    result: 'Ratio promedio 1:4',
    requiredMonths: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sh_3',
    name: 'Modelo de Compra-Venta de Market Maker (Desbloquea al Mes 3)',
    description: 'El modelo insignia de Smart Money Concepts (SMC). Mapeo del Market Maker Buy Model (MMBM) e identificación de fases de redistribución, acumulación y reversión en el bloque de mitigación.',
    parameters: 'Temporalidad: M15. Activo: EUR/USD, GBP/USD.',
    author: 'Socio VIP',
    result: 'Retorno histórico +8.4% mensual',
    requiredMonths: 3,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sh_6',
    name: 'Estrategia Algorítmica de Reversión a la Media (Desbloquea al Mes 6)',
    description: 'Modelo cuantitativo simplificado basado en Bandas de Bollinger y el oscilador estocástico ajustado para reversiones de precio cuando el mercado excede el 2.5 de desviación estándar.',
    parameters: 'Temporalidad: M30. Activo: Índices Bursátiles y Cripto Divisas.',
    author: 'Quant Titan Team',
    result: 'Bajo Drawdown max 4%',
    requiredMonths: 6,
    createdAt: new Date().toISOString()
  }
];

const SEED_TOOLS: TradingTool[] = [
  {
    id: 't1',
    name: 'Calculadora de Riesgo',
    description: 'Calcula automáticamente el tamaño de posición según el riesgo definido.',
    link: '#lot-calculator',
    type: 'riesgo',
    icon: 'Percent',
    hidden: false,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    name: 'Calculadora de Apalancamiento',
    description: 'Calcula tu apalancamiento efectivo, margen requerido y valor del pip según el lote y activo.',
    link: '#leverage-calculator',
    type: 'apalancamiento',
    icon: 'Activity',
    hidden: false,
    orderIndex: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 't3',
    name: 'Bitácora de Trading automatizada (Excel Premium)',
    description: 'Descarga nuestra plantilla de Excel optimizada para llevar un registro profesional de tus operaciones, estadísticas de winrate, profit factor, ratio R:R y análisis emocional.',
    link: 'https://docs.google.com/spreadsheets/d/test-excel-titan/copy',
    type: 'enlace',
    icon: 'BookOpen',
    hidden: false,
    orderIndex: 2,
    createdAt: new Date().toISOString()
  }
];

const SEED_DISCOUNTS: DiscountRef[] = [
  {
    id: 'd1',
    name: 'Funding Pips - 10% de Descuento Especial',
    description: 'Usa nuestro código institucional en la plataforma de fondeo Funding Pips para obtener un 10% de descuento directo en cualquier evaluación.',
    link: 'https://fundingpips.com/?ref=titan',
    category: 'fondeo',
    code: 'TITAN10',
    createdAt: new Date().toISOString()
  },
  {
    id: 'd2',
    name: 'FTMO - 5% Cashback & Retos Exclusivos',
    description: 'Accede a un descuento directo en tus cuentas de evaluación con FTMO, la firma número 1 recomendada por nuestra academia.',
    link: 'https://ftmo.com/es/?affiliate=titan5',
    category: 'fondeo',
    code: 'TITANFTMO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'd3',
    name: 'TradingView - 30% DE DESCUENTO',
    description: 'Descuento especial por suscripción anual a las herramientas esenciales de análisis técnico, alertas de mercado e indicadores avanzados.',
    link: 'https://tradingview.com/?aff=titan30',
    category: 'herramientas',
    code: 'TITANTVIEW30',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_DASHBOARD_TEXTS: DashboardTexts = {
  bienvenidoTitle: 'TITAN MASTER SCHOOL',
  bienvenidoSubtitle: 'Tienes estatus académico disponible como miembro pleno de la sala de simulación institucional. Todo tu material se actualiza de forma automática en tiempo real de lunes a viernes.',
  proximasClasesTitle: 'Próximas Clases',
  proximasClasesDesc: 'Programadas en Zoom / Google Meet para esta semana.',
  estatusSuscripcionTitle: 'Estatus Suscripción',
  estatusSuscripcionDesc: 'Permite acceder a Comunidad y Estrategias Pro.',
  canalChatTitle: 'Canal de Chat Colectivo',
  canalChatName: '# chat-alumnos',
  canalChatDesc: 'Únete a debatir con los demás colegas del aula.',
  avisosUrgentesTitle: 'Resumen de Avisos Urgentes',
  herramientaRapidaTitle: 'Herramienta Rápida del Estudiante',
  herramientaRapidaDesc: 'Usa la calculadora integrada para planificar tu riesgo de lote según tu Stop Loss de pips.',
  conveniosTitle: 'Convenios de Fondeo & Partners Oficiales',
  recursosTitleOverride: 'Recursos de Formación',
  herramientasTitleOverride: 'Herramientas y Recursos',
  herramientasSubtitleOverride: 'GUÍAS, DESCARGAS, TRADINGVIEW Y ENTRENAMIENTO',

  // Newly requested titles and subtitles fallbacks:
  avisosTitle: 'Diario de Avisos Importantes',
  avisosSubtitle: 'MENSAJES OFICIALES DE NUESTROS PROFESORES',
  sesionesTitle: 'Sesiones de Transmisión del Aula',
  sesionesSubtitle: 'REUNIONES ACADÉMICAS ABIERTAS PARA ALUMNOS',
  sesionesVIPTitle: 'Sesiones VIP de Mensualidad',
  sesionesVIPSubtitle: 'REUNIONES DE ALTO IMPACTO EXCLUSIVAS DE SOCIOS',
  recursosTitle: 'Recursos de Formación',
  recursosSubtitle: 'TEMAS, MANUALES Y DESCARGAS DE ESTUDIO',
  herramientasTitle: 'Herramientas y Recursos',
  herramientasSubtitle: 'GUÍAS, DESCARGAS, TRADINGVIEW Y ENTRENAMIENTO',
  discountsTitle: 'Convenios de Fondeo & Partners Oficiales',
  discountsSubtitle: 'DESCUENTOS Y MATRICULAS EXCLUSIVAS CON CUPONES EXCLUSIVOS',
  chatGeneralTitle: 'Aula de Chat General Colectivo',
  chatGeneralSubtitle: 'ÚNETE A DEBATIR CON LOS DEMÁS COLEGAS DEL AULA',
  comunidadTitle: 'Canal de Comunidad Titan',
  comunidadSubtitle: 'SALA ABIERTA DE PREGUNTAS Y APORTACIONES GENERALES',
  hofTitle: 'Salón de la Fama Titan Master School',
  hofSubtitle: 'Aquí se muestran los traders destacados de la comunidad de Titan Master School, reconociendo su consistencia y resultados. Elige qué canal se muestra en la portada.',
  featuredTitle: 'Estrategias Destacadas Académicas',
  featuredSubtitle: 'SISTEMAS Y METODOLOGÍAS DE TRADING DE ALTA PROBABILIDAD',
  historicalTitle: 'Biblioteca de Estrategias Ganadoras Históricas',
  historicalSubtitle: 'ACCESO TOTAL E INMEDIATO A LA COLECCIÓN ACADÉMICA'
};

const SEED_CHAT: ChatMessage[] = [
  {
    id: 'c1',
    text: '¡Bienvenidos a la comunidad de trading de Titan Master School! ⚡ Este es nuestro Chat General. Pregunten libremente, compartan análisis y respeten la regla: no DMs ni mensajes privados.',
    userId: 'admin-seed',
    userName: 'Mario Scalper (Fundador)',
    userRole: 'administrador',
    chatType: 'alumno',
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    replies: [
      {
        id: 'r_c1_1',
        userName: 'Carlos Trading',
        userRole: 'alumno',
        text: '¡Excelente! Muchas gracias Santi por la bienvenida, listo para aprender.',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ]
  },
  {
    id: 'c2',
    text: '¿Alguien operó la noticia de la Fed hoy? El retroceso fue súper limpio en el Order Block de M15.',
    userId: 'member-seed-1',
    userName: 'Sofía Valenzuela',
    userRole: 'miembro',
    chatType: 'comunidad',
    status: 'active',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    replies: []
  }
];

// Helper to interact with LocalStorage
const getLocal = <T>(key: string, seed: T): T => {
  const data = localStorage.getItem(`titan_${key}`);
  if (!data) {
    localStorage.setItem(`titan_${key}`, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

const setLocal = <T>(key: string, val: T): void => {
  localStorage.setItem(`titan_${key}`, JSON.stringify(val));
};

const getUpgradedChannels = (): ChatChannel[] => {
  let list = getLocal<ChatChannel[]>('chat_channels', SEED_CHAT_CHANNELS);
  if (!list || list.length === 0 || !list.some(c => c.id === 'pupil_chat')) {
    setLocal('chat_channels', SEED_CHAT_CHANNELS);
    return [...SEED_CHAT_CHANNELS];
  }
  return list;
};

// Unified dynamic data structures and API functions
export const DataAPI = {
  // ---- AUTHENTICATION ----
  currentUserListener: (callback: (user: UserProfile | null) => void) => {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          // Fetch firestore profile
          const userDocRef = doc(db, 'users', fbUser.uid);
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              const profile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || uData.email || '',
                displayName: uData.displayName || fbUser.displayName || 'User',
                role: uData.role !== undefined ? uData.role : null,
                mensualidadActive: uData.mensualidadActive !== undefined ? !!uData.mensualidadActive : false,
                subscription: uData.subscription !== undefined ? !!uData.subscription : (uData.mensualidadActive !== undefined ? !!uData.mensualActive : false),
                approved: uData.approved !== undefined ? !!uData.approved : false,
                avatarUrl: uData.avatarUrl || undefined,
                manualUnlocks: uData.manualUnlocks || [],
                createdAt: uData.createdAt || new Date().toISOString(),
                joinedAt: uData.joinedAt || new Date().toISOString()
              };
              callback(profile);
            } else {
              // Create default profile for newly logged in Firebase user
              // Auto admin if matched with our user's email
              const isDefaultAdmin = fbUser.email?.toLowerCase() === 'm.scalpernq@gmail.com';
              const newProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                role: isDefaultAdmin ? 'administrador' : null,
                mensualidadActive: isDefaultAdmin ? true : false,
                subscription: isDefaultAdmin ? true : false,
                approved: isDefaultAdmin ? true : false,
                createdAt: new Date().toISOString(),
                joinedAt: new Date().toISOString()
              };
              await setDoc(userDocRef, newProfile);
              callback(newProfile);
            }
          } catch (err) {
            console.error("Error reading Firebase user document", err);
            // Default user fallback inside Firebase context
            const isDefaultAdmin = fbUser.email?.toLowerCase() === 'm.scalpernq@gmail.com';
            callback({
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'User',
              role: isDefaultAdmin ? 'administrador' : null,
              mensualidadActive: isDefaultAdmin ? true : false,
              subscription: isDefaultAdmin ? true : false,
              approved: isDefaultAdmin ? true : false,
              createdAt: new Date().toISOString(),
              joinedAt: new Date().toISOString()
            });
          }
        } else {
          callback(null);
        }
      });
    } else {
      // Local Auth subscription
      const checkLocalAuth = () => {
        const loggedId = localStorage.getItem('titan_logged_uid');
        if (loggedId) {
          const users = getLocal<UserProfile[]>('users', []);
          const activeUser = users.find(u => u.uid === loggedId);
          if (activeUser) {
            activeUser.subscription = activeUser.subscription !== undefined ? activeUser.subscription : !!activeUser.mensualidadActive;
            activeUser.approved = activeUser.approved !== undefined ? activeUser.approved : false;
            callback(activeUser);
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      };
      
      // Initialize system default users in localStorage if empty
      const users = getLocal<UserProfile[]>('users', []);
      if (users.length === 0) {
        const bootstrappedUsers: UserProfile[] = [
          {
            uid: 'admin-seed',
            email: 'm.scalpernq@gmail.com',
            displayName: 'Mario Scalper',
            role: 'administrador',
            mensualidadActive: true,
            subscription: true,
            approved: true,
            createdAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString(), // 40 days ago
            joinedAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString()
          },
          {
            uid: 'member-seed-1',
            email: 'member@titan.com',
            displayName: 'Eduardo Trader',
            role: 'miembro',
            mensualidadActive: true,
            subscription: true,
            approved: true,
            createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(), // 15 days ago
            joinedAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString()
          },
          {
            uid: 'alumno-seed-1',
            email: 'alumno@titan.com',
            displayName: 'Carlos Alumno',
            role: 'alumno',
            mensualidadActive: false,
            subscription: false,
            approved: true,
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          },
          {
            uid: 'norole-seed-1',
            email: 'nuevo@titan.com',
            displayName: 'Nuevo Postulante',
            role: null,
            mensualidadActive: false,
            subscription: false,
            approved: false,
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          }
        ];
        setLocal('users', bootstrappedUsers);
      }

      checkLocalAuth();
      
      // Return unubscribe wrapper
      window.addEventListener('storage', checkLocalAuth);
      return () => window.removeEventListener('storage', checkLocalAuth);
    }
  },

  signUp: async (email: string, pass: string, displayName: string): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth && db) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const isDefaultAdmin = email.toLowerCase() === 'm.scalpernq@gmail.com';
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: email,
          displayName: displayName || email.split('@')[0],
          role: isDefaultAdmin ? 'administrador' : null,
          mensualidadActive: isDefaultAdmin ? true : false,
          subscription: isDefaultAdmin ? true : false,
          approved: isDefaultAdmin ? true : false,
          createdAt: new Date().toISOString(),
          joinedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
        return newProfile;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
        throw err;
      }
    } else {
      // Local signup
      const users = getLocal<UserProfile[]>('users', []);
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("El correo ingresado ya está registrado.");
      }
      const isDefaultAdmin = email.toLowerCase() === 'm.scalpernq@gmail.com';
      const newUser: UserProfile = {
        uid: 'user_' + Math.random().toString(36).substr(2, 9),
        email,
        displayName,
        role: isDefaultAdmin ? 'administrador' : null,
        mensualidadActive: isDefaultAdmin ? true : false,
        subscription: isDefaultAdmin ? true : false,
        approved: isDefaultAdmin ? true : false,
        createdAt: new Date().toISOString(),
        joinedAt: new Date().toISOString()
      };
      users.push(newUser);
      setLocal('users', users);
      localStorage.setItem('titan_logged_uid', newUser.uid);
      window.dispatchEvent(new Event('storage'));
      return newUser;
    }
  },

  signIn: async (email: string, pass: string): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth && db) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists()) {
          const uData = snap.data();
          return {
            ...uData,
            subscription: uData.subscription !== undefined ? uData.subscription : !!uData.mensualidadActive,
            approved: uData.approved !== undefined ? uData.approved : false,
          } as UserProfile;
        } else {
          // If profile missing
          const isDefaultAdmin = email.toLowerCase() === 'm.scalpernq@gmail.com';
          const newProfile: UserProfile = {
            uid: cred.user.uid,
            email: email,
            displayName: email.split('@')[0],
            role: isDefaultAdmin ? 'administrador' : null,
            mensualidadActive: isDefaultAdmin ? true : false,
            subscription: isDefaultAdmin ? true : false,
            approved: isDefaultAdmin ? true : false,
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', cred.user.uid), newProfile);
          return newProfile;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
        throw err;
      }
    } else {
      // Local signin
      const users = getLocal<UserProfile[]>('users', []);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error("Correo o contraseña incorrectos.");
      }
      user.subscription = user.subscription !== undefined ? user.subscription : !!user.mensualidadActive;
      user.approved = user.approved !== undefined ? user.approved : false;
      localStorage.setItem('titan_logged_uid', user.uid);
      window.dispatchEvent(new Event('storage'));
      return user;
    }
  },

  signInWithGoogle: async (): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth && db) {
      try {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        const email = cred.user.email || '';
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists()) {
          const uData = snap.data();
          return {
            ...uData,
            subscription: uData.subscription !== undefined ? uData.subscription : !!uData.mensualidadActive,
            approved: uData.approved !== undefined ? uData.approved : false,
          } as UserProfile;
        } else {
          const isDefaultAdmin = email.toLowerCase() === 'm.scalpernq@gmail.com';
          const newProfile: UserProfile = {
            uid: cred.user.uid,
            email,
            displayName: cred.user.displayName || email.split('@')[0] || 'User',
            role: isDefaultAdmin ? 'administrador' : null,
            mensualidadActive: isDefaultAdmin ? true : false,
            subscription: isDefaultAdmin ? true : false,
            approved: isDefaultAdmin ? true : false,
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', cred.user.uid), newProfile);
          return newProfile;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
        throw err;
      }
    } else {
      // Local Google Auth Simulator
      const email = 'm.scalpernq@gmail.com'; // Default to admin for Google sign in testing
      const users = getLocal<UserProfile[]>('users', []);
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = {
          uid: 'google_' + Math.random().toString(36).substr(2, 9),
          email,
          displayName: 'Santi Google Admin',
          role: 'administrador',
          mensualidadActive: true,
          subscription: true,
          approved: true,
          createdAt: new Date().toISOString(),
          joinedAt: new Date().toISOString()
        };
        users.push(user);
        setLocal('users', users);
      }
      localStorage.setItem('titan_logged_uid', user.uid);
      window.dispatchEvent(new Event('storage'));
      return user;
    }
  },

  recoverPassword: async (email: string): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (err) {
        console.error("Firebase reset email failed", err);
        throw err;
      }
    } else {
      // Local Recovery
      const users = getLocal<UserProfile[]>('users', []);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error("El correo ingresado no se encuentra registrado.");
      }
      return; // Simulated success
    }
  },

  signOut: async (): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await fbSignOut(auth);
    } else {
      localStorage.removeItem('titan_logged_uid');
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- USER MANAGEMENT (Admin/Collaborator) ----
  getUsers: async (): Promise<UserProfile[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(doc => doc.data() as UserProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
        throw err;
      }
    } else {
      return getLocal<UserProfile[]>('users', []);
    }
  },

  updateUserProfile: async (updatedUser: UserProfile): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'users', updatedUser.uid), updatedUser, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${updatedUser.uid}`);
        throw err;
      }
    } else {
      const users = getLocal<UserProfile[]>('users', []);
      const idx = users.findIndex(u => u.uid === updatedUser.uid);
      if (idx !== -1) {
        users[idx] = updatedUser;
        setLocal('users', users);
        window.dispatchEvent(new Event('storage'));
      }
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
        throw err;
      }
    } else {
      const users = getLocal<UserProfile[]>('users', []);
      const filtered = users.filter(u => u.uid !== userId);
      setLocal('users', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- CHAT MESSAGES ----
  subscribeMessages: (channelId: string, showPending: boolean, callback: (msgs: ChatMessage[]) => void) => {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'chat_messages')
      );
      
      return onSnapshot(q, (snap) => {
        let msgs = snap.docs.map(doc => doc.data() as ChatMessage);
        msgs = msgs.filter(m => {
          if (m.channelId === channelId) return true;
          if (!m.channelId) {
            if (channelId === 'pupil_chat' && m.chatType === 'alumno') return true;
            if (channelId === 'community_chat' && m.chatType === 'comunidad') return true;
          }
          return false;
        });
        if (!showPending) {
          msgs = msgs.filter(m => m.status === 'active');
        } else {
          msgs = msgs.filter(m => m.status === 'active' || m.status === 'pending_review');
        }
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(msgs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_messages');
      });
    } else {
      const checkAndPublish = () => {
        const allMsg = getLocal<ChatMessage[]>('chat_messages', SEED_CHAT);
        let filtered = allMsg.filter(m => {
          if (m.channelId === channelId) return true;
          if (!m.channelId) {
            if (channelId === 'pupil_chat' && m.chatType === 'alumno') return true;
            if (channelId === 'community_chat' && m.chatType === 'comunidad') return true;
          }
          return false;
        });
        if (!showPending) {
          filtered = filtered.filter(m => m.status === 'active');
        } else {
          filtered = filtered.filter(m => m.status === 'active' || m.status === 'pending_review');
        }
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(filtered);
      };
      
      checkAndPublish();
      window.addEventListener('storage', checkAndPublish);
      return () => window.removeEventListener('storage', checkAndPublish);
    }
  },

  sendChatMessage: async (text: string, user: UserProfile, chatType: 'alumno' | 'comunidad', channelId?: string, imageUrl?: string, documentUrl?: string, documentName?: string): Promise<void> => {
    // Check if contains links
    const checkLinks = (t: string): boolean => {
      const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
      const domainPattern = /\b[a-zA-Z0-9-]+\.(com|net|org|es|edu|io|co|us|info|uk|fr|info)\b/i;
      return pattern.test(t) || domainPattern.test(t);
    };

    const hasLinks = checkLinks(text);
    const hasAttachments = !!imageUrl || !!documentUrl;
    const isStaff = ['administrador', 'colaborador', 'moderador'].includes(user.role || '');
    const requiresReview = (hasLinks || hasAttachments) && !isStaff;
    
    const newMessage: any = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      text: text || '',
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      chatType,
      channelId: channelId || chatType,
      status: requiresReview ? 'pending_review' : 'active',
      createdAt: new Date().toISOString(),
      replies: [],
      reactions: {}
    };

    if (user.avatarUrl) {
      newMessage.avatarUrl = user.avatarUrl;
    }
    if (imageUrl) {
      newMessage.imageUrl = imageUrl;
    }
    if (documentUrl) {
      newMessage.documentUrl = documentUrl;
    }
    if (documentName) {
      newMessage.documentName = documentName;
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'chat_messages', newMessage.id), newMessage);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_messages/${newMessage.id}`);
        throw err;
      }
    } else {
      const allMsg = getLocal<ChatMessage[]>('chat_messages', SEED_CHAT);
      allMsg.push(newMessage);
      setLocal('chat_messages', allMsg);
      window.dispatchEvent(new Event('storage'));
    }

    // Trigger alerts/notifications to staff if pending review
    if (requiresReview) {
      const usersList = getLocal<UserProfile[]>('users', []);
      const staffList = usersList.filter(u => ['administrador', 'colaborador', 'moderador'].includes(u.role || ''));
      staffList.forEach(s => {
        const attachmentType = hasLinks ? 'enlaces' : (imageUrl ? 'imágenes' : 'documentos');
        DataAPI.addNotificationForUser(
          s.uid,
          `⚠️ Mensaje retenido en #${channelId || chatType}`,
          `Mensaje de ${user.displayName} contiene ${attachmentType} y espera aprobación.`,
          'notice'
        );
      });
    }

    // Scan for mentions like @username or @role
    const mentionsPattern = /@([^\s]+)/g;
    const matches = text.match(mentionsPattern);
    if (matches) {
      const usersList = getLocal<UserProfile[]>('users', []);
      matches.forEach(m => {
        const target = m.substring(1).toLowerCase();
        usersList.forEach(u => {
          const nameMatch = u.displayName.toLowerCase().replace(/\s+/g, '').includes(target);
          const roleMatch = u.role.toLowerCase() === target;
          const globalMatch = target === 'todos' || target === 'comunidad';
          
          if ((nameMatch || roleMatch || globalMatch) && u.uid !== user.uid) {
            DataAPI.addNotificationForUser(
              u.uid,
              `💬 Te mencionaron en #${channelId || chatType}`,
              `${user.displayName}: "${text}"`,
              'notice'
            );
          }
        });
      });
    }
  },

  // Post inline reply / thread comments
  postChatReply: async (messageId: string, replyText: string, user: UserProfile): Promise<void> => {
    const reply: ChatReply = {
      id: 'rep_' + Math.random().toString(36).substr(2, 9),
      userName: user.displayName,
      userRole: user.role,
      text: replyText,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        const msgRef = doc(db, 'chat_messages', messageId);
        const snap = await getDoc(msgRef);
        if (snap.exists()) {
          const msg = snap.data() as ChatMessage;
          const replies = msg.replies || [];
          replies.push(reply);
          await updateDoc(msgRef, { replies });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_messages/${messageId}`);
        throw err;
      }
    } else {
      const allMsg = getLocal<ChatMessage[]>('chat_messages', SEED_CHAT);
      const idx = allMsg.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        const replies = allMsg[idx].replies || [];
        replies.push(reply);
        allMsg[idx].replies = replies;
        setLocal('chat_messages', allMsg);
        window.dispatchEvent(new Event('storage'));
      }
    }
  },

  // Moderator/Admin controls: approve, hide or delete
  moderateMessage: async (messageId: string, action: 'approve' | 'hide' | 'delete'): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        const msgRef = doc(db, 'chat_messages', messageId);
        if (action === 'approve') {
          await updateDoc(msgRef, { status: 'active' });
        } else if (action === 'hide') {
          await updateDoc(msgRef, { status: 'hidden' });
        } else {
          await deleteDoc(msgRef);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_messages/${messageId}`);
        throw err;
      }
    } else {
      const allMsg = getLocal<ChatMessage[]>('chat_messages', SEED_CHAT);
      const idx = allMsg.findIndex(m => m.id === messageId);
      if (action === 'approve') {
        if (idx !== -1) {
          allMsg[idx].status = 'active';
          setLocal('chat_messages', allMsg);
        }
      } else if (action === 'hide') {
        if (idx !== -1) {
          allMsg[idx].status = 'hidden';
          setLocal('chat_messages', allMsg);
        }
      } else {
        const filtered = allMsg.filter(m => m.id !== messageId);
        setLocal('chat_messages', filtered);
      }
      window.dispatchEvent(new Event('storage'));
    }
  },

  toggleMessageReaction: async (messageId: string, emoji: string, userId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        const msgRef = doc(db, 'chat_messages', messageId);
        const snap = await getDoc(msgRef);
        if (snap.exists()) {
          const msg = snap.data() as ChatMessage;
          const reactions = msg.reactions || {};
          const users = reactions[emoji] || [];
          if (users.includes(userId)) {
            reactions[emoji] = users.filter(id => id !== userId);
          } else {
            reactions[emoji] = [...users, userId];
          }
          await updateDoc(msgRef, { reactions });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_messages/${messageId}`);
        throw err;
      }
    } else {
      const msgs = getLocal<ChatMessage[]>('chat_messages', SEED_CHAT);
      const idx = msgs.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        const msg = msgs[idx];
        const reactions = msg.reactions ? { ...msg.reactions } : {};
        const users = reactions[emoji] || [];
        if (users.includes(userId)) {
          reactions[emoji] = users.filter(id => id !== userId);
        } else {
          reactions[emoji] = [...users, userId];
        }
        msgs[idx].reactions = reactions;
        setLocal('chat_messages', msgs);
        window.dispatchEvent(new Event('storage'));
      }
    }
  },

  // ---- MEETINGS (Admin/Collaborator) ----
  getMeetings: async (): Promise<Meeting[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'meetings'));
        return snap.docs.map(doc => doc.data() as Meeting);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'meetings');
        throw err;
      }
    } else {
      return getLocal<Meeting[]>('meetings', SEED_MEETINGS);
    }
  },

  saveMeeting: async (meeting: Meeting): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'meetings', meeting.id), meeting);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `meetings/${meeting.id}`);
        throw err;
      }
    } else {
      const mtgs = getLocal<Meeting[]>('meetings', SEED_MEETINGS);
      const idx = mtgs.findIndex(m => m.id === meeting.id);
      if (idx !== -1) {
        mtgs[idx] = meeting;
      } else {
        mtgs.push(meeting);
      }
      setLocal('meetings', mtgs);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteMeeting: async (meetingId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'meetings', meetingId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `meetings/${meetingId}`);
        throw err;
      }
    } else {
      const mtgs = getLocal<Meeting[]>('meetings', SEED_MEETINGS);
      const filtered = mtgs.filter(m => m.id !== meetingId);
      setLocal('meetings', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- NOTICES (Admin/Collaborator) ----
  getNotices: async (): Promise<Notice[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'notices'));
        return snap.docs.map(doc => doc.data() as Notice);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'notices');
        throw err;
      }
    } else {
      return getLocal<Notice[]>('notices', SEED_NOTICES);
    }
  },

  saveNotice: async (notice: Notice): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'notices', notice.id), notice);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `notices/${notice.id}`);
        throw err;
      }
    } else {
      const ntcs = getLocal<Notice[]>('notices', SEED_NOTICES);
      const idx = ntcs.findIndex(n => n.id === notice.id);
      if (idx !== -1) {
        ntcs[idx] = notice;
      } else {
        ntcs.push(notice);
      }
      setLocal('notices', ntcs);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteNotice: async (noticeId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'notices', noticeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notices/${noticeId}`);
        throw err;
      }
    } else {
      const ntcs = getLocal<Notice[]>('notices', SEED_NOTICES);
      const filtered = ntcs.filter(n => n.id !== noticeId);
      setLocal('notices', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- HALL OF FAME ----
  getHallOfFame: async (): Promise<HallOfFameEntry[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'hall_of_fame'));
        return snap.docs.map(doc => doc.data() as HallOfFameEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'hall_of_fame');
        throw err;
      }
    } else {
      return getLocal<HallOfFameEntry[]>('hall_of_fame', SEED_HALL_OF_FAME);
    }
  },

  saveHallOfFame: async (item: HallOfFameEntry): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'hall_of_fame', item.id), item);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `hall_of_fame/${item.id}`);
        throw err;
      }
    } else {
      const hofs = getLocal<HallOfFameEntry[]>('hall_of_fame', SEED_HALL_OF_FAME);
      const idx = hofs.findIndex(h => h.id === item.id);
      if (idx !== -1) {
        hofs[idx] = item;
      } else {
        hofs.push(item);
      }
      setLocal('hall_of_fame', hofs);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteHallOfFame: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'hall_of_fame', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `hall_of_fame/${id}`);
        throw err;
      }
    } else {
      const hofs = getLocal<HallOfFameEntry[]>('hall_of_fame', SEED_HALL_OF_FAME);
      const filtered = hofs.filter(h => h.id !== id);
      setLocal('hall_of_fame', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- STRATEGIES FEATURED ----
  getStrategiesFeatured: async (): Promise<StrategyFeatured[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'strategies_featured'));
        return snap.docs.map(doc => doc.data() as StrategyFeatured);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'strategies_featured');
        throw err;
      }
    } else {
      return getLocal<StrategyFeatured[]>('strategies_featured', SEED_STRATEGIES_FEATURED);
    }
  },

  saveStrategyFeatured: async (strat: StrategyFeatured): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'strategies_featured', strat.id), strat);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `strategies_featured/${strat.id}`);
        throw err;
      }
    } else {
      const strats = getLocal<StrategyFeatured[]>('strategies_featured', SEED_STRATEGIES_FEATURED);
      const idx = strats.findIndex(s => s.id === strat.id);
      if (idx !== -1) {
        strats[idx] = strat;
      } else {
        strats.push(strat);
      }
      setLocal('strategies_featured', strats);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteStrategyFeatured: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'strategies_featured', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `strategies_featured/${id}`);
        throw err;
      }
    } else {
      const strats = getLocal<StrategyFeatured[]>('strategies_featured', SEED_STRATEGIES_FEATURED);
      const filtered = strats.filter(s => s.id !== id);
      setLocal('strategies_featured', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- STRATEGIES HISTORICAL ----
  getStrategiesHistorical: async (): Promise<StrategyHistorical[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'strategies_historical'));
        return snap.docs.map(doc => doc.data() as StrategyHistorical);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'strategies_historical');
        throw err;
      }
    } else {
      return getLocal<StrategyHistorical[]>('strategies_historical', SEED_STRATEGIES_HISTROLLER_FALLBACK());
    }
  },

  saveStrategyHistorical: async (strat: StrategyHistorical): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'strategies_historical', strat.id), strat);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `strategies_historical/${strat.id}`);
        throw err;
      }
    } else {
      const strats = getLocal<StrategyHistorical[]>('strategies_historical', SEED_STRATEGIES_HISTROLLER_FALLBACK());
      const idx = strats.findIndex(s => s.id === strat.id);
      if (idx !== -1) {
        strats[idx] = strat;
      } else {
        strats.push(strat);
      }
      setLocal('strategies_historical', strats);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteStrategyHistorical: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'strategies_historical', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `strategies_historical/${id}`);
        throw err;
      }
    } else {
      const strats = getLocal<StrategyHistorical[]>('strategies_historical', SEED_STRATEGIES_HISTROLLER_FALLBACK());
      const filtered = strats.filter(s => s.id !== id);
      setLocal('strategies_historical', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- TOOLS ----
  getTools: async (): Promise<TradingTool[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'tools'));
        return snap.docs.map(doc => doc.data() as TradingTool);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'tools');
        throw err;
      }
    } else {
      return getLocal<TradingTool[]>('tools', SEED_TOOLS);
    }
  },

  saveTool: async (tool: TradingTool): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'tools', tool.id), tool);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tools/${tool.id}`);
        throw err;
      }
    } else {
      const tls = getLocal<TradingTool[]>('tools', SEED_TOOLS);
      const idx = tls.findIndex(t => t.id === tool.id);
      if (idx !== -1) {
        tls[idx] = tool;
      } else {
        tls.push(tool);
      }
      setLocal('tools', tls);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteTool: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'tools', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tools/${id}`);
        throw err;
      }
    } else {
      const tls = getLocal<TradingTool[]>('tools', SEED_TOOLS);
      const filtered = tls.filter(t => t.id !== id);
      setLocal('tools', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- DISCOUNTS ----
  getDiscounts: async (): Promise<DiscountRef[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'discounts'));
        return snap.docs.map(doc => doc.data() as DiscountRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'discounts');
        throw err;
      }
    } else {
      return getLocal<DiscountRef[]>('discounts', SEED_DISCOUNTS);
    }
  },

  saveDiscount: async (dsc: DiscountRef): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'discounts', dsc.id), dsc);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `discounts/${dsc.id}`);
        throw err;
      }
    } else {
      const dscs = getLocal<DiscountRef[]>('discounts', SEED_DISCOUNTS);
      const idx = dscs.findIndex(d => d.id === dsc.id);
      if (idx !== -1) {
        dscs[idx] = dsc;
      } else {
        dscs.push(dsc);
      }
      setLocal('discounts', dscs);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteDiscount: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'discounts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `discounts/${id}`);
        throw err;
      }
    } else {
      const dscs = getLocal<DiscountRef[]>('discounts', SEED_DISCOUNTS);
      const filtered = dscs.filter(d => d.id !== id);
      setLocal('discounts', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  getDashboardTexts: async (): Promise<DashboardTexts> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDoc(doc(db, 'settings', 'dashboard_texts'));
        if (snap.exists()) {
          return { ...DEFAULT_DASHBOARD_TEXTS, ...snap.data() };
        }
      } catch (e) {
        console.error(e);
      }
    }
    const local = localStorage.getItem('titan_dashboard_texts');
    if (local) {
      try { return { ...DEFAULT_DASHBOARD_TEXTS, ...JSON.parse(local) }; } catch (e) {}
    }
    return DEFAULT_DASHBOARD_TEXTS;
  },

  saveDashboardTexts: async (texts: DashboardTexts): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'settings', 'dashboard_texts'), texts);
      } catch (e) {
        console.error(e);
      }
    }
    localStorage.setItem('titan_dashboard_texts', JSON.stringify(texts));
    window.dispatchEvent(new Event('storage'));
  },

  // ---- FUNDING COMPANIES ----
  getFundingCompanies: async (): Promise<FundingCompany[]> => {
    const sortCompanies = (arr: FundingCompany[]) => {
      return [...arr].sort((a,b) => {
        const indexA = a.orderIndex !== undefined ? a.orderIndex : 999;
        const indexB = b.orderIndex !== undefined ? b.orderIndex : 999;
        if (indexA !== indexB) return indexA - indexB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    };

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'funding_companies'));
        const list = snap.docs.map(doc => doc.data() as FundingCompany);
        const hasSeededFunding = typeof window !== 'undefined' && localStorage.getItem('titan_seeded_funding_companies') === 'true';
        if (list.length === 0 && !hasSeededFunding) {
          for (const fc of SEED_FUNDING_COMPANIES) {
            await setDoc(doc(db, 'funding_companies', fc.id), fc);
            list.push(fc);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('titan_seeded_funding_companies', 'true');
          }
        }
        return sortCompanies(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'funding_companies');
        return sortCompanies(SEED_FUNDING_COMPANIES);
      }
    } else {
      const list = getLocal<FundingCompany[]>('funding_companies', []);
      // If empty and not seeded, seed once
      const hasSeededFunding = typeof window !== 'undefined' && localStorage.getItem('titan_seeded_funding_companies') === 'true';
      if (list.length === 0 && !hasSeededFunding) {
        const initial = [...SEED_FUNDING_COMPANIES];
        setLocal('funding_companies', initial);
        if (typeof window !== 'undefined') {
          localStorage.setItem('titan_seeded_funding_companies', 'true');
        }
        return sortCompanies(initial);
      }
      return sortCompanies(list);
    }
  },

  saveFundingCompany: async (fc: FundingCompany): Promise<void> => {
    const cleaned = cleanFirestoreData(fc);
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'funding_companies', cleaned.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `funding_companies/${cleaned.id}`);
        throw err;
      }
    } else {
      const fcs = getLocal<FundingCompany[]>('funding_companies', SEED_FUNDING_COMPANIES);
      const idx = fcs.findIndex(f => f.id === fc.id);
      if (idx !== -1) {
        fcs[idx] = fc;
      } else {
        fcs.push(fc);
      }
      setLocal('funding_companies', fcs);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteFundingCompany: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'funding_companies', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `funding_companies/${id}`);
        throw err;
      }
    } else {
      const fcs = getLocal<FundingCompany[]>('funding_companies', SEED_FUNDING_COMPANIES);
      const filtered = fcs.filter(f => f.id !== id);
      setLocal('funding_companies', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- NOTIFICATIONS ----
  getNotifications: (userId: string, callback: (notifs: AppNotification[]) => void) => {
    const key = `notifications_${userId}`;
    const checkAndPublish = () => {
      const list = getLocal<AppNotification[]>(key, [
        {
          id: 'notif_welcome',
          title: '🔥 ¡Bienvenido al portal Titan Master School!',
          content: 'Explora y disfruta tus herramientas exclusivas de trading y chats colectivos.',
          type: 'notice',
          createdAt: new Date().toISOString(),
          read: false
        }
      ]);
      callback(list);
    };
    checkAndPublish();
    window.addEventListener('storage', checkAndPublish);
    return () => window.removeEventListener('storage', checkAndPublish);
  },

  addNotificationForUser: (userId: string, title: string, content: string, type: 'meeting' | 'notice' | 'strategy') => {
    const key = `notifications_${userId}`;
    const notifications = getLocal<AppNotification[]>(key, []);
    notifications.unshift({
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      type,
      createdAt: new Date().toISOString(),
      read: false
    });
    setLocal(key, notifications);
    window.dispatchEvent(new Event('storage'));
  },

  addNotificationBroadcast: async (title: string, content: string, type: 'meeting' | 'notice' | 'strategy') => {
    // Add to all users
    const users = await DataAPI.getUsers();
    users.forEach(u => {
      DataAPI.addNotificationForUser(u.uid, title, content, type);
    });
  },

  markNotificationRead: (userId: string, notifId: string) => {
    const key = `notifications_${userId}`;
    const list = getLocal<AppNotification[]>(key, []);
    const idx = list.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      list[idx].read = true;
      setLocal(key, list);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- CHAT CHANNELS ----
  getChatChannels: async (): Promise<ChatChannel[]> => {
    const sortChans = (arr: ChatChannel[]) => {
      return [...arr].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const indexA = a.orderIndex !== undefined ? a.orderIndex : 999;
        const indexB = b.orderIndex !== undefined ? b.orderIndex : 999;
        if (indexA !== indexB) return indexA - indexB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    };

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'chat_channels'));
        const list = snap.docs.map(doc => doc.data() as ChatChannel);
        if (list.length === 0 || !list.some(c => c.id === 'pupil_chat')) {
          for (const oldDoc of snap.docs) {
            await deleteDoc(oldDoc.ref);
          }
          for (const ch of SEED_CHAT_CHANNELS) {
            await setDoc(doc(db, 'chat_channels', ch.id), ch);
          }
          return sortChans(SEED_CHAT_CHANNELS);
        }
        return sortChans(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'chat_channels');
        return sortChans(SEED_CHAT_CHANNELS);
      }
    } else {
      const list = getUpgradedChannels();
      return sortChans(list);
    }
  },

  subscribeChatChannels: (callback: (chans: ChatChannel[]) => void) => {
    const sortChans = (arr: ChatChannel[]) => {
      return [...arr].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const indexA = a.orderIndex !== undefined ? a.orderIndex : 999;
        const indexB = b.orderIndex !== undefined ? b.orderIndex : 999;
        if (indexA !== indexB) return indexA - indexB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    };

    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'chat_channels'));
      return onSnapshot(q, (snap) => {
        let list = snap.docs.map(doc => doc.data() as ChatChannel);
        if (list.length === 0 || !list.some(c => c.id === 'pupil_chat')) {
          for (const oldDoc of snap.docs) {
            deleteDoc(oldDoc.ref).catch(console.error);
          }
          for (const ch of SEED_CHAT_CHANNELS) {
            setDoc(doc(db, 'chat_channels', ch.id), ch).catch(console.error);
          }
          list = [...SEED_CHAT_CHANNELS];
        }
        callback(sortChans(list));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_channels');
      });
    } else {
      const publish = () => {
        const list = getUpgradedChannels();
        callback(sortChans(list));
      };
      publish();
      window.addEventListener('storage', publish);
      return () => {
        window.removeEventListener('storage', publish);
      };
    }
  },

  saveChatChannel: async (chan: ChatChannel): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'chat_channels', chan.id), chan);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_channels/${chan.id}`);
        throw err;
      }
    } else {
      const chans = getUpgradedChannels();
      const idx = chans.findIndex(c => c.id === chan.id);
      if (idx !== -1) {
        chans[idx] = chan;
      } else {
        chans.push(chan);
      }
      setLocal('chat_channels', chans);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteChatChannel: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'chat_channels', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chat_channels/${id}`);
        throw err;
      }
    } else {
      const chans = getUpgradedChannels();
      const filtered = chans.filter(c => c.id !== id);
      setLocal('chat_channels', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- RESOURCE TOPICS ----
  getResourceTopics: async (): Promise<ResourceTopic[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'resource_topics'));
        const list = snap.docs.map(doc => doc.data() as ResourceTopic);
        if (list.length === 0) {
          for (const t of SEED_RESOURCE_TOPICS) {
            await setDoc(doc(db, 'resource_topics', t.id), t);
          }
          return SEED_RESOURCE_TOPICS;
        }
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'resource_topics');
        return SEED_RESOURCE_TOPICS;
      }
    } else {
      return getLocal<ResourceTopic[]>('resource_topics', SEED_RESOURCE_TOPICS);
    }
  },

  saveResourceTopic: async (topic: ResourceTopic): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'resource_topics', topic.id), topic);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `resource_topics/${topic.id}`);
        throw err;
      }
    } else {
      const topics = getLocal<ResourceTopic[]>('resource_topics', SEED_RESOURCE_TOPICS);
      const idx = topics.findIndex(t => t.id === topic.id);
      if (idx !== -1) {
        topics[idx] = topic;
      } else {
        topics.push(topic);
      }
      setLocal('resource_topics', topics);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteResourceTopic: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'resource_topics', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `resource_topics/${id}`);
        throw err;
      }
    } else {
      const topics = getLocal<ResourceTopic[]>('resource_topics', SEED_RESOURCE_TOPICS);
      const filtered = topics.filter(t => t.id !== id);
      setLocal('resource_topics', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // ---- TOOL TOPICS ----
  getToolTopics: async (): Promise<ToolTopic[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'tool_topics'));
        const list = snap.docs.map(doc => doc.data() as ToolTopic);
        if (list.length === 0) {
          for (const t of SEED_TOOL_TOPICS) {
            await setDoc(doc(db, 'tool_topics', t.id), t);
          }
          return SEED_TOOL_TOPICS;
        }
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'tool_topics');
        return SEED_TOOL_TOPICS;
      }
    } else {
      return getLocal<ToolTopic[]>('tool_topics', SEED_TOOL_TOPICS);
    }
  },

  saveToolTopic: async (topic: ToolTopic): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'tool_topics', topic.id), topic);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tool_topics/${topic.id}`);
        throw err;
      }
    } else {
      const topics = getLocal<ToolTopic[]>('tool_topics', SEED_TOOL_TOPICS);
      const idx = topics.findIndex(t => t.id === topic.id);
      if (idx !== -1) {
        topics[idx] = topic;
      } else {
        topics.push(topic);
      }
      setLocal('tool_topics', topics);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteToolTopic: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'tool_topics', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tool_topics/${id}`);
        throw err;
      }
    } else {
      const topics = getLocal<ToolTopic[]>('tool_topics', SEED_TOOL_TOPICS);
      const filtered = topics.filter(t => t.id !== id);
      setLocal('tool_topics', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  postResourceTopicReply: async (topicId: string, replyText: string, user: UserProfile): Promise<void> => {
    const reply: ResourceReply = {
      id: 'rep_' + Math.random().toString(36).substr(2, 9),
      userName: user.displayName,
      userRole: user.role,
      text: replyText,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        const topicRef = doc(db, 'resource_topics', topicId);
        const snap = await getDoc(topicRef);
        if (snap.exists()) {
          const topic = snap.data() as ResourceTopic;
          const replies = topic.replies || [];
          replies.push(reply);
          await updateDoc(topicRef, { replies });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `resource_topics/${topicId}`);
        throw err;
      }
    } else {
      const topics = getLocal<ResourceTopic[]>('resource_topics', SEED_RESOURCE_TOPICS);
      const idx = topics.findIndex(t => t.id === topicId);
      if (idx !== -1) {
        const replies = topics[idx].replies || [];
        replies.push(reply);
        topics[idx].replies = replies;
        setLocal('resource_topics', topics);
        window.dispatchEvent(new Event('storage'));
      }
    }
  },

  postToolTopicReply: async (topicId: string, replyText: string, user: UserProfile): Promise<void> => {
    const reply: ToolReply = {
      id: 'rep_' + Math.random().toString(36).substr(2, 9),
      userName: user.displayName,
      userRole: user.role,
      text: replyText,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        const topicRef = doc(db, 'tool_topics', topicId);
        const snap = await getDoc(topicRef);
        if (snap.exists()) {
          const topic = snap.data() as ToolTopic;
          const replies = topic.replies || [];
          replies.push(reply);
          await updateDoc(topicRef, { replies });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tool_topics/${topicId}`);
        throw err;
      }
    } else {
      const topics = getLocal<ToolTopic[]>('tool_topics', SEED_TOOL_TOPICS);
      const idx = topics.findIndex(t => t.id === topicId);
      if (idx !== -1) {
        const replies = topics[idx].replies || [];
        replies.push(reply);
        topics[idx].replies = replies;
        setLocal('tool_topics', topics);
        window.dispatchEvent(new Event('storage'));
      }
    }
  },

  getCustomCategories: async (): Promise<CustomCategory[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'custom_categories'));
        const list = snap.docs.map(doc => doc.data() as CustomCategory);
        if (list.length === 0) {
          for (const c of SEED_CUSTOM_CATEGORIES) {
            await setDoc(doc(db, 'custom_categories', c.id), c);
          }
          return SEED_CUSTOM_CATEGORIES;
        }
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'custom_categories');
        return SEED_CUSTOM_CATEGORIES;
      }
    } else {
      return getLocal<CustomCategory[]>('custom_categories', SEED_CUSTOM_CATEGORIES);
    }
  },

  saveCustomCategory: async (category: CustomCategory): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'custom_categories', category.id), category);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `custom_categories/${category.id}`);
        throw err;
      }
    } else {
      const list = getLocal<CustomCategory[]>('custom_categories', SEED_CUSTOM_CATEGORIES);
      const idx = list.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        list[idx] = category;
      } else {
        list.push(category);
      }
      setLocal('custom_categories', list);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteCustomCategory: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'custom_categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `custom_categories/${id}`);
        throw err;
      }
    } else {
      const list = getLocal<CustomCategory[]>('custom_categories', SEED_CUSTOM_CATEGORIES);
      const filtered = list.filter(c => c.id !== id);
      setLocal('custom_categories', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  // --- CATEGORIZED CHANNELS & SYSTEMS (FORMATO 1) ---
  getCategorizedCategories: async (channelId: string): Promise<CategorizedCategory[]> => {
    const sortParams = (arr: CategorizedCategory[]) => {
      return [...arr].filter(c => c.channelId === channelId).sort((a, b) => a.orderIndex - b.orderIndex);
    };
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'categorized_categories'));
        const list = snap.docs.map(doc => doc.data() as CategorizedCategory);
        const filtered = list.filter(c => c.channelId === channelId);
        if (filtered.length === 0) {
          const defaults = DEFAULT_CATEGORIZED_CATEGORIES.filter(c => c.channelId === channelId);
          for (const c of defaults) {
            await setDoc(doc(db, 'categorized_categories', c.id), c);
          }
          return sortParams(DEFAULT_CATEGORIZED_CATEGORIES);
        }
        return sortParams(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'categorized_categories');
        return sortParams(DEFAULT_CATEGORIZED_CATEGORIES);
      }
    } else {
      const list = getLocal<CategorizedCategory[]>('categorized_categories', DEFAULT_CATEGORIZED_CATEGORIES);
      return sortParams(list);
    }
  },

  saveCategorizedCategory: async (category: CategorizedCategory): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'categorized_categories', category.id), category);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categorized_categories/${category.id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedCategory[]>('categorized_categories', DEFAULT_CATEGORIZED_CATEGORIES);
      const idx = list.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        list[idx] = category;
      } else {
        list.push(category);
      }
      setLocal('categorized_categories', list);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteCategorizedCategory: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'categorized_categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categorized_categories/${id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedCategory[]>('categorized_categories', DEFAULT_CATEGORIZED_CATEGORIES);
      const filtered = list.filter(c => c.id !== id);
      setLocal('categorized_categories', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  getCategorizedSubChannels: async (channelId: string): Promise<CategorizedSubChannel[]> => {
    const sortParams = (arr: CategorizedSubChannel[]) => {
      return [...arr].filter(c => c.channelId === channelId).sort((a, b) => a.orderIndex - b.orderIndex);
    };
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'categorized_subchannels'));
        const list = snap.docs.map(doc => doc.data() as CategorizedSubChannel);
        const filtered = list.filter(c => c.channelId === channelId);
        if (filtered.length === 0) {
          const defaults = DEFAULT_CATEGORIZED_SUBCHANNELS.filter(c => c.channelId === channelId);
          for (const c of defaults) {
            await setDoc(doc(db, 'categorized_subchannels', c.id), c);
          }
          return sortParams(DEFAULT_CATEGORIZED_SUBCHANNELS);
        }
        return sortParams(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'categorized_subchannels');
        return sortParams(DEFAULT_CATEGORIZED_SUBCHANNELS);
      }
    } else {
      const list = getLocal<CategorizedSubChannel[]>('categorized_subchannels', DEFAULT_CATEGORIZED_SUBCHANNELS);
      return sortParams(list);
    }
  },

  saveCategorizedSubChannel: async (sub: CategorizedSubChannel): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'categorized_subchannels', sub.id), sub);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categorized_subchannels/${sub.id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedSubChannel[]>('categorized_subchannels', DEFAULT_CATEGORIZED_SUBCHANNELS);
      const idx = list.findIndex(c => c.id === sub.id);
      if (idx !== -1) {
        list[idx] = sub;
      } else {
        list.push(sub);
      }
      setLocal('categorized_subchannels', list);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteCategorizedSubChannel: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'categorized_subchannels', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categorized_subchannels/${id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedSubChannel[]>('categorized_subchannels', DEFAULT_CATEGORIZED_SUBCHANNELS);
      const filtered = list.filter(c => c.id !== id);
      setLocal('categorized_subchannels', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  },

  getCategorizedCoupons: async (channelId: string): Promise<CategorizedCoupon[]> => {
    const sortParams = (arr: CategorizedCoupon[]) => {
      return [...arr].filter(c => c.channelId === channelId).sort((a, b) => a.orderIndex - b.orderIndex);
    };
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'categorized_coupons'));
        const list = snap.docs.map(doc => doc.data() as CategorizedCoupon);
        const filtered = list.filter(c => c.channelId === channelId);
        if (filtered.length === 0) {
          const defaults = DEFAULT_CATEGORIZED_COUPONS.filter(c => c.channelId === channelId);
          for (const c of defaults) {
            await setDoc(doc(db, 'categorized_coupons', c.id), c);
          }
          return sortParams(DEFAULT_CATEGORIZED_COUPONS);
        }
        return sortParams(list);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'categorized_coupons');
        return sortParams(DEFAULT_CATEGORIZED_COUPONS);
      }
    } else {
      const list = getLocal<CategorizedCoupon[]>('categorized_coupons', DEFAULT_CATEGORIZED_COUPONS);
      return sortParams(list);
    }
  },

  saveCategorizedCoupon: async (coupon: CategorizedCoupon): Promise<void> => {
    const cleaned = cleanFirestoreData(coupon);
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'categorized_coupons', cleaned.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categorized_coupons/${cleaned.id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedCoupon[]>('categorized_coupons', DEFAULT_CATEGORIZED_COUPONS);
      const idx = list.findIndex(c => c.id === coupon.id);
      if (idx !== -1) {
        list[idx] = coupon;
      } else {
        list.push(coupon);
      }
      setLocal('categorized_coupons', list);
      window.dispatchEvent(new Event('storage'));
    }
  },

  deleteCategorizedCoupon: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'categorized_coupons', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categorized_coupons/${id}`);
        throw err;
      }
    } else {
      const list = getLocal<CategorizedCoupon[]>('categorized_coupons', DEFAULT_CATEGORIZED_COUPONS);
      const filtered = list.filter(c => c.id !== id);
      setLocal('categorized_coupons', filtered);
      window.dispatchEvent(new Event('storage'));
    }
  }
};

export const DEFAULT_CATEGORIZED_CATEGORIES: CategorizedCategory[] = [
  // For 'pupil_chat'
  { id: 'pc_cat_debates', channelId: 'pupil_chat', name: 'GENERAL', orderIndex: 0, createdAt: new Date().toISOString() },
  { id: 'pc_cat_comunidad', channelId: 'pupil_chat', name: 'COMUNIDAD', orderIndex: 1, createdAt: new Date().toISOString() },
  { id: 'pc_cat_claustro', channelId: 'pupil_chat', name: 'CLAUSTRO INTERNO', orderIndex: 2, createdAt: new Date().toISOString() },

  // For 'pupil_discounts'
  { id: 'pd_cat_fondeo', channelId: 'pupil_discounts', name: '📊 Empresas de Fondeo', orderIndex: 1, createdAt: new Date().toISOString() },
  { id: 'pd_cat_tools', channelId: 'pupil_discounts', name: '🛠️ Herramientas', orderIndex: 2, createdAt: new Date().toISOString() }
];

export const DEFAULT_CATEGORIZED_SUBCHANNELS: CategorizedSubChannel[] = [
  // For 'pupil_chat'
  { id: 'pc_sub_general', channelId: 'pupil_chat', categoryId: 'pc_cat_debates', name: 'general', orderIndex: 0, createdAt: new Date().toISOString() },
  { id: 'pc_sub_comunidad', channelId: 'pupil_chat', categoryId: 'pc_cat_comunidad', name: 'comunidad-tms', orderIndex: 0, createdAt: new Date().toISOString() },
  { id: 'pc_sub_claustro', channelId: 'pupil_chat', categoryId: 'pc_cat_claustro', name: 'claustro-staff', orderIndex: 0, createdAt: new Date().toISOString() },

  // For 'pupil_discounts'
  { id: 'pd_sub_apex', channelId: 'pupil_discounts', categoryId: 'pd_cat_fondeo', name: 'apex', orderIndex: 0, createdAt: new Date().toISOString() },
  { id: 'pd_sub_e2t', channelId: 'pupil_discounts', categoryId: 'pd_cat_fondeo', name: 'e2t', orderIndex: 1, createdAt: new Date().toISOString() },
  { id: 'pd_sub_fundednext', channelId: 'pupil_discounts', categoryId: 'pd_cat_fondeo', name: 'fundednext', orderIndex: 2, createdAt: new Date().toISOString() },
  { id: 'pd_sub_ftmo', channelId: 'pupil_discounts', categoryId: 'pd_cat_fondeo', name: 'ftmo', orderIndex: 3, createdAt: new Date().toISOString() },
  { id: 'pd_sub_tv', channelId: 'pupil_discounts', categoryId: 'pd_cat_tools', name: 'tradingview', orderIndex: 0, createdAt: new Date().toISOString() },
  { id: 'pd_sub_mt5', channelId: 'pupil_discounts', categoryId: 'pd_cat_tools', name: 'metatrader5', orderIndex: 1, createdAt: new Date().toISOString() },
  { id: 'pd_sub_qt', channelId: 'pupil_discounts', categoryId: 'pd_cat_tools', name: 'quanttower', orderIndex: 2, createdAt: new Date().toISOString() }
];

export const DEFAULT_CATEGORIZED_COUPONS: CategorizedCoupon[] = [
  {
    id: 'coup_apex',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_apex',
    name: 'Apex Trader Funding',
    coupon: 'CUPÓN: TMS',
    description: 'La firma de fondeo de futuros líder. Obtén un descuento exclusivo del 80%-90% en tus cuentas de evaluación usando nuestro código promocional verificado escolar.',
    code: 'TITAN80',
    link: 'https://apextraderfunding.com/?c=titan80',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_e2t',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_e2t',
    name: 'Earn2Trade',
    coupon: 'PROMO ACTIVA',
    description: 'Accede al programa Trader Career Path o Gauntlet Mini de forma preferencial. Evaluaciones profesionales en futuros con reglas claras de consistencia y soporte premium.',
    code: 'TITANE2T45',
    link: 'https://www.earn2trade.com/?a=titan40',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_fundednext',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_fundednext',
    name: 'FundedNext',
    coupon: '10% OFF',
    description: 'Excelente prop firm para operar Forex, CFD, metales e índices mundiales con spreads hiper-bajos. Sin límites de tiempo y opción de recibir pagos desde la misma fase de evaluación.',
    code: 'TITANNEXT10',
    link: 'https://fundednext.com/?ref=titan',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_ftmo',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_ftmo',
    name: 'FTMO Prop Firm',
    coupon: '5% REEMBOLSO',
    description: 'La firma de fondeo más segura, duradera y consolidada a nivel global. Brinda condiciones reales de mercado en Forex y una suite de auditoría técnica que te ayudará a corregir tus peores hábitos de trading.',
    code: 'TITANFTMO5',
    link: 'https://ftmo.com/es/?affiliate=titan5',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_tv',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_tv',
    name: 'TradingView Premium',
    coupon: '30% DESCUENTO',
    description: 'La herramienta definitiva para análisis técnico institucional y fractal. Registra tu cuenta educativa para gozar de descuentos en tus mensualidades.',
    code: 'TITANVIEW30',
    link: 'https://tradingview.com/?aff=titan30',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_mt5',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_mt5',
    name: 'MetaTrader 5',
    coupon: 'DESCARGA GRATUITA',
    description: 'La plataforma multiactivos definitiva para Forex y CFDs, preferida por millones de traders y soportada por la mayoría de brokers regulados.',
    link: 'https://www.metatrader5.com/',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_qt',
    channelId: 'pupil_discounts',
    subChannelId: 'pd_sub_qt',
    name: 'QuantTower',
    coupon: 'LICENCIA DEMO',
    description: 'Plataforma de trading profesional de nivel institucional para analítica de profundidad de mercado o flujo de órdenes (Order Flow/Volume).',
    link: 'https://www.quantower.com/',
    active: true,
    orderIndex: 0,
    createdAt: new Date().toISOString()
  }
];

export const SEED_CUSTOM_CATEGORIES: CustomCategory[] = [
  { id: 'cat_herramientas', name: 'Herramientas', createdAt: new Date().toISOString() },
  { id: 'cat_estrategias', name: 'Estrategias', createdAt: new Date().toISOString() },
  { id: 'cat_psicologia', name: 'Psicología', createdAt: new Date().toISOString() },
  { id: 'cat_ia', name: 'IA', createdAt: new Date().toISOString() },
  { id: 'cat_ninjatrader', name: 'NinjaTrader', createdAt: new Date().toISOString() },
  { id: 'cat_tradingview', name: 'TradingView', createdAt: new Date().toISOString() },
  { id: 'cat_recursos_premium', name: 'Recursos Premium', createdAt: new Date().toISOString() },
  { id: 'cat_comunidad', name: 'Comunidad', createdAt: new Date().toISOString() }
];

export const SEED_CHAT_CHANNELS: ChatChannel[] = [
  // SECCIÓN ALUMNO
  { id: 'pupil_chat', name: 'Chat general', category: 'alumno', type: 'chat', onlyStaffCanWrite: false, orderIndex: 0, pinned: false, createdAt: new Date().toISOString() },
  { id: 'pupil_resources', name: 'Recursos', category: 'alumno', type: 'resources', onlyStaffCanWrite: false, orderIndex: 1, pinned: false, createdAt: new Date().toISOString() },
  { id: 'pupil_tools', name: 'Herramientas', category: 'alumno', type: 'tools', onlyStaffCanWrite: false, orderIndex: 2, pinned: false, createdAt: new Date().toISOString() },
  { id: 'pupil_discounts', name: 'Descuentos y cupones', category: 'alumno', type: 'discounts', onlyStaffCanWrite: false, orderIndex: 3, pinned: false, createdAt: new Date().toISOString() },
  { id: 'pupil_meetings', name: 'Sesiones Zoom/Meet', category: 'alumno', type: 'meetings', onlyStaffCanWrite: false, orderIndex: 4, pinned: false, createdAt: new Date().toISOString() },
  { id: 'pupil_notices', name: 'Avisos', category: 'alumno', type: 'notices', onlyStaffCanWrite: false, orderIndex: 5, pinned: false, createdAt: new Date().toISOString() },

  // COMUNIDAD
  { id: 'community_chat', name: 'Chat comunidad', category: 'comunidad', type: 'chat', onlyStaffCanWrite: false, orderIndex: 0, pinned: false, createdAt: new Date().toISOString() },
  { id: 'community_meetings', name: 'Sesiones comunidad', category: 'comunidad', type: 'meetings', onlyStaffCanWrite: false, orderIndex: 1, pinned: false, createdAt: new Date().toISOString() },
  { id: 'community_hof', name: 'Salón de la fama', category: 'comunidad', type: 'hof', onlyStaffCanWrite: false, orderIndex: 2, pinned: false, createdAt: new Date().toISOString() },
  { id: 'community_featured', name: 'Estrategias destacadas', category: 'comunidad', type: 'featured', onlyStaffCanWrite: false, orderIndex: 3, pinned: false, createdAt: new Date().toISOString() },
  { id: 'community_library', name: 'Históricas ganadoras', category: 'comunidad', type: 'library', onlyStaffCanWrite: false, orderIndex: 4, pinned: false, createdAt: new Date().toISOString() }
];

export const SEED_RESOURCE_TOPICS: ResourceTopic[] = [
  { id: 'r1', title: 'Reglas de Gestión de Riesgo', content: 'Cada operación que metas al mercado debe contar con un stop loss técnico y un riesgo máximo de 1% a 2% de tu balance. Nunca sobreoperes después de un drawdown.', author: 'Mario Scalper', createdAt: new Date().toISOString() },
  { id: 'r2', title: 'Psicología en Drawdowm', content: 'El drawdown es la prueba de fuego de cualquier trader institucional. La paciencia y seguir el plan es lo único que marca la diferencia. Recuerda el decalogo de disciplina del trader exitoso.', author: 'Mario Scalper', createdAt: new Date().toISOString() }
];

export const SEED_TOOL_TOPICS: ToolTopic[] = [
  { id: 'tt1', title: 'Configuración de NinjaTrader 8', content: 'Para operar futuros del Nasdaq (MNQ o NQ) con NinjaTrader 8 y Rithmic:\n1. Descarga NinjaTrader desde su sitio oficial.\n2. Solicita tu cuenta de simulación o conecta tu cuenta de fondeo (Apex o Earn2Trade).\n3. En "Tools" -> "Options" -> "Market Data", establece la velocidad de tick por segundo más alta.\n4. Si operas MNQ, el valor por punto es de 2 USD ($0.5 el tick). Para NQ, es de 20 USD ($5 el tick).', author: 'Mario Scalper', createdAt: new Date().toISOString() }
];

function SEED_STRATEGIES_HISTROLLER_FALLBACK(): StrategyHistorical[] {
  return SEED_STRATEGIES_HISTROLLER_LOV();
}

function SEED_STRATEGIES_HISTROLLER_LOV(): StrategyHistorical[] {
  return SEED_STRATEGIES_HISTORICAL;
}

export const SEED_FUNDING_COMPANIES: FundingCompany[] = [
  {
    id: 'coup_apex',
    name: 'Apex Trader Funding',
    coupon: 'CUPÓN: TMS',
    description: 'La firma de fondeo de futuros líder. Obtén un descuento exclusivo del 80%-90% en tus cuentas de evaluación usando nuestro código promocional verificado escolar.',
    code: 'TITAN80',
    link: 'https://apextraderfunding.com/?c=titan80',
    active: true,
    featured: true,
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_apex'
  },
  {
    id: 'coup_e2t',
    name: 'Earn2Trade',
    coupon: 'PROMO ACTIVA',
    description: 'Accede al programa Trader Career Path o Gauntlet Mini de forma preferencial. Evaluaciones profesionales en futuros con reglas claras de consistencia y soporte premium.',
    code: 'TITANE2T45',
    link: 'https://www.earn2trade.com/?a=titan40',
    active: true,
    featured: true,
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_e2t'
  },
  {
    id: 'coup_fundednext',
    name: 'FundedNext',
    coupon: '10% OFF',
    description: 'Excelente prop firm para operar Forex, CFD, metales e índices mundiales con spreads hiper-bajos. Sin límites de tiempo y opción de recibir pagos desde la misma fase de evaluación.',
    code: 'TITANNEXT10',
    link: 'https://fundednext.com/?ref=titan',
    active: true,
    featured: true,
    orderIndex: 2,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_fundednext'
  },
  {
    id: 'coup_ftmo',
    name: 'FTMO Prop Firm',
    coupon: '5% REEMBOLSO',
    description: 'La firma de fondeo más segura, duradera y consolidada a nivel global. Brinda condiciones reales de mercado en Forex y una suite de auditoría técnica que te ayudará a corregir tus peores hábitos de trading.',
    code: 'TITANFTMO5',
    link: 'https://ftmo.com/es/?affiliate=titan5',
    active: true,
    featured: true,
    orderIndex: 3,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_ftmo'
  },
  {
    id: 'coup_tv',
    name: 'TradingView Premium',
    coupon: '30% DESCUENTO',
    description: 'La herramienta definitiva para análisis técnico institucional y fractal. Registra tu cuenta educativa para gozar de descuentos en tus mensualidades.',
    code: 'TITANVIEW30',
    link: 'https://tradingview.com/?aff=titan30',
    active: true,
    featured: true,
    orderIndex: 4,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_tv'
  },
  {
    id: 'coup_mt5',
    name: 'MetaTrader 5',
    coupon: 'DESCARGA GRATUITA',
    description: 'La plataforma multiactivos definitiva para Forex y CFDs, preferida por millones de traders y soportada por la mayoría de brokers regulados.',
    link: 'https://www.metatrader5.com/',
    active: true,
    featured: true,
    orderIndex: 5,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_mt5'
  },
  {
    id: 'coup_qt',
    name: 'QuantTower',
    coupon: 'LICENCIA DEMO',
    description: 'Plataforma de trading profesional de nivel institucional para analítica de profundidad de mercado o flujo de órdenes (Order Flow/Volume).',
    link: 'https://www.quantower.com/',
    active: true,
    featured: true,
    orderIndex: 6,
    createdAt: new Date().toISOString(),
    subChannelId: 'pd_sub_qt'
  }
];
