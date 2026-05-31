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
  ToolReply
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
    name: 'Calculadora de Lotes Titan',
    description: 'Herramienta interactiva para calcular el tamaño exacto del lote basándose en el balance, porcentaje de riesgo de la cuenta y la distancia del Stop Loss en pips.',
    link: '#lot-calculator',
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    name: 'Bitácora de Trading automatizada (Excel Premium)',
    description: 'Descarga nuestra plantilla de Excel optimizada para llevar un registro profesional de tus operaciones, estadísticas de winrate, profit factor, ratio R:R y análisis emocional.',
    link: 'https://docs.google.com/spreadsheets/d/test-excel-titan/copy',
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
        msgs = msgs.filter(m => m.channelId === channelId || (!m.channelId && m.chatType === channelId));
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
        let filtered = allMsg.filter(m => m.channelId === channelId || (!m.channelId && m.chatType === channelId));
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

  sendChatMessage: async (text: string, user: UserProfile, chatType: 'alumno' | 'comunidad', channelId?: string, imageUrl?: string): Promise<void> => {
    // Check if contains links
    const checkLinks = (t: string): boolean => {
      const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
      const domainPattern = /\b[a-zA-Z0-9-]+\.(com|net|org|es|edu|io|co|us|info|uk|fr|info)\b/i;
      return pattern.test(t) || domainPattern.test(t);
    };

    const hasLinks = checkLinks(text);
    const requiresReview = hasLinks || !!imageUrl;
    
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
      replies: []
    };

    if (user.avatarUrl) {
      newMessage.avatarUrl = user.avatarUrl;
    }
    if (imageUrl) {
      newMessage.imageUrl = imageUrl;
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
      const staffList = usersList.filter(u => ['administrador', 'colaborador', 'moderador'].includes(u.role));
      staffList.forEach(s => {
        DataAPI.addNotificationForUser(
          s.uid,
          `⚠️ Mensaje retenido en #${channelId || chatType}`,
          `Mensaje de ${user.displayName} contiene ${hasLinks ? 'enlace' : 'imagen'} y espera aprobación.`,
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

  // Moderator/Admin controls: hide or delete
  moderateMessage: async (messageId: string, action: 'hide' | 'delete'): Promise<void> => {
    if (isFirebaseConfigured && db) {
      try {
        const msgRef = doc(db, 'chat_messages', messageId);
        if (action === 'hide') {
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
      if (action === 'hide') {
        const idx = allMsg.findIndex(m => m.id === messageId);
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
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, 'chat_channels'));
        const list = snap.docs.map(doc => doc.data() as ChatChannel);
        if (list.length === 0) {
          for (const ch of SEED_CHAT_CHANNELS) {
            await setDoc(doc(db, 'chat_channels', ch.id), ch);
          }
          const sortedSeeds = [...SEED_CHAT_CHANNELS];
          sortedSeeds.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return sortedSeeds;
        }
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'chat_channels');
        const sortedSeeds = [...SEED_CHAT_CHANNELS];
        sortedSeeds.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return sortedSeeds;
      }
    } else {
      const list = getLocal<ChatChannel[]>('chat_channels', SEED_CHAT_CHANNELS);
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return list;
    }
  },

  subscribeChatChannels: (callback: (chans: ChatChannel[]) => void) => {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'chat_channels'));
      return onSnapshot(q, (snap) => {
        let list = snap.docs.map(doc => doc.data() as ChatChannel);
        if (list.length === 0) {
          for (const ch of SEED_CHAT_CHANNELS) {
            setDoc(doc(db, 'chat_channels', ch.id), ch).catch(console.error);
          }
          list = [...SEED_CHAT_CHANNELS];
        }
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_channels');
      });
    } else {
      const publish = () => {
        const list = getLocal<ChatChannel[]>('chat_channels', SEED_CHAT_CHANNELS);
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
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
      const chans = getLocal<ChatChannel[]>('chat_channels', SEED_CHAT_CHANNELS);
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
      const chans = getLocal<ChatChannel[]>('chat_channels', SEED_CHAT_CHANNELS);
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
  }
};

export const SEED_CHAT_CHANNELS: ChatChannel[] = [
  { id: 'general', name: 'general', category: 'Chat·General', onlyStaffCanWrite: false, createdAt: new Date().toISOString() },
  { id: 'anuncios-academia', name: 'anuncios-academia', category: 'Chat·General', onlyStaffCanWrite: true, createdAt: new Date().toISOString() },
  { id: 'mesa-redonda-vip', name: 'mesa-redonda-vip', category: 'Comunidad', onlyStaffCanWrite: false, createdAt: new Date().toISOString() },
  { id: 'ideas-y-analisis', name: 'ideas-y-analisis', category: 'Comunidad', onlyStaffCanWrite: false, createdAt: new Date().toISOString() },
  { id: 'staff-coordinacion', name: 'staff-coordinacion', category: 'Claustro', onlyStaffCanWrite: false, createdAt: new Date().toISOString() }
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
