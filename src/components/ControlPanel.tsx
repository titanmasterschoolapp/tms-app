/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, UserProfile } from '../types';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';

interface ControlPanelProps {
  currentUser: UserProfile;
  onChangeUserRole: (role: UserRole) => void;
  onChangeMensualidad: (active: boolean) => void;
  isFirebase: boolean;
}

export default function ControlPanel({ 
  currentUser, 
  onChangeUserRole, 
  onChangeMensualidad,
  isFirebase 
}: ControlPanelProps) {
  const roles: { val: UserRole; label: string; desc: string }[] = [
    { val: 'alumno', label: 'Alumno', desc: 'Acceso básico a recursos y herramientas libres.' },
    { val: 'miembro', label: 'Miembro', desc: 'Acceso al chat de la comunidad y estrategias avanzadas.' },
    { val: 'moderador', label: 'Mod', desc: 'Permite silenciar y ocultar mensajes en los chats.' },
    { val: 'colaborador', label: 'Colaborador', desc: 'Edita recursos, reuniones, avisos y estrategias.' },
    { val: 'administrador', label: 'Admin', desc: 'Control absoluto sobre usuarios, roles y finanzas.' }
  ];

  return (
    <div id="control-panel-tester" className="mt-8 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 bg-violet-600/10 border-l border-b border-zinc-800 rounded-bl-xl flex items-center gap-1.5 text-xs text-violet-400 font-mono">
        <Sparkles className="w-3.5 h-3.5" />
        ENTORNO DE PRUEBAS DETECTADO
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <Shield className="w-5 h-5 text-pink-400" />
        <div>
          <h4 className="text-sm font-sans font-semibold text-white">Simulador de Privilegios Académicos</h4>
          <p className="text-xs text-zinc-500">Prueba cómo ve y opera la plataforma cada rol del ecosistema educativo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        {roles.map((r) => (
          <button
            id={`role-opt-${r.val}`}
            key={r.val}
            onClick={() => onChangeUserRole(r.val)}
            className={`p-3 rounded-xl border text-left transition-all ${
              currentUser.role === r.val
              ? 'bg-gradient-to-br from-violet-600/15 via-pink-600/10 to-transparent border-pink-500/50 text-white shadow-[0_0_15px_rgba(236,72,153,0.08)]'
              : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-400'
            }`}
          >
            <div className="text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-between">
              {r.label}
              {currentUser.role === r.val && (
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <input
            id="toggle-mensualidad-spec"
            type="checkbox"
            checked={currentUser.mensualidadActive}
            onChange={(e) => onChangeMensualidad(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-offset-zinc-950 focus:ring-violet-500"
          />
          <div>
            <label htmlFor="toggle-mensualidad-spec" className="text-xs font-bold text-white uppercase tracking-wider font-mono cursor-pointer">
              Suscripción Mensual Activa
            </label>
            <p className="text-[10px] text-zinc-500">Permite ver la Sección Comunidad, Reuniones Mensuales y el Salón de la Fama.</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-950 py-1.5 px-3 rounded-lg border border-zinc-800">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {isFirebase 
              ? 'Los cambios se están sincronizando en tiempo real con Firestore.' 
              : 'Modo local: Los cambios se persisten en tu navegador.'}
          </span>
        </div>
      </div>
    </div>
  );
}
